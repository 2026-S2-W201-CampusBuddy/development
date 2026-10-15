# backend/models/calendar_model.py
# Tables for the Calendar + Alerts bubbles.
from datetime import datetime
from extensions import db


class CalendarEvent(db.Model):
    """
    One calendar item. An "alert" (created on the Alerts bubble) and an "event"
    (created on the Calendar bubble) are the same thing with a different `kind`,
    which is why whatever you add in one bubble shows up in the other.
    """
    __tablename__ = 'calendar_events'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    kind = db.Column(db.String(10), nullable=False, default='event')      # 'event' | 'alert'
    title = db.Column(db.String(120), nullable=False)
    notes = db.Column(db.String(500), nullable=True)
    location = db.Column(db.String(120), nullable=True)

    # Wall-clock time in `timezone` (what the person typed, e.g. 14:30 Auckland time).
    # Stored this way, not as UTC, so repeating events stay at 14:30 across daylight saving.
    start_local = db.Column(db.DateTime, nullable=False)
    end_local = db.Column(db.DateTime, nullable=True)
    timezone = db.Column(db.String(64), nullable=False, default='Pacific/Auckland')

    repeat = db.Column(db.String(10), nullable=False, default='none')     # none | daily | weekly | monthly
    remind_offsets = db.Column(db.String(120), nullable=False, default='')  # "0,15,60" = minutes before
    color = db.Column(db.String(12), nullable=False, default='sky')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def offsets(self):
        return [int(part) for part in (self.remind_offsets or '').split(',') if part.strip() != '']

    @offsets.setter
    def offsets(self, values):
        self.remind_offsets = ','.join(str(v) for v in sorted(set(values)))


class EventNotification(db.Model):
    """
    One reminder: pending until its time arrives, then 'sent' (or 'missed').
    Pending rows are the schedule; sent/missed rows are the Alerts inbox.
    Title/body are saved as a snapshot so history survives the event being edited or deleted.
    """
    __tablename__ = 'event_notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    event_id = db.Column(db.Integer, nullable=True, index=True)
    kind = db.Column(db.String(10), nullable=False, default='event')
    title = db.Column(db.String(160), nullable=False)
    body = db.Column(db.String(300), nullable=False, default='')

    occurrence_local = db.Column(db.DateTime, nullable=False)   # which occurrence this belongs to
    offset_minutes = db.Column(db.Integer, nullable=False, default=0)
    fire_at = db.Column(db.DateTime, nullable=False, index=True)   # naive UTC

    status = db.Column(db.String(10), nullable=False, default='pending', index=True)  # pending | sent | missed
    sent_at = db.Column(db.DateTime, nullable=True)
    pushed = db.Column(db.Integer, nullable=False, default=0)    # how many devices got the push
    read_at = db.Column(db.DateTime, nullable=True)


class ReminderDevice(db.Model):
    """A browser/phone that wants event + alert notifications (kept separate from weather alerts)."""
    __tablename__ = 'reminder_devices'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    endpoint = db.Column(db.String(1024), unique=True, nullable=False)
    p256dh = db.Column(db.String(255), nullable=False)
    auth = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def subscription_info(self):
        return {'endpoint': self.endpoint, 'keys': {'p256dh': self.p256dh, 'auth': self.auth}}
