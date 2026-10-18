# backend/services/peer_score.py
#
# The RULES for Peer Review: what makes a score public, how it is blurred, which
# behaviour tags exist, and how the dispute deadline works.
#
# Everything here is plain Python (no Flask, no database) so it can be tested
# on its own — see tests/test_peer_score_logic.py. All times are naive UTC, the
# same as the rest of the project's database columns.
import math
import re
from datetime import timedelta

# ----------------------------------------------------------------------
# THE ONE-FIELD SWITCH
#   'mandatory' -> every student who meets the thresholds has a public score.
#   'opt_in'    -> a score is only public if that student turns it on
#                  (Peer Review > My Score > "Show my score").
# Anything that isn't exactly 'mandatory' is treated as 'opt_in', so a typo
# here errs on the side of hiding scores, never exposing them.
# ----------------------------------------------------------------------
SCORE_DISPLAY_MODE = 'mandatory'

# ----------------------------------------------------------------------
# THE SECOND SWITCH: which rule-set is live.
#
#   'production' -> the full safeguards: a score needs 3 people across 2
#                   groups, ratings only count after 7 days, the score is
#                   rounded to the nearest half point, and only "3+" is shown.
#   'demo'       -> the same machinery with the waiting-room rules relaxed so a
#                   10-minute presentation can show everything LIVE: scores
#                   appear after 2 people (one group is fine), new ratings count
#                   immediately, the average is shown to one decimal place, and
#                   "Average of N ratings" is displayed so it's obvious it's an
#                   average and not just the latest rating.
#
# Change this ONE word and restart the backend. An unrecognised name falls back
# to 'production' (the safe one).
# ----------------------------------------------------------------------
SCORE_PROFILE = 'demo'

PROFILES = {
    'production': {
        'min_raters': 3,          # at least this many DIFFERENT people must have rated them...
        'min_groups': 2,          # ...spread across at least this many different groups
        'delay_days': 7,          # a rating only counts once it has been unchanged this long
        'rounding_step': 0.5,     # the public score is a multiple of this (4.0, 4.5, 5.0...)
        'show_exact_count': False,  # never reveal the exact number of ratings
    },
    'demo': {
        'min_raters': 2,
        'min_groups': 1,
        'delay_days': 0,
        'rounding_step': 0.1,
        'show_exact_count': True,
    },
}

# These are filled in by set_profile() just below (and by the tests)
MIN_RATERS_FOR_PUBLIC_SCORE = MIN_GROUPS_FOR_PUBLIC_SCORE = None
SCORE_DELAY_DAYS = SCORE_ROUNDING_STEP = SHOW_EXACT_COUNT = None
ACTIVE_PROFILE = None


def set_profile(name):
    """Switch rule-set. Raises ValueError for an unknown name."""
    global MIN_RATERS_FOR_PUBLIC_SCORE, MIN_GROUPS_FOR_PUBLIC_SCORE, SCORE_DELAY_DAYS
    global SCORE_ROUNDING_STEP, SHOW_EXACT_COUNT, ACTIVE_PROFILE
    if name not in PROFILES:
        raise ValueError(f'Unknown score profile {name!r}')
    rules = PROFILES[name]
    MIN_RATERS_FOR_PUBLIC_SCORE = rules['min_raters']
    MIN_GROUPS_FOR_PUBLIC_SCORE = rules['min_groups']
    SCORE_DELAY_DAYS = rules['delay_days']
    SCORE_ROUNDING_STEP = rules['rounding_step']
    SHOW_EXACT_COUNT = rules['show_exact_count']
    ACTIVE_PROFILE = name


set_profile(SCORE_PROFILE if SCORE_PROFILE in PROFILES else 'production')

# Admins must deal with a dispute/report within this long of it being filed.
DISPUTE_RESPONSE_HOURS = 48
URGENT_WITHIN_HOURS = 6

MAX_NOTE_LENGTH = 300       # the optional note on a rating (admins only)
MAX_REPORT_DETAILS = 500
MAX_OPEN_REPORTS_PER_USER = 3

