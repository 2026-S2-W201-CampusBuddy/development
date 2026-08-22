import { useEffect, useRef } from 'react'
import './EventsModal.css'

const LATEST_POST_URL = 'https://www.instagram.com/p/DPzbXCvCew7/'

const PROFILE_URL = 'https://www.instagram.com/autuni/'

export default function EventsModal({ isOpen, onClose }) {
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    if (!scriptLoadedRef.current) {
      const script = document.createElement('script')
      script.src = 'https://www.instagram.com/embed.js'
      script.async = true
      script.onload = () => {
        scriptLoadedRef.current = true
        window.instgrm?.Embeds?.process()
      }
      document.body.appendChild(script)
    } else {
      window.instgrm?.Embeds?.process()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog hubModalDialog eventsDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose} aria-label="Close">✕</button>

        <div className="hubModalBody eventsModalBody">
          <div className="modalHeader">
            <h2 className="modalHeading">Campus Events</h2>
            <p className="modalCaption">Latest from AUT on Instagram</p>
          </div>

          <div className="instagramSinglePost">
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={LATEST_POST_URL}
              data-instgrm-version="14"
            />
          </div>

          
            <a href={PROFILE_URL} target="_blank" rel="noopener noreferrer" className="btnGlass btnPrimary btnFullWidth eventsExternalBtn">View Full Profile</a>
        </div>
      </div>
    </div>
  )
}