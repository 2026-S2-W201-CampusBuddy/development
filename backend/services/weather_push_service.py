# backend/services/weather_push_service.py
#
# Everything about SENDING the scheduled weather alert lives here:
#   - small pure helpers (is it time yet? what does the message say?)
#   - send_push(): talks to the browser vendors' push servers
#   - run_due_notifications(): one "tick" — sends whatever is due right now
#   - start_scheduler(): a background thread that runs a tick every minute
#
# The top half of this file deliberately imports nothing from Flask or the
# database so it can be unit-tested on its own (see tests/test_weather_push_logic.py).
import json
import os
import re
import threading
import time
from datetime import datetime, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_TIME = '07:30'
DEFAULT_TIMEZONE = 'Pacific/Auckland'

# If the server was briefly down or busy at the exact minute, still send the
# alert if we're within this long after the chosen time — but never later,
# a "morning" forecast arriving at night is just noise.
CATCH_UP_WINDOW = timedelta(hours=3)

_TIME_PATTERN = re.compile(r'^([01]\d|2[0-3]):([0-5]\d)$')


# ----------------------------------------------------------------------
# Pure helpers (no Flask, no database)
# ----------------------------------------------------------------------
def is_valid_time(value):
    """True for 24-hour "HH:MM" strings such as "07:30" or "18:05"."""
    return isinstance(value, str) and bool(_TIME_PATTERN.match(value))


def resolve_timezone(name):
    """Return a ZoneInfo for an IANA name like "Pacific/Auckland", or None."""
    if not isinstance(name, str) or not name:
        return None
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, OSError):
        return None


def _scheduled_moment(notify_time, now_local):
    hour, minute = (int(part) for part in notify_time.split(':'))
    return now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)


def local_date_string(timezone_name, now_utc):
    zone = resolve_timezone(timezone_name) or ZoneInfo(DEFAULT_TIMEZONE)
    return now_utc.astimezone(zone).date().isoformat()


def time_already_passed_today(notify_time, timezone_name, now_utc):
    """Has the chosen time already gone by, for this person, today?"""
    zone = resolve_timezone(timezone_name) or ZoneInfo(DEFAULT_TIMEZONE)
    now_local = now_utc.astimezone(zone)
    return _scheduled_moment(notify_time, now_local) <= now_local


def is_due(notify_time, timezone_name, last_sent_date, now_utc):
    """
    Should we send this person's alert right now?
    Yes if: their chosen time has arrived (within the catch-up window)
    AND we haven't already sent one for their local "today".
    """
    zone = resolve_timezone(timezone_name) or ZoneInfo(DEFAULT_TIMEZONE)
    now_local = now_utc.astimezone(zone)

    if last_sent_date == now_local.date().isoformat():
        return False

    scheduled = _scheduled_moment(notify_time, now_local)
    return scheduled <= now_local < scheduled + CATCH_UP_WINDOW


def _greeting(hour):
    # Same wording rules as the in-page notification in useWeather.js
    if hour < 11:
        return 'Good morning'
    if hour < 17:
        return 'Hey'
    return 'Good evening'


def build_payload(weather, local_hour):
    """The text shown in the notification (mirrors the existing in-page one)."""
    return {
        'title': f"{_greeting(local_hour)} — Your Auckland Forecast",
        'body': (
            f"{weather['icon']} {weather['condition']}, "
            f"{round(weather['today_min'])}°–{round(weather['today_max'])}°C. "
            f"{weather['clothing_tip']}."
        ),
        'tag': 'campusbuddy-weather',   # replaces yesterday's alert instead of stacking
        'url': './',
    }


# ----------------------------------------------------------------------
# Sending
# ----------------------------------------------------------------------
def get_vapid_config():
    """
    VAPID keys identify OUR server to the browser vendors' push services.
    Generate them once with:  python generate_vapid_keys.py
    """
    public_key = os.getenv('VAPID_PUBLIC_KEY')
    private_key = os.getenv('VAPID_PRIVATE_KEY')
    if not public_key or not private_key:
        return None
    contact = os.getenv('VAPID_CLAIM_EMAIL') or os.getenv('GMAIL_ADDRESS') or 'admin@campusbuddy.local'
    return {'public': public_key, 'private': private_key, 'subject': f'mailto:{contact}'}


def send_push(subscription_info, payload):
    """
    Deliver one notification. Returns:
      'ok'    - accepted by the push service
      'gone'  - the subscription no longer exists (user revoked / cleared data)
      'error' - something else went wrong; safe to try again next minute
    """
    config = get_vapid_config()
    if not config:
        print('[weather push] VAPID keys missing — run generate_vapid_keys.py')
        return 'error'

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        print('[weather push] pywebpush is not installed — run: pip install -r requirements.txt')
        return 'error'

    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=config['private'],
            vapid_claims={'sub': config['subject']},   # fresh dict: the library edits it
            ttl=int(CATCH_UP_WINDOW.total_seconds()),
        )
        return 'ok'
    except WebPushException as exc:
        status = getattr(getattr(exc, 'response', None), 'status_code', None)
        if status in (404, 410):
            return 'gone'
        print(f'[weather push] send failed ({status}): {exc}')
        return 'error'
    except Exception as exc:  # network trouble etc. — never crash the scheduler
        print(f'[weather push] unexpected error: {exc}')
        return 'error'


def _load_current_weather():
    from controllers.weather_controller import get_auckland_weather_logic
    return get_auckland_weather_logic()['data']


# ----------------------------------------------------------------------
# One scheduler "tick"
# ----------------------------------------------------------------------
def run_due_notifications(now_utc=None, sender=send_push, weather_loader=_load_current_weather):
    """
    Look at every subscription and send the ones whose time has come.
    Must be called inside a Flask app context. Returns how many were sent.
    `sender` and `weather_loader` can be swapped out in tests.
    """
    from extensions import db
    from models.user_model import User
    from models.weather_push_model import WeatherPushSubscription

    now_utc = now_utc or datetime.now(dt_timezone.utc)
    weather = None
    sent = 0

    for sub in WeatherPushSubscription.query.all():
        if not is_due(sub.notify_time, sub.timezone, sub.last_sent_date, now_utc):
            continue

        # Account was deleted — stop notifying that browser.
        if db.session.get(User, sub.user_id) is None:
            db.session.delete(sub)
            continue

        if weather is None:           # fetched at most once per tick
            try:
                weather = weather_loader()
            except Exception as exc:
                print(f'[weather push] could not load weather, will retry: {exc}')
                break

        zone = resolve_timezone(sub.timezone) or ZoneInfo(DEFAULT_TIMEZONE)
        payload = build_payload(weather, now_utc.astimezone(zone).hour)

        result = sender(sub.subscription_info(), payload)
        if result == 'ok':
            sub.last_sent_date = local_date_string(sub.timezone, now_utc)
            sent += 1
        elif result == 'gone':
            db.session.delete(sub)

    db.session.commit()
    return sent


# ----------------------------------------------------------------------
# Background thread
# ----------------------------------------------------------------------
_scheduler_started = False


def start_scheduler(app, interval_seconds=60):
    """Run a tick at the start of every minute, forever, in a daemon thread."""
    global _scheduler_started
    if _scheduler_started:
        return
    _scheduler_started = True

    def loop():
        while True:
            try:
                with app.app_context():
                    run_due_notifications()
            except Exception as exc:
                print(f'[weather push] scheduler tick failed: {exc}')
            time.sleep(interval_seconds - (time.time() % interval_seconds))

    threading.Thread(target=loop, name='weather-push-scheduler', daemon=True).start()
    print('[weather push] scheduler started')