# ----------------------------------------------------------------------
# Behaviour presets (replace free-text comments, which is where defamatory
# statements live and which are hard for admins to review).
#   (code, label shown to students, is_positive)
# ----------------------------------------------------------------------
BEHAVIOUR_TAGS = [
    ('met_deadlines', 'Met deadlines', True),
    ('responsive', 'Responsive', True),
    ('communicated_well', 'Communicated well', True),
    ('did_fair_share', 'Did their fair share', True),
    ('quality_work', 'Quality work', True),
    ('reliable_attendance', 'Reliable at meetings', True),
    ('supportive', 'Supportive teammate', True),
    ('missed_deadlines', 'Missed deadlines', False),
    ('slow_to_respond', 'Slow to respond', False),
    ('uneven_workload', 'Uneven workload', False),
    ('often_absent', 'Often absent or late', False),
    ('needed_rework', 'Work needed rework', False),
]
TAG_LABELS = {code: label for code, label, _ in BEHAVIOUR_TAGS}

# Opposites that can't both be true of the same person in the same group
CONFLICTING_TAGS = [
    ('met_deadlines', 'missed_deadlines'),
    ('responsive', 'slow_to_respond'),
    ('did_fair_share', 'uneven_workload'),
    ('reliable_attendance', 'often_absent'),
    ('quality_work', 'needed_rework'),
]

REPORT_KINDS = ('dispute', 'report')   # dispute = "my own score"; report = "a concern about someone else's"
REPORT_REASONS = [
    ('inaccurate', "The ratings don't reflect my work"),
    ('retaliation', 'This looks like retaliation or a personal conflict'),
    ('fake_group', 'A group or rating looks made up'),
    ('abusive', 'Abusive or inappropriate content'),
    ('other', 'Something else (please explain)'),
]
REASON_LABELS = {code: label for code, label in REPORT_REASONS}


# ----------------------------------------------------------------------
# Score
# ----------------------------------------------------------------------
def round_to_step(value, step=None):
    """Round half UP to the nearest step (3.25 -> 3.5, not Python's banker's 3.0)."""
    step = SCORE_ROUNDING_STEP if step is None else step
    return round(math.floor(value / step + 0.5) * step, 4)


def rater_count_label():
    """What we show instead of an exact count, e.g. '3+'."""
    return f'{MIN_RATERS_FOR_PUBLIC_SCORE}+'


def is_old_enough(updated_at, now):
    return updated_at <= now - timedelta(days=SCORE_DELAY_DAYS)


def effective_mode(mode=None):
    """'mandatory' or 'opt_in' — anything unrecognised counts as 'opt_in' (the cautious choice)."""
    mode = SCORE_DISPLAY_MODE if mode is None else mode
    return 'mandatory' if mode == 'mandatory' else 'opt_in'


def iso_z(moment):
    """A naive-UTC datetime as '2026-10-14T09:30:00Z' (None stays None)."""
    return moment.replace(microsecond=0).isoformat() + 'Z' if moment else None


def is_score_visible(opted_in, mode=None):
    """May other students see this person's score at all?"""
    return True if effective_mode(mode) == 'mandatory' else bool(opted_in)


def compute_public_score(ratings, now):
    """
    `ratings` are the ratings a person has received (any object with rater_id,
    group_id, overall_rating and updated_at). Returns only what is safe to show:
    a rounded score and a '3+' label — never an exact count.

    Only ratings that are SCORE_DELAY_DAYS old count, and the thresholds are
    judged on those same ratings, so a brand-new rating cannot change anything
    anyone sees.
    """
    counted = [r for r in ratings if is_old_enough(r.updated_at, now)]

    raters = {r.rater_id for r in counted}
    groups = {r.group_id for r in counted}
    if len(raters) < MIN_RATERS_FOR_PUBLIC_SCORE or len(groups) < MIN_GROUPS_FOR_PUBLIC_SCORE:
        return {'meetsThreshold': False, 'overallScore': None, 'raterCountLabel': None}

    average = sum(r.overall_rating for r in counted) / len(counted)
    result = {
        'meetsThreshold': True,
        'overallScore': round_to_step(average),
        'raterCountLabel': rater_count_label(),
    }
    if SHOW_EXACT_COUNT:                  # demo only — production never reveals the exact count
        result['ratingCount'] = len(counted)
    return result


