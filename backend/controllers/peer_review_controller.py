# This file is like a "Chef" — it enforces who can create groups, invite
# people, submit ratings, and see what.
from models.peer_review_model import PeerReviewGroup, PeerReviewGroupMembership, PeerReviewRating
from models.user_model import User
from models.peer_review_extras_model import PeerReviewRatingTag, PeerReviewScorePref, PeerReviewReport
from services import peer_score

RATING_CATEGORIES = ['documentation_rating', 'product_rating', 'attendance_rating', 'overall_rating']
MIN_RATING = 1
MAX_RATING = 5


def _get_verified_user_or_error(username):
    user = User.find_by_username(username)
    if not user:
        return None, ({"status": "error", "message": "User not found"}, 404)
    if not user.is_verified:
        return None, ({
            "status": "error",
            "message": "Only verified CampusBuddy accounts can use Peer Review"
        }, 403)
    # Peer Review involves ratings about real people, so everyone using it
    # must have accepted the CURRENT terms (older accounts accepted earlier
    # terms that didn't cover this feature). Being rated can't count towards
    # a public score until the rated person confirms a group, which also
    # goes through this check — so nobody ends up with a public score
    # without having agreed to these terms.
    if not user.has_accepted_current_terms():
        return None, ({
            "status": "error",
            "code": "TERMS_REACCEPT_REQUIRED",
            "message": "Please accept the updated Terms and Conditions to use Peer Review"
        }, 403)
    return user, None


def create_group_logic(creator_username, group_name):
    creator, error = _get_verified_user_or_error(creator_username)
    if error:
        return error

    if not group_name or not group_name.strip():
        return {"status": "error", "message": "Group name is required"}, 400

    group = PeerReviewGroup.create(group_name, creator.id)
    return {
        "status": "success",
        "message": "Group created",
        "data": {"groupId": group.id, "groupName": group.name}
    }, 201


def invite_to_group_logic(inviter_username, group_id, invitee_username):
    inviter, error = _get_verified_user_or_error(inviter_username)
    if error:
        return error

    group = PeerReviewGroup.get_by_id(group_id)
    if not group:
        return {"status": "error", "message": "Group not found"}, 404

    if not PeerReviewGroupMembership.is_confirmed_member(group_id, inviter.id):
        return {"status": "error", "message": "You must be a confirmed member of this group to invite others"}, 403

    if invitee_username == inviter_username:
        return {"status": "error", "message": "You're already in this group"}, 400

    invitee = User.find_by_username(invitee_username)
    if not invitee:
        return {"status": "error", "message": f"No account found for '{invitee_username}'"}, 404

    membership, was_created = PeerReviewGroupMembership.invite(group_id, invitee.id)
    if not was_created:
        return {"status": "error", "message": f"{invitee_username} is already invited or a member"}, 400

    return {
        "status": "success",
        "message": f"Invited {invitee_username}",
        "data": {"membershipId": membership.id}
    }, 201


def respond_to_invite_logic(membership_id, username, action):
    user, error = _get_verified_user_or_error(username)
    if error:
        return error

    if action == 'accept':
        m = PeerReviewGroupMembership.confirm(membership_id, user.id)
        if not m:
            return {"status": "error", "message": "Invite not found"}, 404
        return {"status": "success", "message": "Group confirmed"}, 200

    if action == 'decline':
        ok = PeerReviewGroupMembership.decline(membership_id, user.id)
        if not ok:
            return {"status": "error", "message": "Invite not found"}, 404
        return {"status": "success", "message": "Invite declined"}, 200

    return {"status": "error", "message": "Action must be 'accept' or 'decline'"}, 400


def submit_rating_logic(rater_username, group_id, rated_username, scores):
    rater, error = _get_verified_user_or_error(rater_username)
    if error:
        return error

    if not isinstance(scores, dict):
        return {"status": "error", "message": "scores must be an object"}, 400

    group = PeerReviewGroup.get_by_id(group_id)
    if not group:
        return {"status": "error", "message": "Group not found"}, 404

    if not PeerReviewGroupMembership.is_confirmed_member(group_id, rater.id):
        return {"status": "error", "message": "You must be a confirmed member of this group to rate teammates"}, 403

    if rated_username == rater_username:
        return {"status": "error", "message": "You can't rate yourself"}, 400

    rated_user = User.find_by_username(rated_username)
    if not rated_user:
        return {"status": "error", "message": f"No account found for '{rated_username}'"}, 404

    if not PeerReviewGroupMembership.is_any_member(group_id, rated_user.id):
        return {"status": "error", "message": f"{rated_username} isn't part of this group"}, 400

    for field in RATING_CATEGORIES:
        value = scores.get(field)
        try:
            value = int(value)
        except (TypeError, ValueError):
            return {"status": "error", "message": f"{field} must be a number"}, 400
        if value < MIN_RATING or value > MAX_RATING:
            return {"status": "error", "message": f"{field} must be between {MIN_RATING} and {MAX_RATING}"}, 400
        scores[field] = value

    # Behaviour presets + ONE short optional note (visible to admins only).
    # Per-category free-text comments are no longer collected: free text is where
    # defamatory statements live, and presets are far easier for admins to review.
    try:
        tags = peer_score.clean_behaviour_tags(scores.get('behaviour_tags'))
        note = peer_score.clean_note(scores.get('overall_comment'))
    except ValueError as exc:
        return {"status": "error", "message": str(exc)}, 400
    scores['documentation_comment'] = None
    scores['product_comment'] = None
    scores['attendance_comment'] = None
    scores['overall_comment'] = note

    rating = PeerReviewRating.upsert_rating(group_id, rater.id, rated_user.id, scores)
    PeerReviewRatingTag.replace_for_rating(rating.id, tags)
    return {
        "status": "success",
        "message": "Rating submitted",
        "data": {"ratingId": rating.id}
    }, 201


