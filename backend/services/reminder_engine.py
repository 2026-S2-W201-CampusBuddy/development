# backend/services/reminder_engine.py
#
# The "brain" of calendar events + alerts. It decides WHEN notifications fire,
# WHAT they say, and sends the ones that are due.
#
# This file imports nothing from Flask or the database on purpose, so it can
# be unit-tested on its own. It talks to the database through a small "store"
# object (see SqlStore in calendar_service.py for the real one).
#
# How it works (the "outbox" idea):
#   1. When someone saves an event/alert, plan_reminders() works out the exact
#      moment each reminder should fire ("15 min before", "at the time"...)
#      and we save those as pending rows.
#   2. Every minute run_due() looks for pending rows whose time has arrived,
#      pushes them to the person's devices, and marks them sent. The sent rows
#      double as the in-app Alerts inbox.
#   3. For repeating events, once one occurrence's reminders are all done, the
#      next occurrence is planned.
import calendar as _calendar
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

REPEAT_CHOICES = ('none', 'daily', 'weekly', 'monthly')
MAX_OFFSET_MINUTES = 30 * 24 * 60      # at most 30 days ahead
MAX_OFFSETS = 6                         # reminders per event
STALE_AFTER = timedelta(hours=3)        # a reminder this late is marked "missed", not sent
DEFAULT_TIMEZONE = 'Pacific/Auckland'


# ----------------------------------------------------------------------
# Data shapes
# ----------------------------------------------------------------------
@dataclass
class EventData:
    id: int
    user_id: int
    kind: str                    # 'event' | 'alert'
    title: str
    location: str
    start_local: datetime        # naive wall-clock time in `timezone` (first occurrence)
    timezone: str
    repeat: str = 'none'
    offsets: list = field(default_factory=list)   # minutes before; 0 = at the time


@dataclass
class Reminder:
    user_id: int
    event_id: int
    kind: str
    title: str
    body: str
    occurrence_local: datetime   # naive wall-clock time of the occurrence this belongs to
    offset_minutes: int
    fire_at: datetime            # timezone-aware UTC
    id: int = None
    status: str = 'pending'


# ----------------------------------------------------------------------
# Time helpers
# ----------------------------------------------------------------------
def get_zone(name):
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, OSError, TypeError):
        return ZoneInfo(DEFAULT_TIMEZONE)


def to_utc(local_naive, tz_name):
    """Wall-clock time in a timezone -> aware UTC datetime."""
    return local_naive.replace(tzinfo=get_zone(tz_name)).astimezone(dt_timezone.utc)


def to_local_naive(aware_utc, tz_name):
    return aware_utc.astimezone(get_zone(tz_name)).replace(tzinfo=None)


def _add_months(start, months):
    year_offset, month_index = divmod(start.month - 1 + months, 12)
    year, month = start.year + year_offset, month_index + 1
    day = min(start.day, _calendar.monthrange(year, month)[1])   # Jan 31 -> Feb 28
    return start.replace(year=year, month=month, day=day)