def policy_summary():
    """Safe-to-publish description of the rules, so the UI can explain them."""
    return {
        'delayDays': SCORE_DELAY_DAYS,
        'minRaters': MIN_RATERS_FOR_PUBLIC_SCORE,
        'minGroups': MIN_GROUPS_FOR_PUBLIC_SCORE,
        'roundingStep': SCORE_ROUNDING_STEP,
        'responseHours': DISPUTE_RESPONSE_HOURS,
    }


# ----------------------------------------------------------------------
# Validation of what students submit
# ----------------------------------------------------------------------
def clean_behaviour_tags(tags):
    """Known codes only, no duplicates, no contradictions. Raises ValueError."""
    if tags is None:
        return []
    if not isinstance(tags, (list, tuple)):
        raise ValueError('Behaviour tags must be a list')
    chosen = []
    for tag in tags:
        if not isinstance(tag, str) or tag not in TAG_LABELS:    # (a list/dict here would otherwise crash the lookup)
            raise ValueError('That behaviour option is not recognised')
        if tag not in chosen:
            chosen.append(tag)
    for a, b in CONFLICTING_TAGS:
        if a in chosen and b in chosen:
            raise ValueError(f"Pick either '{TAG_LABELS[a]}' or '{TAG_LABELS[b]}', not both")
    return [code for code, _, _ in BEHAVIOUR_TAGS if code in chosen]   # stable order


def clean_note(text):
    """The short optional note (admins only). Returns None if blank. Raises ValueError."""
    if text is None:
        return None
    if not isinstance(text, str):
        raise ValueError('The note must be text')
    text = text.strip()
    if not text:
        return None
    if len(text) > MAX_NOTE_LENGTH:
        raise ValueError(f'Notes can be up to {MAX_NOTE_LENGTH} characters')
    return text


def clean_report(kind, reason, details):
    """Returns (kind, reason, details_or_None). Raises ValueError with a friendly message."""
    if kind not in REPORT_KINDS:
        raise ValueError('Unknown report type')
    if reason not in REASON_LABELS:
        raise ValueError('Please choose a reason')
    if details is not None and not isinstance(details, str):
        raise ValueError('The details must be text')
    details = (details or '').strip()
    if len(details) > MAX_REPORT_DETAILS:
        raise ValueError(f'Details can be up to {MAX_REPORT_DETAILS} characters')
    if reason == 'other' and len(details) < 10:
        raise ValueError("Please add a few words explaining what's wrong")
    return kind, reason, details or None


_NOTE_PATTERN = re.compile(r'\S')


def clean_resolution_note(text):
    """Admins must record why they decided what they did."""
    text = (text or '').strip() if isinstance(text, str) or text is None else None
    if text is None or not _NOTE_PATTERN.search(text) or len(text) < 3:
        raise ValueError('Please record a short reason for your decision')
    if len(text) > MAX_REPORT_DETAILS:
        raise ValueError(f'The reason can be up to {MAX_REPORT_DETAILS} characters')
    return text


# ----------------------------------------------------------------------
# The 48-hour deadline
# ----------------------------------------------------------------------
def due_at_for(created_at):
    return created_at + timedelta(hours=DISPUTE_RESPONSE_HOURS)


def hours_remaining(due_at, now):
    """Positive = time left, negative = overdue."""
    return (due_at - now).total_seconds() / 3600


def deadline_state(due_at, now):
    left = hours_remaining(due_at, now)
    if left <= 0:
        return 'overdue'
    if left < URGENT_WITHIN_HOURS:
        return 'urgent'
    return 'ok'