def get_my_groups_logic(username):
    user, error = _get_verified_user_or_error(username)
    if error:
        return error

    memberships = PeerReviewGroupMembership.get_confirmed_memberships_for_user(user.id)
    groups = []
    for m in memberships:
        group = PeerReviewGroup.get_by_id(m.group_id)
        if group:
            members = PeerReviewGroupMembership.get_members_of_group(group.id)
            member_info = []
            for member in members:
                member_user = User.query.get(member.user_id)
                if member_user:
                    member_info.append({
                        "username": member_user.username,
                        "status": member.status,
                    })
            groups.append({
                "groupId": group.id,
                "groupName": group.name,
                "members": member_info,
            })

    return {"status": "success", "message": "Groups retrieved", "data": {"groups": groups}}, 200


def get_my_invites_logic(username):
    user, error = _get_verified_user_or_error(username)
    if error:
        return error

    pending = PeerReviewGroupMembership.get_pending_invites_for_user(user.id)
    invites = []
    for m in pending:
        group = PeerReviewGroup.get_by_id(m.group_id)
        creator = User.query.get(group.creator_id) if group else None
        invites.append({
            "membershipId": m.id,
            "groupId": group.id if group else None,
            "groupName": group.name if group else "Unknown group",
            "invitedBy": creator.username if creator else "Unknown",
        })

    return {"status": "success", "message": "Invites retrieved", "data": {"invites": invites}}, 200


def get_my_ratings_given_logic(username):
    user, error = _get_verified_user_or_error(username)
    if error:
        return error

    ratings = PeerReviewRating.get_ratings_given_by(user.id)
    tags_by_rating = PeerReviewRatingTag.tags_by_rating([r.id for r in ratings])
    results = []
    for r in ratings:
        rated_user = User.query.get(r.rated_id)
        group = PeerReviewGroup.get_by_id(r.group_id)
        results.append({
            "ratingId": r.id,
            "groupName": group.name if group else "Unknown group",
            "ratedUsername": rated_user.username if rated_user else "Unknown",
            "documentationRating": r.documentation_rating,
            "documentationComment": r.documentation_comment,
            "productRating": r.product_rating,
            "productComment": r.product_comment,
            "attendanceRating": r.attendance_rating,
            "attendanceComment": r.attendance_comment,
            "overallRating": r.overall_rating,
            "overallComment": r.overall_comment,
            "behaviourTags": [
                {"code": code, "label": peer_score.TAG_LABELS.get(code, code)} for code in tags_by_rating.get(r.id, [])
            ],
        })

    return {"status": "success", "message": "Ratings retrieved", "data": {"ratings": results}}, 200


def build_score_view(target, viewer_is_self=False):
    """
    What a score looks like on screen. Never contains an exact rater count, and
    for anyone but the person themself it is hidden entirely when scores are
    opt-in and they haven't opted in.
    """
    opted_in = PeerReviewScorePref.is_opted_in(target.id)
    visible = peer_score.is_score_visible(opted_in)

    view = {
        "username": target.username,
        "displayMode": peer_score.effective_mode(),
        "scoreVisible": visible,
        "underReview": PeerReviewReport.has_open_dispute(target.id),
        "policy": peer_score.policy_summary(),
    }
    if visible or viewer_is_self:
        view.update(PeerReviewRating.get_public_overall_score(target.id))
    else:
        view.update({"meetsThreshold": False, "overallScore": None, "raterCountLabel": None})
    return view


def get_public_score_logic(target_username):
    target = User.find_by_username(target_username)
    if not target:
        return {"status": "error", "message": f"No account found for '{target_username}'"}, 404

    return {
        "status": "success",
        "message": "Score retrieved",
        "data": build_score_view(target),
    }, 200
