import './MapModal.css'

const MAZEMAP_EMBED_URL = 'https://use.mazemap.com/embed.html?campusid=103&center=174.766101,-36.853433&zoom=15.7&zlevel=1&campuscenter=1'

const MAZEMAP_FULL_URL = 'https://use.mazemap.com/#v=1&config=AUT&campusid=103&zlevel=1&center=174.766101,-36.853433&zoom=17.7'

export default function MapModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog hubModalDialog mapDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose} aria-label="Close">✕</button>

        <div className="hubModalBody mapModalBody">
          <div className="modalHeader">
            <h2 className="modalHeading">Campus Map</h2>
            <p className="modalCaption">Find your way to class</p>
          </div>

          <div className="mapEmbedWrapper">
            <iframe
              src={MAZEMAP_EMBED_URL}
              title="AUT Campus Map"
              className="mapEmbedFrame"
              allow="web-share geolocation magnetometer gyroscope"
              frameBorder="0"
            />
          </div>

          
           <a href={MAZEMAP_FULL_URL} target="_blank" rel="noopener noreferrer" className="btnGlass btnPrimary btnFullWidth mapExternalBtn">
            Open Full Map
          </a>

        </div>
      </div>
    </div>
  )
}