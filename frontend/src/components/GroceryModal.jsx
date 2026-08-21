import { useState, useEffect } from 'react'
import './GroceryModal.css'

export default function GroceryModal({ isOpen, onClose, currentUser }) {
  const [stores, set_stores] = useState([])
  const [loading, set_loading] = useState(false)
  
  const [search_query, set_search_query] = useState('')
  const [current_location, set_current_location] = useState('Auckland CBD')
  const [selected_store, set_selected_store] = useState(null)
  const [is_saving, set_is_saving] = useState(false)
  const [save_message, set_save_message] = useState('')

  // 1. Load user's saved preferred location from backend when modal opens
  useEffect(() => {
    if (isOpen && currentUser) {
      fetch(`http://127.0.0.1:5000/api/user/location/${currentUser}`)
        .then(res => res.json())
        .then(data => {
          if (data.preferred_location) {
            set_current_location(data.preferred_location)
          }
        })
        .catch(err => console.error("Failed to load preferred location:", err))
    }
  }, [isOpen, currentUser])

  // 2. Fetch real grocery stores from Flask backend whenever current_location changes
  useEffect(() => {
    if (isOpen) {
      set_loading(true)
      set_selected_store(null)
      fetch(`http://127.0.0.1:5000/api/groceries?location=${encodeURIComponent(current_location)}`)
        .then(res => res.json())
        .then(data => {
          if (data.stores) {
            set_stores(data.stores)
          }
          set_loading(false)
        })
        .catch(err => {
          console.error("Failed to fetch groceries:", err)
          set_loading(false)
        })
    }
  }, [isOpen, current_location])

  if (!isOpen) return null

  const google_maps_api_key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  // Build clean search query for Google Maps Embed API
  // If a store is selected, focus on that store. Otherwise, search supermarkets in the specific location.
  const map_query = selected_store 
    ? `${selected_store.name}, ${selected_store.address}` 
    : `supermarket in ${current_location}, Auckland, New Zealand`

  const map_embed_url = google_maps_api_key
    ? `https://www.google.com/maps/embed/v1/search?key=${google_maps_api_key}&q=${encodeURIComponent(map_query)}&zoom=14`
    : `https://www.google.com/maps/embed/v1/place?q=Auckland+CBD&zoom=14`

  // Handle location search submit
  const handle_search_submit = (e) => {
    e.preventDefault()
    if (search_query.trim() !== '') {
      set_current_location(search_query)
      set_selected_store(null) // Reset store focus so map centers on the new search location!
      set_search_query('')
    }
  }

  // Save current location to SQLite database
  const handle_save_location = async () => {
    if (!currentUser) {
      alert("Please log in to save your preferred location.")
      return
    }

    set_is_saving(true)
    try {
      const response = await fetch('http://127.0.0.1:5000/api/user/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, location: current_location })
      })
      const data = await response.json()
      if (data.success) {
        set_save_message('Location saved! 🎉')
        setTimeout(() => set_save_message(''), 3000)
      } else {
        alert("Failed to save location.")
      }
    } catch (err) {
      console.error("Error saving location:", err)
      alert("Server error while saving.")
    } finally {
      set_is_saving(false)
    }
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      {/* Increased max-width for side-by-side layout */}
      <div className="modalDialog hubModalDialog groceryDialogWide" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose} aria-label="Close">✕</button>

        <div className="hubModalBody groceryModalBody">
          
          {/* Top Header & Search Bar */}
          <div className="modalHeader">
            <h2 className="modalHeading">Local Grocery & Supermarkets</h2>
            <div className="headerSubRow">
              <p className="modalCaption">
                Showing stores near: <strong>{current_location}</strong>
              </p>
              <button 
                className="btnGlass btnPrimary saveLocationBtn" 
                onClick={handle_save_location}
                disabled={is_saving}
              >
                {is_saving ? 'Saving...' : '💾 Save Location'}
              </button>
            </div>
            {save_message && <p className="saveSuccessText">{save_message}</p>}
          </div>

          <form onSubmit={handle_search_submit} className="grocerySearchForm">
            <input 
              type="text" 
              className="grocerySearchInput"
              placeholder="Search custom location (e.g. Newmarket, Mt Eden)..."
              value={search_query}
              onChange={(e) => set_search_query(e.target.value)}
            />
            <button type="submit" className="btnGlass grocerySearchBtn">Search</button>
          </form>

          {/* MAIN CONTENT SPLIT (Left: Map, Right: Scrollable List) */}
          <div className="grocerySplitContainer">
            
            {/* Left Column: Interactive Map */}
            <div className="groceryMapPane">
            {selected_store && (
              <div className="mapFloatingResetBadge">
                <span>📍 {selected_store.name}</span>
                <button className="floatingResetBtn" onClick={() => set_selected_store(null)}>
                  ✕ Show All
                </button>
              </div>
            )}
            <iframe
              src={map_embed_url}
              title="Google Map Groceries"
              className="groceryMapFrame"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

            {/* Right Column: Scrollable Supermarket List */}
            <div className="groceryListPane">
              <p className="listInstruction">💡 Click any store to locate on map:</p>
              {loading ? (
                <p className="loadingText">Loading supermarkets...</p>
              ) : stores.length > 0 ? (
                stores.map((store) => (
                  <div 
                    key={store.id} 
                    className={`groceryCard ${selected_store?.id === store.id ? 'activeStoreCard' : ''}`}
                    onClick={() => set_selected_store(store)}
                  >
                    <div className="groceryInfo">
                      <h3 className="groceryName">{store.name}</h3>
                      <p className="groceryAddress">{store.address}</p>
                    </div>
                    <div className="groceryMeta">
                      <span className="groceryRating">⭐ {store.rating}</span>
                      <span className="groceryPrice">{store.price_tier}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="loadingText">No supermarkets found.</p>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}