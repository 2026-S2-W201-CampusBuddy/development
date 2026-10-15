# backend/controllers/calendar_controller.py
# Logic for the Calendar bubble (events) and the Alerts bubble (reminders + inbox).
from datetime import date as date_type, datetime, time as time_type, timedelta, timezone as dt_timezone
from sqlalchemy import and_, or_

from extensions import db
from models.user_model import User
from models.calendar_model import CalendarEvent, EventNotification, ReminderDevice
from services.calendar_service import SqlStore, event_data_from_model
from services.reminder_engine import (
    DEFAULT_TIMEZONE, EventData, REPEAT_CHOICES, clean_offsets, occurrences_between,
    offset_label, plan_reminders, reschedule_event, to_local_naive,
)
from services.weather_push_service import is_valid_time, resolve_timezone, send_push

VALID_KINDS = ('event', 'alert')
VALID_COLORS = ('sky', 'rose', 'violet', 'amber', 'emerald', 'slate')
MAX_EVENTS_PER_USER = 500
MAX_RANGE_DAYS = 400


# ----------------------------------------------------------------------
# Small helpers
# ----------------------------------------------------------------------
def _error(message, status):
    return {"status": "error", "message": message}, status


def _now():
    return datetime.now(dt_timezone.utc)


def _naive_now():
    return _now().replace(tzinfo=None)


def _iso_utc(naive):
    return naive.replace(tzinfo=dt_timezone.utc).isoformat().replace('+00:00', 'Z') if naive else None


