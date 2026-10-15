import { useEffect, useState } from 'react'
import { getInternships } from '../api'
import './InternshipsModal.css'

export default function InternshipsModal({ isOpen, onClose }) {
  const [internships, setInternships] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return

    async function loadInternships() {
      try {
        setLoading(true)
        setError('')

        const data = await getInternships()
        const jobs = data.jobs || data.results || data.data || data

        setInternships(Array.isArray(jobs) ? jobs : [])
      } catch (err) {
        console.error(err)
        setError('Could not load live internships.')
      } finally {
        setLoading(false)
      }
    }

    loadInternships()
  }, [isOpen])

  if (!isOpen) return null

  const openJobSearch = (title) => {
    const searchTerm = encodeURIComponent(title)

    window.open(
      `https://jobs.co.nz/jobs?keywords=${searchTerm}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <div className="internships-overlay">
      <div className="internships-modal">

        <button
          className="internships-close"
          onClick={onClose}
        >
          ✕
        </button>

        <h2>Internship Opportunities</h2>

        <p className="internships-subtitle">
          Explore live internship and graduate opportunities for students.
        </p>

        {loading && (
          <p>Loading live internships...</p>
        )}

        {error && (
          <p>{error}</p>
        )}

        {!loading && !error && internships.length === 0 && (
          <p>No internships found at the moment.</p>
        )}

        <div className="internships-list">

          {internships.map((internship, index) => (
            <div
              className="internship-card"
              key={internship.id || index}
            >
              <h3>
                {internship.title || 'Internship Opportunity'}
              </h3>

              <p>
                <strong>Company:</strong>{' '}
                {internship.company ||
                  internship.employer ||
                  'Employer not listed'}
              </p>

              <p>
                <strong>Location:</strong>{' '}
                {internship.town ||
                  internship.location ||
                  internship.region ||
                  'New Zealand'}
              </p>

              {internship.employment_type && (
                <p>
                  <strong>Type:</strong>{' '}
                  {internship.employment_type}
                </p>
              )}

              {internship.description && (
                <p>
                  {internship.description.length > 180
                    ? `${internship.description.substring(0, 180)}...`
                    : internship.description}
                </p>
              )}

              <button
                className="internship-button"
                onClick={() =>
                  openJobSearch(
                    internship.title || 'internship'
                  )
                }
              >
                Find This Job
              </button>

            </div>
          ))}

        </div>
      </div>
    </div>
  )
}