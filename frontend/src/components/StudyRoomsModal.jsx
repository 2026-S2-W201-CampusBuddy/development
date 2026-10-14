import './StudyRoomsModal.css'

export default function StudyRoomsModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const openAUTBooking = () => {
    window.open(
  'https://www.aut.ac.nz/student-life/studying/booking-pcs-and-study-spaces',
  '_blank',
  'noopener,noreferrer'
)
  }

  return (
    <div className="studyrooms-overlay">
      <div className="studyrooms-modal">

        <button
          className="studyrooms-close"
          onClick={onClose}
        >
          ✕
        </button>

        <h2>AUT Study Rooms</h2>

        <p className="studyrooms-subtitle">
          Book a real AUT study room using the official AUT Lab Booking system.
        </p>

        <div className="studyrooms-info">
          <p>
            Sign in with your AUT network account, then choose your campus,
            room, date and available time.
          </p>

          <ul>
            <li>Bookings can be up to 2 hours</li>
            <li>You can have up to 2 advance bookings</li>
            <li>Bookings can be made up to 7 days ahead</li>
          </ul>
        </div>

        <button
          className="studyrooms-book"
          onClick={openAUTBooking}
        >
          Book on AUT
        </button>

      </div>
    </div>
  )
}