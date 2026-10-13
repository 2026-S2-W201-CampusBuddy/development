# backend/services/calendar_service.py
# Connects the pure reminder engine to the real database, and runs it every minute.
import threading
import time
from datetime import datetime, timedelta, timezone as dt_timezone

from services.reminder_engine import EventData, Reminder, run_due

HISTORY_DAYS = 90        # sent/missed alerts older than this are tidied away


def _naive_utc(aware):
    return aware.astimezone(dt_timezone.utc).replace(tzinfo=None)


def _aware_utc(naive):
    return naive.replace(tzinfo=dt_timezone.utc)


def event_data_from_model(model):
    return EventData(
        id=model.id, user_id=model.user_id, kind=model.kind, title=model.title,
        location=model.location or '', start_local=model.start_local, timezone=model.timezone,
        repeat=model.repeat, offsets=model.offsets,
    )


class SqlStore:
    """The database-backed version of the 'store' the engine talks to."""

    def pending_due(self, now_utc):
        from models.calendar_model import EventNotification
        rows = (EventNotification.query
                .filter(EventNotification.status == 'pending', EventNotification.fire_at <= _naive_utc(now_utc))
                .order_by(EventNotification.fire_at).all())
        return [Reminder(
            id=r.id, user_id=r.user_id, event_id=r.event_id, kind=r.kind, title=r.title, body=r.body,
            occurrence_local=r.occurrence_local, offset_minutes=r.offset_minutes,
            fire_at=_aware_utc(r.fire_at), status=r.status,
        ) for r in rows]

    def devices(self, user_id):
        from models.calendar_model import ReminderDevice
        return ReminderDevice.query.filter_by(user_id=user_id).all()

    def delete_device(self, endpoint):
        from extensions import db
        from models.calendar_model import ReminderDevice
        ReminderDevice.query.filter_by(endpoint=endpoint).delete()
        db.session.commit()

    def finish(self, reminder, status, now_utc, pushed):
        from extensions import db
        from models.calendar_model import EventNotification
        row = db.session.get(EventNotification, reminder.id)
        if row:
            row.status = status
            row.sent_at = _naive_utc(now_utc)
            row.pushed = pushed
            db.session.commit()

    def user_exists(self, user_id):
        from extensions import db
        from models.user_model import User
        return db.session.get(User, user_id) is not None

    def discard_user_data(self, user_id):
        from extensions import db
        from models.calendar_model import CalendarEvent, EventNotification, ReminderDevice
        EventNotification.query.filter_by(user_id=user_id).delete()
        CalendarEvent.query.filter_by(user_id=user_id).delete()
        ReminderDevice.query.filter_by(user_id=user_id).delete()
        db.session.commit()

    def get_event(self, event_id):
        from extensions import db
        from models.calendar_model import CalendarEvent
        model = db.session.get(CalendarEvent, event_id) if event_id else None
        return event_data_from_model(model) if model else None

    def pending_count(self, event_id):
        from models.calendar_model import EventNotification
        return EventNotification.query.filter_by(event_id=event_id, status='pending').count()

    def last_occurrence(self, event_id):
        from extensions import db
        from models.calendar_model import EventNotification
        from sqlalchemy import func
        return db.session.query(func.max(EventNotification.occurrence_local)).filter_by(event_id=event_id).scalar()

    def add_reminders(self, reminders):
        from extensions import db
        from models.calendar_model import EventNotification
        for r in reminders:
            db.session.add(EventNotification(
                user_id=r.user_id, event_id=r.event_id, kind=r.kind, title=r.title[:160], body=r.body[:300],
                occurrence_local=r.occurrence_local, offset_minutes=r.offset_minutes,
                fire_at=_naive_utc(r.fire_at), status='pending',
            ))
        db.session.commit()

    def delete_pending(self, event_id):
        from extensions import db
        from models.calendar_model import EventNotification
        EventNotification.query.filter_by(event_id=event_id, status='pending').delete()
        db.session.commit()

    def prune_history(self, now_utc):
        from extensions import db
        from models.calendar_model import EventNotification
        cutoff = _naive_utc(now_utc) - timedelta(days=HISTORY_DAYS)
        EventNotification.query.filter(
            EventNotification.status != 'pending', EventNotification.fire_at < cutoff
        ).delete()
        db.session.commit()


def run_due_reminders(now_utc=None, sender=None):
    """One tick. Must run inside a Flask app context."""
    from services.weather_push_service import send_push
    now_utc = now_utc or datetime.now(dt_timezone.utc)
    store = SqlStore()
    pushed = run_due(store, now_utc, sender or send_push)
    if now_utc.minute == 0:                 # once an hour is plenty for housekeeping
        store.prune_history(now_utc)
    return pushed


_scheduler_started = False


def start_reminder_scheduler(app, interval_seconds=60):
    """Check for due event/alert notifications at the start of every minute, in a background thread."""
    global _scheduler_started
    if _scheduler_started:
        return
    _scheduler_started = True

    def loop():
        while True:
            try:
                with app.app_context():
                    run_due_reminders()
            except Exception as exc:
                print(f'[reminders] scheduler tick failed: {exc}')
            time.sleep(interval_seconds - (time.time() % interval_seconds))

    threading.Thread(target=loop, name='reminder-scheduler', daemon=True).start()
    print('[reminders] scheduler started')
