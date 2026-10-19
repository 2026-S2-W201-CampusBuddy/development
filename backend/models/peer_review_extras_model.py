# backend/models/peer_review_extras_model.py
# NEW tables for the safer Peer Review: behaviour tags, "show my score" opt-in,
# and reports/disputes with their 48-hour deadline. These are separate tables so
# the existing peer_review_* tables are not changed at all (db.create_all() just
# adds these the next time the backend starts).
from datetime import datetime

from extensions import db
from services import peer_score


class PeerReviewRatingTag(db.Model):
    """One behaviour preset ticked on one rating (e.g. 'met_deadlines')."""
    __tablename__ = 'peer_review_rating_tags'

    id = db.Column(db.Integer, primary_key=True)
    rating_id = db.Column(db.Integer, nullable=False, index=True)
    tag = db.Column(db.String(40), nullable=False)

    @staticmethod
    def replace_for_rating(rating_id, tags):
        PeerReviewRatingTag.query.filter_by(rating_id=rating_id).delete()
        for tag in tags:
            db.session.add(PeerReviewRatingTag(rating_id=rating_id, tag=tag))
        db.session.commit()

    @staticmethod
    def tags_by_rating(rating_ids):
        """{rating_id: ['met_deadlines', ...]} in the standard display order."""
        found = {}
        if not rating_ids:
            return found
        rows = PeerReviewRatingTag.query.filter(PeerReviewRatingTag.rating_id.in_(list(rating_ids))).all()
        for row in rows:
            found.setdefault(row.rating_id, []).append(row.tag)
        order = [code for code, _, _ in peer_score.BEHAVIOUR_TAGS]
        return {rid: sorted(tags, key=lambda t: order.index(t) if t in order else len(order)) for rid, tags in found.items()}

    @staticmethod
    def delete_for_ratings(rating_ids):
        if rating_ids:
            PeerReviewRatingTag.query.filter(PeerReviewRatingTag.rating_id.in_(list(rating_ids))).delete(synchronize_session=False)


class PeerReviewScorePref(db.Model):
    """Only used when SCORE_DISPLAY_MODE is 'opt_in': has this person chosen to show their score?"""
    __tablename__ = 'peer_review_score_prefs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, unique=True)
    show_score = db.Column(db.Boolean, nullable=False, default=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def is_opted_in(user_id):
        pref = PeerReviewScorePref.query.filter_by(user_id=user_id).first()
        return bool(pref and pref.show_score)

    @staticmethod
    def set_opt_in(user_id, show):
        pref = PeerReviewScorePref.query.filter_by(user_id=user_id).first()
        if not pref:
            pref = PeerReviewScorePref(user_id=user_id)
            db.session.add(pref)
        pref.show_score = bool(show)
        pref.updated_at = datetime.utcnow()
        db.session.commit()
        return pref


class PeerReviewReport(db.Model):
    """
    A complaint. kind='dispute' is "I dispute MY OWN score"; kind='report' is
    "I'm concerned about someone else's". Each one carries a deadline (48 hours
    after it was filed) that the admin queue counts down to.
    """
    __tablename__ = 'peer_review_reports'

    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(10), nullable=False)               # 'dispute' | 'report'
    reporter_id = db.Column(db.Integer, nullable=False, index=True)
    subject_user_id = db.Column(db.Integer, nullable=False, index=True)
    reason = db.Column(db.String(30), nullable=False)
    details = db.Column(db.String(500), nullable=True)

    status = db.Column(db.String(12), nullable=False, default='open', index=True)   # open | upheld | dismissed
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    due_at = db.Column(db.DateTime, nullable=False)

    resolved_at = db.Column(db.DateTime, nullable=True)
    resolved_by_id = db.Column(db.Integer, nullable=True)
    resolution_note = db.Column(db.String(500), nullable=True)
    ratings_removed = db.Column(db.Integer, nullable=False, default=0)

    @staticmethod
    def create(kind, reporter_id, subject_user_id, reason, details):
        created = datetime.utcnow()
        report = PeerReviewReport(
            kind=kind, reporter_id=reporter_id, subject_user_id=subject_user_id,
            reason=reason, details=details, status='open',
            created_at=created, due_at=peer_score.due_at_for(created),
        )
        db.session.add(report)
        db.session.commit()
        return report

    @staticmethod
    def open_exists(reporter_id, subject_user_id, kind):
        return PeerReviewReport.query.filter_by(
            reporter_id=reporter_id, subject_user_id=subject_user_id, kind=kind, status='open'
        ).first() is not None

    @staticmethod
    def count_open_by_reporter(reporter_id):
        return PeerReviewReport.query.filter_by(reporter_id=reporter_id, status='open').count()

    @staticmethod
    def has_open_dispute(subject_user_id):
        return PeerReviewReport.query.filter_by(
            subject_user_id=subject_user_id, kind='dispute', status='open'
        ).first() is not None
