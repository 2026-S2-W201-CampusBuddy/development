import { useEffect, useRef } from 'react'
import './EventsModal.css'

// Replace these three with real public post URLs from AUT's Instagram.
// Get each one via the post's "..." menu → Copy Link.
const INSTAGRAM_POST_URLS = [
  'https://www.instagram.com/p/Dcc8cLilmin/',
  'https://www.instagram.com/p/DPzbXCvCew7/',
  'http://instagram.com/p/Dc0Hm8yDyfL/?img_index=1',
]

const AUT_EVENTS_URL = 'https://www.aut.ac.nz/events'
const AUT_INSTAGRAM_URL = 'https://www.instagram.com/autuni/'

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

          <div className="instagramFeedGrid">
            {INSTAGRAM_POST_URLS.map((url) => (
              <blockquote
                key={url}
                className="instagram-media"
                data-instgrm-permalink={url}
                data-instgrm-version="14"
              />
            ))}
          </div>

          <div className="eventsExternalLinks">
            <a
              href={AUT_EVENTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btnGlass btnPrimary btnFullWidth"
            >
              Open AUT Events
            </a>
            <a
              href={AUT_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btnGlass btnFullWidth"
            >
              View on Instagram
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}