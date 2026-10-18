# backend/controllers/peer_review_safety_controller.py
# The student-facing side of the new safeguards: the options the screens need,
# "My Score", the show-my-score opt-in, and filing a dispute / report.
from models.user_model import User
from models.peer_review_extras_model import PeerReviewScorePref, PeerReviewReport
from services import peer_score
from controllers.peer_review_controller import _get_verified_user_or_error, build_score_view


def get_options_logic():
    """Everything the Peer Review screens need to draw presets + explain the rules."""
    return {
        "status": "success",
        "message": "Options retrieved",
        "data": {
            "tags": [{"code": c, "label": label, "positive": positive} for c, label, positive in peer_score.BEHAVIOUR_TAGS],
            "reportReasons": [{"code": c, "label": label} for c, label in peer_score.REPORT_REASONS],
            "conflicts": [list(pair) for pair in peer_score.CONFLICTING_TAGS],
            "noteMaxLength": peer_score.MAX_NOTE_LENGTH,
            "detailsMaxLength": peer_score.MAX_REPORT_DETAILS,
            "displayMode": peer_score.effective_mode(),
            "policy": peer_score.policy_summary(),
        },
    }, 200


def _report_view(report, usernames):
    return {
        "reportId": report.id,
        "kind": report.kind,
        "subject": usernames.get(report.subject_user_id, "Unknown"),
        "reason": report.reason,
        "reasonLabel": peer_score.REASON_LABELS.get(report.reason, report.reason),
        "details": report.details,
        "status": report.status,
        "createdAt": peer_score.iso_z(report.created_at),
        "dueAt": peer_score.iso_z(report.due_at),
        "resolvedAt": peer_score.iso_z(report.resolved_at),
        # NOTE: the admin's written reasoning is deliberately NOT sent here — it can mention
        # who rated whom, and rater identities must stay private even from the person disputing.
        "ratingsRemoved": report.ratings_removed,
    }


def get_my_score_logic(username):
    user, error = _get_verified_user_or_error(username)
    if error:
        return error

    view = build_score_view(user, viewer_is_self=True)
    view["optedIn"] = PeerReviewScorePref.is_opted_in(user.id)

    mine = PeerReviewReport.query.filter_by(reporter_id=user.id).order_by(PeerReviewReport.created_at.desc()).limit(20).all()
    names = {u.id: u.username for u in User.query.filter(User.id.in_(list({r.subject_user_id for r in mine}))).all()} if mine else {}
    view["reports"] = [_report_view(r, names) for r in mine]
    view["canDispute"] = not any(r.kind == "dispute" and r.status == "open" for r in mine)

    return {"status": "success", "message": "Score retrieved", "data": view}, 200


def set_score_visibility_logic(username, show):
    user, error = _get_verified_user_or_error(username)
    if error:
        return error
    if peer_score.effective_mode() == 'mandatory':
        return {"status": "error", "message": "Scores are shown for everyone, so there's nothing to switch on or off"}, 400
    if not isinstance(show, bool):
        return {"status": "error", "message": "show must be true or false"}, 400

    PeerReviewScorePref.set_opt_in(user.id, show)
    return {"status": "success", "message": "Saved", "data": {"optedIn": show}}, 200


def create_report_logic(username, kind, subject_username, reason, details):
    user, error = _get_verified_user_or_error(username)
    if error:
        return error

    try:
        kind, reason, details = peer_score.clean_report(kind, reason, details)
    except ValueError as exc:
        return {"status": "error", "message": str(exc)}, 400

    if kind == 'dispute':
        subject = user                                   # you can only dispute your OWN score
    else:
        if not subject_username:
            return {"status": "error", "message": "Please say whose score you're concerned about"}, 400
        subject = User.find_by_username(subject_username)
        if not subject:
            return {"status": "error", "message": f"No account found for '{subject_username}'"}, 404
        if subject.id == user.id:
            return {"status": "error", "message": "Use “Dispute my score” for your own score"}, 400

    if PeerReviewReport.open_exists(user.id, subject.id, kind):
        what = "dispute" if kind == 'dispute' else "report about this person"
        return {"status": "error", "message": f"You already have an open {what} — an admin will respond within {peer_score.DISPUTE_RESPONSE_HOURS} hours"}, 400
    if PeerReviewReport.count_open_by_reporter(user.id) >= peer_score.MAX_OPEN_REPORTS_PER_USER:
        return {"status": "error", "message": "You have several open reports already — please wait for an admin to respond before sending more"}, 400

    report = PeerReviewReport.create(kind, user.id, subject.id, reason, details)
    return {
        "status": "success",
        "message": f"Thanks — an admin will review this within {peer_score.DISPUTE_RESPONSE_HOURS} hours",
        "data": {"reportId": report.id, "dueAt": peer_score.iso_z(report.due_at)},
    }, 201
