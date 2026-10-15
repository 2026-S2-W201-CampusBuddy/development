# backend/controllers/weather_push_controller.py
from datetime import datetime, timezone as dt_timezone
from extensions import db
from models.user_model import User
from models.weather_push_model import WeatherPushSubscription
from services.weather_push_service import (
    DEFAULT_TIME,
    DEFAULT_TIMEZONE,
    build_payload,
    get_vapid_config,
    is_valid_time,
    local_date_string,
    resolve_timezone,
    send_push,
    time_already_passed_today,
    _load_current_weather,
)


def _error(message, status):
    return {"status": "error", "message": message}, status


def _apply_schedule(sub, notify_time, timezone_name):
    """
    Save the chosen time. If today's time has already passed we mark today as
    "done", so choosing 07:30 at 9am means the first alert is TOMORROW 7:30,
    not an instant surprise notification.
    """
    now_utc = datetime.now(dt_timezone.utc)
    sub.notify_time = notify_time
    sub.timezone = timezone_name
    if time_already_passed_today(notify_time, timezone_name, now_utc):
        sub.last_sent_date = local_date_string(timezone_name, now_utc)
    else:
        sub.last_sent_date = None


def _check_time_and_zone(notify_time, timezone_name):
    notify_time = notify_time or DEFAULT_TIME
    timezone_name = timezone_name or DEFAULT_TIMEZONE
    if not is_valid_time(notify_time):
        return None, None, _error("Time must look like 07:30 (24-hour)", 400)
    if resolve_timezone(timezone_name) is None:
        return None, None, _error("Unknown timezone", 400)
    return notify_time, timezone_name, None


def get_public_key_logic():
    config = get_vapid_config()
    if not config:
        return _error("Scheduled alerts aren't set up on the server yet", 503)
    return {"status": "success", "data": {"public_key": config['public']}}, 200


def get_status_logic(user_id, endpoint):
    if not user_id or not endpoint:
        return {"status": "success", "data": {"subscribed": False}}, 200
    sub = WeatherPushSubscription.query.filter_by(endpoint=endpoint, user_id=user_id).first()
    if not sub:
        return {"status": "success", "data": {"subscribed": False}}, 200
    return {"status": "success", "data": sub.to_dict()}, 200


def subscribe_logic(user_id, subscription, notify_time, timezone_name):
    if not user_id or not db.session.get(User, user_id):
        return _error("Please log in to schedule weather alerts", 401)

    subscription = subscription or {}
    keys = subscription.get('keys') or {}
    endpoint = subscription.get('endpoint')
    if not endpoint or not keys.get('p256dh') or not keys.get('auth'):
        return _error("Invalid push subscription", 400)

    notify_time, timezone_name, problem = _check_time_and_zone(notify_time, timezone_name)
    if problem:
        return problem

    # One browser = one row. If someone else logged in on this same browser
    # before, the subscription simply moves over to the current user.
    sub = WeatherPushSubscription.query.filter_by(endpoint=endpoint).first()
    if not sub:
        sub = WeatherPushSubscription(endpoint=endpoint, p256dh=keys['p256dh'], auth=keys['auth'], user_id=user_id)
        db.session.add(sub)
    sub.user_id = user_id
    sub.p256dh = keys['p256dh']
    sub.auth = keys['auth']
    _apply_schedule(sub, notify_time, timezone_name)

    db.session.commit()
    return {"status": "success", "message": "Daily weather alert scheduled", "data": sub.to_dict()}, 200


def update_time_logic(user_id, endpoint, notify_time, timezone_name):
    sub = WeatherPushSubscription.query.filter_by(endpoint=endpoint, user_id=user_id).first() if endpoint and user_id else None
    if not sub:
        return _error("No scheduled alert found for this device", 404)

    notify_time, timezone_name, problem = _check_time_and_zone(notify_time, timezone_name or sub.timezone)
    if problem:
        return problem

    _apply_schedule(sub, notify_time, timezone_name)
    db.session.commit()
    return {"status": "success", "message": "Alert time updated", "data": sub.to_dict()}, 200


def unsubscribe_logic(user_id, endpoint):
    sub = WeatherPushSubscription.query.filter_by(endpoint=endpoint, user_id=user_id).first() if endpoint and user_id else None
    if sub:
        db.session.delete(sub)
        db.session.commit()
    # Idempotent: turning it off twice is not an error
    return {"status": "success", "message": "Scheduled alert turned off"}, 200


def send_test_logic(user_id, endpoint):
    sub = WeatherPushSubscription.query.filter_by(endpoint=endpoint, user_id=user_id).first() if endpoint and user_id else None
    if not sub:
        return _error("No scheduled alert found for this device", 404)

    try:
        weather = _load_current_weather()
    except Exception as exc:
        return _error(f"Could not load weather: {exc}", 502)

    zone = resolve_timezone(sub.timezone)
    hour = datetime.now(dt_timezone.utc).astimezone(zone).hour if zone else 8
    result = send_push(sub.subscription_info(), build_payload(weather, hour))

    if result == 'gone':
        db.session.delete(sub)
        db.session.commit()
        return _error("This device's subscription expired — please turn alerts on again", 410)
    if result != 'ok':
        return _error("The push service didn't accept the message — check the server log", 502)
    return {"status": "success", "message": "Test notification sent"}, 200
