import requests
from flask import Blueprint, jsonify

internships_bp = Blueprint('internships', __name__)

@internships_bp.route('/api/internships', methods=['GET'])
def get_internships():
    try:
        response = requests.get(
            'https://jobs.co.nz/api/v1/jobs',
            timeout=10
        )

        response.raise_for_status()
        data = response.json()

        jobs = data.get('data', [])

        keywords = [
            'intern',
            'internship',
            'graduate',
            'student',
            'trainee'
        ]

        filtered_jobs = []

        for job in jobs:
            title = str(job.get('title', '')).lower()
            description = str(job.get('description', '')).lower()
            employment_type = str(
                job.get('employment_type', '')
            ).lower()

            relevant = (
                employment_type == 'internship'
                or any(keyword in title for keyword in keywords)
                or any(keyword in description for keyword in keywords)
            )

            if not relevant:
                continue

            # Check that the individual listing is still live
            job_id = job.get('id')

            if not job_id:
                continue

            try:
                live_check = requests.get(
                    f'https://jobs.co.nz/api/v1/jobs/{job_id}',
                    timeout=5
                )

                if live_check.status_code == 200:
                    filtered_jobs.append(job)

            except requests.RequestException:
                continue

        return jsonify({
            'jobs': filtered_jobs
        })

    except requests.RequestException as error:
        return jsonify({
            'error': 'Could not fetch jobs',
            'details': str(error)
        }), 500