# This file is like a "Chef" — but this one only serves admins. It
# deliberately bypasses every privacy rule in peer_review_controller.py,
# because this view exists specifically for investigating abuse (fake
# ratings, fabricated groups) — something nobody else in the app can do.
from datetime import datetime, timedelta
from models.peer_review_model import PeerReviewGroup, PeerReviewGroupMembership, PeerReviewRating
from models.user_model import User

SUSPICIOUSLY_FAST_SECONDS = 60
SUSPICIOUSLY_MANY_GROUPS_IN_24H = 5


def _require_admin(username):
    user = User.find_by_username(username)
    if not user:
        return None, ({"status": "error", "message": "User not found"}, 404)
    if user.role != 'admin':
        return None, ({"status": "error", "message": "Admin access required"}, 403)
    return user, None


def _username_for(user_id):
    user = User.query.get(user_id)
    return user.username if user else f"[deleted user {user_id}]"


def get_all_ratings_logic(requesting_username):
    admin, error = _require_admin(requesting_username)
    if error:
        return error

    ratings = PeerReviewRating.query.order_by(PeerReviewRating.created_at.desc()).all()
    groups_by_id = {g.id: g for g in PeerReviewGroup.query.all()}

    results = []
    for r in ratings:
        group = groups_by_id.get(r.group_id)
        is_fast = False
        if group:
            is_fast = (r.created_at - group.created_at) < timedelta(seconds=SUSPICIOUSLY_FAST_SECONDS)

        results.append({
            "ratingId": r.id,
            "groupId": r.group_id,
            "groupName": group.name if group else "Unknown group",
            "rater": _username_for(r.rater_id),
            "rated": _username_for(r.rated_id),
            "documentationRating": r.documentation_rating,
            "documentationComment": r.documentation_comment,
            "productRating": r.product_rating,
            "productComment": r.product_comment,
            "attendanceRating": r.attendance_rating,
            "attendanceComment": r.attendance_comment,
            "overallRating": r.overall_rating,
            "overallComment": r.overall_comment,
            "createdAt": r.created_at.isoformat(),
            "flaggedSubmittedQuickly": is_fast,
        })

    return {"status": "success", "message": "All ratings retrieved", "data": {"ratings": results}}, 200


def get_all_groups_logic(requesting_username):
    admin, error = _require_admin(requesting_username)
    if error:
        return error

    groups = PeerReviewGroup.query.order_by(PeerReviewGroup.created_at.desc()).all()
    results = []

    # Flag creators who've made an unusual number of groups in the last 24h
    cutoff = datetime.utcnow() - timedelta(hours=24)
    recent_groups_by_creator = {}
    for g in groups:
        if g.created_at >= cutoff:
            recent_groups_by_creator[g.creator_id] = recent_groups_by_creator.get(g.creator_id, 0) + 1

    for g in groups:
        members = PeerReviewGroupMembership.get_members_of_group(g.id)
        member_info = [
            {
                "username": _username_for(m.user_id),
                "status": m.status,
                "invitedAt": m.invited_at.isoformat() if m.invited_at else None,
                "confirmedAt": m.confirmed_at.isoformat() if m.confirmed_at else None,
            }
            for m in members
        ]
        results.append({
            "groupId": g.id,
            "groupName": g.name,
            "creator": _username_for(g.creator_id),
            "createdAt": g.created_at.isoformat(),
            "members": member_info,
            "flaggedProlificCreator": recent_groups_by_creator.get(g.creator_id, 0) > SUSPICIOUSLY_MANY_GROUPS_IN_24H,
        })

    return {"status": "success", "message": "All groups retrieved", "data": {"groups": results}}, 200