def first_occurrence_on_or_after(start_local, repeat, moment):
    """
    The first occurrence of an event at or after `moment` (naive local time),
    or None if a one-off event is already behind us.
    Monthly events stay on their original day-of-month (31st -> last day of short months).
    """
    if moment <= start_local:
        return start_local
    if repeat not in ('daily', 'weekly', 'monthly'):
        return None

    if repeat in ('daily', 'weekly'):
        step = timedelta(days=1 if repeat == 'daily' else 7)
        steps = -((start_local - moment) // step)          # ceil((moment - start) / step)
        return start_local + step * steps

    months = (moment.year - start_local.year) * 12 + (moment.month - start_local.month)
    k = max(0, months - 1)
    while True:
        candidate = _add_months(start_local, k)
        if candidate >= moment:
            return candidate
        k += 1


def next_occurrence_after(start_local, repeat, occurrence):
    return first_occurrence_on_or_after(start_local, repeat, occurrence + timedelta(seconds=1))


def occurrences_between(start_local, repeat, window_start, window_end, limit=1000):
    """Every occurrence of an event inside [window_start, window_end] (naive local)."""
    found = []
    occurrence = first_occurrence_on_or_after(start_local, repeat, window_start)
    while occurrence is not None and occurrence <= window_end and len(found) < limit:
        found.append(occurrence)
        if repeat == 'none':
            break
        occurrence = next_occurrence_after(start_local, repeat, occurrence)
    return found


# ----------------------------------------------------------------------
# Wording
# ----------------------------------------------------------------------
def format_clock(moment):
    hour = moment.hour % 12 or 12
    return f"{hour}:{moment.minute:02d} {'AM' if moment.hour < 12 else 'PM'}"


def _plural(count, word):
    return f"{count} {word}{'' if count == 1 else 's'}"


def humanize_minutes(minutes):
    if minutes % 1440 == 0:
        return _plural(minutes // 1440, 'day')
    if minutes % 60 == 0:
        return _plural(minutes // 60, 'hour')
    if minutes > 60:
        hours, rest = divmod(minutes, 60)
        return f"{_plural(hours, 'hour')} {_plural(rest, 'minute')}"
    return _plural(minutes, 'minute')


def offset_label(minutes):
    return 'At time of event' if minutes == 0 else f"{humanize_minutes(minutes)} before"


def build_reminder_text(kind, title, location, occurrence_local, offset_minutes):
    """Returns (notification title, notification body)."""
    clock = format_clock(occurrence_local)
    icon = '🔔' if kind == 'alert' else '📅'

    if offset_minutes == 0:
        body = f"It's time — {clock}" if kind == 'alert' else f"Starting now ({clock})"
    else:
        lead = f"in {humanize_minutes(offset_minutes)}"
        body = f"Coming up {lead} ({clock})" if kind == 'alert' else f"Starts {lead} ({clock})"

    if location:
        body += f" · 📍 {location}"
    return f"{icon} {title}", body


# ----------------------------------------------------------------------
# Planning
# ----------------------------------------------------------------------
def clean_offsets(values):
    """Sorted unique list of valid offsets (minutes). Raises ValueError if invalid."""
    if values is None:
        return []
    if not isinstance(values, (list, tuple)):
        raise ValueError('Reminders must be a list')
    cleaned = set()
    for value in values:
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError('Reminder times must be whole numbers of minutes')
        if value < 0 or value > MAX_OFFSET_MINUTES:
            raise ValueError('A reminder can be at most 30 days before the event')
        cleaned.add(value)
    if len(cleaned) > MAX_OFFSETS:
        raise ValueError(f'Please choose at most {MAX_OFFSETS} reminders')
    return sorted(cleaned)


def plan_reminders(event, now_utc, after_occurrence=None, max_iterations=400):
    """
    Work out the next set of reminders for an event.

    Finds the first occurrence (the very first one, or the one after
    `after_occurrence`) that still has at least one reminder in the future,
    and returns a Reminder for each of its reminder times that hasn't passed.
    """
    offsets = sorted(set(event.offsets), reverse=True)
    if not offsets:
        return []

    if after_occurrence is None:
        # A reminder fires BEFORE its occurrence, so an occurrence that is already
        # behind us can never have a future reminder — start from "now".
        occurrence = first_occurrence_on_or_after(
            event.start_local, event.repeat, to_local_naive(now_utc, event.timezone)
        )
    else:
        occurrence = next_occurrence_after(event.start_local, event.repeat, after_occurrence)

    for _ in range(max_iterations):
        if occurrence is None:
            return []
        occurrence_utc = to_utc(occurrence, event.timezone)

        planned = []
        for offset in offsets:
            fire_at = occurrence_utc - timedelta(minutes=offset)
            if fire_at > now_utc:
                title, body = build_reminder_text(event.kind, event.title, event.location, occurrence, offset)
                planned.append(Reminder(
                    user_id=event.user_id, event_id=event.id, kind=event.kind,
                    title=title, body=body, occurrence_local=occurrence,
                    offset_minutes=offset, fire_at=fire_at,
                ))
        if planned:
            return planned
        if event.repeat == 'none':
            return []
        occurrence = next_occurrence_after(event.start_local, event.repeat, occurrence)
    return []


def reschedule_event(store, event, now_utc):
    """Called when an event is created or edited: replace its pending reminders."""
    store.delete_pending(event.id)
    planned = plan_reminders(event, now_utc)
    store.add_reminders(planned)
    return planned


def advance_if_finished(store, event_id, now_utc):
    """After a reminder is handled: if a repeating event has nothing pending, plan its next occurrence."""
    event = store.get_event(event_id)
    if event is None or event.repeat == 'none' or not event.offsets:
        return
    if store.pending_count(event_id) > 0:
        return
    store.add_reminders(plan_reminders(event, now_utc, after_occurrence=store.last_occurrence(event_id)))


# ----------------------------------------------------------------------
# Sending
# ----------------------------------------------------------------------
def build_push_payload(reminder):
    return {
        'title': reminder.title,
        'body': reminder.body,
        'tag': f'campusbuddy-reminder-{reminder.id}',   # each reminder gets its own notification
        'url': './',
        'target': 'alerts',                              # tapping it opens the Alerts bubble
    }


def run_due(store, now_utc, sender):
    """
    One scheduler tick. `sender(subscription_info, payload)` returns 'ok' | 'gone' | 'error'.
    Returns how many notifications were pushed to at least one device.
    """
    pushed_count = 0

    for reminder in store.pending_due(now_utc):
        if not store.user_exists(reminder.user_id):
            store.discard_user_data(reminder.user_id)          # account was deleted
            continue

        # Far too late (server was down for hours)? Don't send a stale alert,
        # but keep it in the inbox as "missed" so the person still sees it.
        if now_utc - reminder.fire_at > STALE_AFTER:
            store.finish(reminder, 'missed', now_utc, 0)
            advance_if_finished(store, reminder.event_id, now_utc)
            continue

        payload = build_push_payload(reminder)
        devices = store.devices(reminder.user_id)
        delivered = failed = 0
        for device in devices:
            result = sender(device.subscription_info(), payload)
            if result == 'ok':
                delivered += 1
            elif result == 'gone':
                store.delete_device(device.endpoint)             # device unsubscribed / cleared data
            else:
                failed += 1

        if devices and delivered == 0 and failed > 0:
            continue                                              # temporary problem: retry next minute

        # Delivered, or the person has no devices (it still lands in the in-app inbox)
        store.finish(reminder, 'sent', now_utc, delivered)
        pushed_count += 1 if delivered else 0
        advance_if_finished(store, reminder.event_id, now_utc)

    return pushed_count
