# backend/routes/admin_reports_routes.py
# Admin web addresses for the dispute/report queue.
from flask import Blueprint, jsonify, request
from controllers.admin_reports_controller import get_reports_logic, get_report_detail_logic, resolve_report_logic

admin_reports_bp = Blueprint('admin_reports', __name__, url_prefix='/api/admin/peer-review')


def _need_username():
    username = request.args.get('username', '')
    if not username:
        return None, (jsonify({"status": "error", "message": "username query param is required"}), 400)
    return username, None


@admin_reports_bp.route('/reports', methods=['GET'])
def reports():
    username, problem = _need_username()
    if problem:
        return problem
    result, status_code = get_reports_logic(username)
    return jsonify(result), status_code


@admin_reports_bp.route('/reports/<int:report_id>', methods=['GET'])
def report_detail(report_id):
    username, problem = _need_username()
    if problem:
        return problem
    result, status_code = get_report_detail_logic(username, report_id)
    return jsonify(result), status_code


@admin_reports_bp.route('/reports/<int:report_id>/resolve', methods=['POST'])
def resolve_report(report_id):
    data = request.get_json(silent=True) or {}
    if 'username' not in data or 'outcome' not in data:
        return jsonify({"status": "error", "message": "username and outcome are required"}), 400
    result, status_code = resolve_report_logic(
        data['username'], report_id, data['outcome'], data.get('note'), data.get('removeRatingIds'))
    return jsonify(result), status_code
