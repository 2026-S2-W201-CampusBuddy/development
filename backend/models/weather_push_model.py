# backend/models/weather_push_model.py
# One row per browser/device that has asked for the daily weather push.
from datetime import datetime
from extensions import db


class WeatherPushSubscription(db.Model):
    __tablename__ = 'weather_push_subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # The three values the browser gives us when the user subscribes.
    # "endpoint" is a private URL at Google/Mozilla/Apple that delivers a
    # message to this one browser, so it is unique per device.
    endpoint = db.Column(db.String(1024), unique=True, nullable=False)
    p256dh = db.Column(db.String(255), nullable=False)
    auth = db.Column(db.String(255), nullable=False)

    # When the person wants the alert, in THEIR local time ("07:30"),
    # plus their timezone so the server knows what "07:30" means for them.
    notify_time = db.Column(db.String(5), nullable=False, default='07:30')
    timezone = db.Column(db.String(64), nullable=False, default='Pacific/Auckland')

    # The local date ("2026-10-14") of the last alert we sent. This is what
    # stops us sending twice in one day.
    last_sent_date = db.Column(db.String(10), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def subscription_info(self):
        """The shape the pywebpush library expects."""
        return {
            'endpoint': self.endpoint,
            'keys': {'p256dh': self.p256dh, 'auth': self.auth},
        }

    def to_dict(self):
        return {
            'subscribed': True,
            'notify_time': self.notify_time,
            'timezone': self.timezone,
        }
