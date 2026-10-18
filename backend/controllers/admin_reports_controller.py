# backend/controllers/admin_reports_controller.py
# The admin side of disputes/reports: the 48-hour queue, the evidence for each
# one, and resolving it. Admin-only, like the rest of admin_controller.py.
from datetime import datetime

from extensions import db
from models.peer_review_model import PeerReviewGroup, PeerReviewGroupMembership, PeerReviewRating
from models.peer_review_extras_model import PeerReviewRatingTag, PeerReviewReport
from models.user_model import User
from services import peer_score
from controllers.admin_controller import _require_admin, _username_for

RESOLVED_HISTORY_LIMIT = 30


def _report_view(report, now):
    is_open = report.status == 'open'
    left = peer_score.hours_remaining(report.due_at, now) if is_open else None
    return {
        "reportId": report.id,
        "kind": report.kind,
        "reporter": _username_for(report.reporter_id),
        "subject": _username_for(report.subject_user_id),
        "reason": report.reason,
        "reasonLabel": peer_score.REASON_LABELS.get(report.reason, report.reason),
        "details": report.details,
        "status": report.status,
        "createdAt": peer_score.iso_z(report.created_at),
        "dueAt": peer_score.iso_z(report.due_at),
        "hoursRemaining": round(left, 2) if is_open else None,      # negative = overdue
        "deadlineState": peer_score.deadline_state(report.due_at, now) if is_open else None,
        "resolvedAt": peer_score.iso_z(report.resolved_at),
        "resolvedBy": _username_for(report.resolved_by_id) if report.resolved_by_id else None,
        "resolutionNote": report.resolution_note,
        "ratingsRemoved": report.ratings_removed,
    }


def get_reports_logic(requesting_username, include_resolved=True):
    admin, error = _require_admin(requesting_username)
    if error:
        return error

    now = datetime.utcnow()
    open_reports = PeerReviewReport.query.filter_by(status='open').order_by(PeerReviewReport.due_at.asc()).all()
    views = [_report_view(r, now) for r in open_reports]       # most urgent first

    counts = {
        "open": len(views),
        "overdue": sum(1 for v in views if v["deadlineState"] == 'overdue'),
        "urgent": sum(1 for v in views if v["deadlineState"] == 'urgent'),
    }

    if include_resolved:
        done = (PeerReviewReport.query.filter(PeerReviewReport.status != 'open')
                .order_by(PeerReviewReport.resolved_at.desc()).limit(RESOLVED_HISTORY_LIMIT).all())
        views += [_report_view(r, now) for r in done]

    return {
        "status": "success", "message": "Reports retrieved",
        "data": {"reports": views, "counts": counts, "responseHours": peer_score.DISPUTE_RESPONSE_HOURS},
    }, 200


def get_report_detail_logic(requesting_username, report_id):
    """The report plus every rating the person has received (so the admin can judge it)."""
    admin, error = _require_admin(requesting_username)
    if error:
        return error

    report = PeerReviewReport.query.get(report_id)
    if not report:
        return {"status": "error", "message": "Report not found"}, 404

    now = datetime.utcnow()
    ratings = PeerReviewRating.query.filter_by(rated_id=report.subject_user_id).order_by(PeerReviewRating.updated_at.desc()).all()
    groups = {g.id: g for g in PeerReviewGroup.query.filter(PeerReviewGroup.id.in_(list({r.group_id for r in ratings}))).all()} if ratings else {}
    confirmed_groups = {m.group_id for m in PeerReviewGroupMembership.get_confirmed_memberships_for_user(report.subject_user_id)}
    tags = PeerReviewRatingTag.tags_by_rating([r.id for r in ratings])

    return {
        "status": "success", "message": "Report retrieved",
        "data": {
            "report": _report_view(report, now),
            "ratings": [{
                "ratingId": r.id,
                "groupName": groups[r.group_id].name if r.group_id in groups else "Unknown group",
                "rater": _username_for(r.rater_id),
                "documentationRating": r.documentation_rating,
                "productRating": r.product_rating,
                "attendanceRating": r.attendance_rating,
                "overallRating": r.overall_rating,
                "behaviourTags": [peer_score.TAG_LABELS.get(c, c) for c in tags.get(r.id, [])],
                "note": r.overall_comment,
                "createdAt": peer_score.iso_z(r.created_at),
                "updatedAt": peer_score.iso_z(r.updated_at),
                # does this rating feed the public score right now?
                "countsTowardScore": r.group_id in confirmed_groups and peer_score.is_old_enough(r.updated_at, now),
            } for r in ratings],
        },
    }, 200


def resolve_report_logic(requesting_username, report_id, outcome, note, remove_rating_ids):
    admin, error = _require_admin(requesting_username)
    if error:
        return error

    report = PeerReviewReport.query.get(report_id)
    if not report:
        return {"status": "error", "message": "Report not found"}, 404
    if report.status != 'open':
        return {"status": "error", "message": "This report has already been resolved"}, 400
    if outcome not in ('upheld', 'dismissed'):
        return {"status": "error", "message": "Outcome must be 'upheld' or 'dismissed'"}, 400

    try:
        note = peer_score.clean_resolution_note(note)
    except ValueError as exc:
        return {"status": "error", "message": str(exc)}, 400

    ids = remove_rating_ids or []
    if not isinstance(ids, list) or any(isinstance(i, bool) or not isinstance(i, int) for i in ids):
        return {"status": "error", "message": "removeRatingIds must be a list of rating ids"}, 400
    ids = sorted(set(ids))
    if ids and outcome == 'dismissed':
        return {"status": "error", "message": "A dismissed report can't remove ratings — choose 'upheld' instead"}, 400

    removed = 0
    if ids:
        ratings = PeerReviewRating.query.filter(
            PeerReviewRating.id.in_(ids), PeerReviewRating.rated_id == report.subject_user_id
        ).all()
        if len(ratings) != len(ids):
            return {"status": "error", "message": "One of those ratings doesn't belong to this person"}, 400
        PeerReviewRatingTag.delete_for_ratings(ids)
        for rating in ratings:
            db.session.delete(rating)
        removed = len(ratings)

    report.status = outcome
    report.resolved_at = datetime.utcnow()
    report.resolved_by_id = admin.id
    report.resolution_note = note
    report.ratings_removed = removed
    db.session.commit()

    return {
        "status": "success", "message": "Report resolved",
        "data": {"report": _report_view(report, datetime.utcnow())},
    }, 200