def _parse_date(value):
    try:
        parsed = datetime.strptime(value, '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None
    return parsed if 2000 <= parsed.year <= 2100 else None


def _combine(day, hhmm):
    hour, minute = (int(part) for part in hhmm.split(':'))
    return datetime.combine(day, time_type(hour, minute))


def _logged_in(user_id):
    return bool(user_id) and db.session.get(User, user_id) is not None


def event_to_dict(model, occurrence=None):
    """JSON for one event; `occurrence` is the specific repeat being shown."""
    start = occurrence or model.start_local
    end = start + (model.end_local - model.start_local) if model.end_local else None
    return {
        'id': model.id,
        'kind': model.kind,
        'title': model.title,
        'notes': model.notes or '',
        'location': model.location or '',
        'color': model.color,
        'repeat': model.repeat,
        'timezone': model.timezone,
        'remind_offsets': model.offsets,
        'date': start.strftime('%Y-%m-%d'),
        'time': start.strftime('%H:%M'),
        'end_time': end.strftime('%H:%M') if end else None,
        'series_date': model.start_local.strftime('%Y-%m-%d'),   # the first occurrence (what editing changes)
        'series_time': model.start_local.strftime('%H:%M'),
    }


def _parse_event_fields(data):
    """Validate the form. Returns (fields, None) or (None, (error_dict, status))."""
    data = data or {}
    title = (data.get('title') or '').strip()
    if not title:
        return None, _error('Please give it a title', 400)
    if len(title) > 120:
        return None, _error('The title is too long (120 characters max)', 400)

    notes = (data.get('notes') or '').strip()
    if len(notes) > 500:
        return None, _error('Notes are too long (500 characters max)', 400)

    location = (data.get('location') or '').strip()
    if len(location) > 120:
        return None, _error('The location is too long (120 characters max)', 400)

    kind = data.get('kind') or 'event'
    if kind not in VALID_KINDS:
        return None, _error('Unknown type', 400)

    color = data.get('color') or ('rose' if kind == 'alert' else 'sky')
    if color not in VALID_COLORS:
        return None, _error('Unknown colour', 400)

    repeat = data.get('repeat') or 'none'
    if repeat not in REPEAT_CHOICES:
        return None, _error('Repeat must be none, daily, weekly or monthly', 400)

    timezone_name = data.get('timezone') or DEFAULT_TIMEZONE
    if resolve_timezone(timezone_name) is None:
        return None, _error('Unknown timezone', 400)

    day = _parse_date(data.get('start_date'))
    if day is None:
        return None, _error('Please pick a valid date', 400)
    if not is_valid_time(data.get('start_time')):
        return None, _error('Please pick a valid time', 400)
    start_local = _combine(day, data['start_time'])

    end_local = None
    if kind == 'event' and data.get('end_time'):
        if not is_valid_time(data['end_time']):
            return None, _error('The end time is not valid', 400)
        end_local = _combine(day, data['end_time'])
        if end_local <= start_local:
            return None, _error('The end time must be after the start time', 400)

    try:
        offsets = clean_offsets(data.get('remind_offsets'))
    except ValueError as exc:
        return None, _error(str(exc), 400)
    if kind == 'alert' and not offsets:
        offsets = [0]                       # an alert with no reminder would do nothing

    return {
        'title': title, 'notes': notes, 'location': location, 'kind': kind, 'color': color,
        'repeat': repeat, 'timezone': timezone_name, 'start_local': start_local,
        'end_local': end_local, 'offsets': offsets,
    }, None


def _apply_fields(model, fields):
    model.title = fields['title']
    model.notes = fields['notes']
    model.location = fields['location']
    model.kind = fields['kind']
    model.color = fields['color']
    model.repeat = fields['repeat']
    model.timezone = fields['timezone']
    model.start_local = fields['start_local']
    model.end_local = fields['end_local']
    model.offsets = fields['offsets']


def _probe(user_id, fields):
    """A throw-away EventData, used to ask 'would this ever notify anyone?'"""
    return EventData(
        id=0, user_id=user_id, kind=fields['kind'], title=fields['title'], location=fields['location'],
        start_local=fields['start_local'], timezone=fields['timezone'], repeat=fields['repeat'],
        offsets=fields['offsets'],
    )


def _save_and_schedule(model, fields, creating):
    now = _now()
    _apply_fields(model, fields)
    if creating:
        db.session.add(model)
    db.session.commit()
    planned = reschedule_event(SqlStore(), event_data_from_model(model), now)

    warning = None
    if model.offsets and not planned:
        warning = "Saved — but every reminder time for this has already passed, so no alert will be sent."
    return warning


# ----------------------------------------------------------------------
# Events (Calendar bubble)
# ----------------------------------------------------------------------
def _events_in_window(user_id, window_start, window_end):
    models = CalendarEvent.query.filter(
        CalendarEvent.user_id == user_id,
        or_(
            and_(CalendarEvent.repeat == 'none',
                 CalendarEvent.start_local >= window_start, CalendarEvent.start_local <= window_end),
            and_(CalendarEvent.repeat != 'none', CalendarEvent.start_local <= window_end),
        ),
    ).all()

    items = []
    for model in models:
        for occurrence in occurrences_between(model.start_local, model.repeat, window_start, window_end):
            items.append(event_to_dict(model, occurrence))
    items.sort(key=lambda item: (item['date'], item['time'], item['title'].lower()))
    return items


def list_events_logic(user_id, from_str, to_str):
    start_day, end_day = _parse_date(from_str), _parse_date(to_str)
    if not _logged_in(user_id):
        return _error('Please log in to see your calendar', 401)
    if not start_day or not end_day or end_day < start_day or (end_day - start_day).days > MAX_RANGE_DAYS:
        return _error('Please ask for a valid date range', 400)

    window_start = datetime.combine(start_day, time_type.min)
    window_end = datetime.combine(end_day, time_type(23, 59, 59))
    return {"status": "success", "data": _events_in_window(user_id, window_start, window_end)}, 200


def create_event_logic(user_id, data):
    if not _logged_in(user_id):
        return _error('Please log in to add to your calendar', 401)
    if CalendarEvent.query.filter_by(user_id=user_id).count() >= MAX_EVENTS_PER_USER:
        return _error(f'You can have up to {MAX_EVENTS_PER_USER} calendar items — please delete some old ones', 400)

    fields, problem = _parse_event_fields(data)
    if problem:
        return problem
    if fields['kind'] == 'alert' and not plan_reminders(_probe(user_id, fields), _now()):
        return _error('That time has already passed — please pick a time in the future', 400)

    model = CalendarEvent(user_id=user_id)
    warning = _save_and_schedule(model, fields, creating=True)
    return {"status": "success", "message": "Saved", "data": event_to_dict(model), "warning": warning}, 201


def update_event_logic(user_id, event_id, data):
    model = CalendarEvent.query.filter_by(id=event_id, user_id=user_id).first() if user_id else None
    if not model:
        return _error('That item could not be found', 404)

    fields, problem = _parse_event_fields(data)
    if problem:
        return problem
    if fields['kind'] == 'alert' and not plan_reminders(_probe(user_id, fields), _now()):
        return _error('That time has already passed — please pick a time in the future', 400)

    warning = _save_and_schedule(model, fields, creating=False)
    return {"status": "success", "message": "Saved", "data": event_to_dict(model), "warning": warning}, 200


def delete_event_logic(user_id, event_id):
    model = CalendarEvent.query.filter_by(id=event_id, user_id=user_id).first() if user_id else None
    if not model:
        return _error('That item could not be found', 404)

    SqlStore().delete_pending(model.id)          # its future alerts go with it; past ones stay in the inbox
    db.session.delete(model)
    db.session.commit()
    return {"status": "success", "message": "Deleted"}, 200


# ----------------------------------------------------------------------
# Alerts (Alerts bubble)
# ----------------------------------------------------------------------
def summary_logic(user_id, date_str):
    """Tiny payload polled by the main page: unread badge + how many items are on today."""
    if not _logged_in(user_id):
        return {"status": "success", "data": {"unread_count": 0, "today_count": 0}}, 200

    unread = EventNotification.query.filter(
        EventNotification.user_id == user_id,
        EventNotification.status != 'pending',
        EventNotification.read_at.is_(None),
    ).count()

    day = _parse_date(date_str) or to_local_naive(_now(), DEFAULT_TIMEZONE).date()
    today = _events_in_window(user_id, datetime.combine(day, time_type.min), datetime.combine(day, time_type(23, 59, 59)))
    return {"status": "success", "data": {"unread_count": unread, "today_count": len(today)}}, 200


def upcoming_logic(user_id, limit=30):
    if not _logged_in(user_id):
        return _error('Please log in to see your alerts', 401)

    rows = (EventNotification.query.filter_by(user_id=user_id, status='pending')
            .order_by(EventNotification.fire_at).limit(max(1, min(limit, 100))).all())
    event_ids = {row.event_id for row in rows if row.event_id}
    events = {e.id: e for e in CalendarEvent.query.filter(CalendarEvent.id.in_(list(event_ids))).all()} if event_ids else {}

    items = []
    for row in rows:
        event = events.get(row.event_id)
        items.append({
            'id': row.id,
            'event_id': row.event_id,
            'kind': row.kind,
            'title': event.title if event else row.title,
            'fire_at': _iso_utc(row.fire_at),
            'occurrence': row.occurrence_local.strftime('%Y-%m-%dT%H:%M'),
            'offset_minutes': row.offset_minutes,
            'offset_label': offset_label(row.offset_minutes),
            'event': event_to_dict(event, row.occurrence_local) if event else None,
        })
    return {"status": "success", "data": items}, 200


def inbox_logic(user_id, limit=50):
    if not _logged_in(user_id):
        return _error('Please log in to see your alerts', 401)

    rows = (EventNotification.query
            .filter(EventNotification.user_id == user_id, EventNotification.status != 'pending')
            .order_by(EventNotification.fire_at.desc()).limit(max(1, min(limit, 200))).all())
    unread = EventNotification.query.filter(
        EventNotification.user_id == user_id, EventNotification.status != 'pending',
        EventNotification.read_at.is_(None),
    ).count()

    items = [{
        'id': row.id, 'event_id': row.event_id, 'kind': row.kind, 'title': row.title, 'body': row.body,
        'status': row.status, 'fire_at': _iso_utc(row.fire_at), 'sent_at': _iso_utc(row.sent_at),
        'read': row.read_at is not None, 'pushed': row.pushed,
    } for row in rows]
    return {"status": "success", "data": {"items": items, "unread_count": unread}}, 200


def mark_read_logic(user_id, ids, mark_all):
    if not _logged_in(user_id):
        return _error('Please log in', 401)

    query = EventNotification.query.filter(
        EventNotification.user_id == user_id,
        EventNotification.status != 'pending',
        EventNotification.read_at.is_(None),
    )
    if not mark_all:
        wanted = [i for i in (ids or []) if isinstance(i, int)]
        if not wanted:
            return {"status": "success", "data": {"marked": 0}}, 200
        query = query.filter(EventNotification.id.in_(wanted))

    marked = query.update({'read_at': _naive_now()}, synchronize_session=False)
    db.session.commit()
    return {"status": "success", "data": {"marked": marked}}, 200


# ----------------------------------------------------------------------
# Devices (who receives the push)
# ----------------------------------------------------------------------
def _find_device(user_id, endpoint):
    if not user_id or not endpoint:
        return None
    return ReminderDevice.query.filter_by(endpoint=endpoint, user_id=user_id).first()


def device_status_logic(user_id, endpoint):
    return {"status": "success", "data": {"registered": _find_device(user_id, endpoint) is not None}}, 200


def device_subscribe_logic(user_id, subscription):
    if not _logged_in(user_id):
        return _error('Please log in to turn on alerts', 401)

    subscription = subscription or {}
    keys = subscription.get('keys') or {}
    endpoint = subscription.get('endpoint')
    if not endpoint or not keys.get('p256dh') or not keys.get('auth'):
        return _error('Invalid push subscription', 400)

    # One browser = one row; if someone else used this browser before, it moves to the current user
    device = ReminderDevice.query.filter_by(endpoint=endpoint).first()
    if not device:
        device = ReminderDevice(endpoint=endpoint, p256dh=keys['p256dh'], auth=keys['auth'], user_id=user_id)
        db.session.add(device)
    device.user_id = user_id
    device.p256dh = keys['p256dh']
    device.auth = keys['auth']
    db.session.commit()
    return {"status": "success", "message": "Alerts are on for this device", "data": {"registered": True}}, 200


def device_unsubscribe_logic(user_id, endpoint):
    device = _find_device(user_id, endpoint)
    if device:
        db.session.delete(device)
        db.session.commit()
    return {"status": "success", "message": "Alerts turned off for this device"}, 200


def device_test_logic(user_id, endpoint):
    device = _find_device(user_id, endpoint)
    if not device:
        return _error('Alerts are not turned on for this device', 404)

    result = send_push(device.subscription_info(), {
        'title': '🔔 Test alert',
        'body': 'Alerts are working on this device.',
        'tag': 'campusbuddy-reminder-test',
        'url': './',
        'target': 'alerts',
    })
    if result == 'gone':
        db.session.delete(device)
        db.session.commit()
        return _error("This device's subscription expired — please turn alerts on again", 410)
    if result != 'ok':
        return _error("The push service didn't accept the message — check the server log", 502)
    return {"status": "success", "message": "Test alert sent"}, 200
