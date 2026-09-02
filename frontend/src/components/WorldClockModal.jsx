import { useState } from 'react'
import useWorldClock from '../hooks/useWorldClock'
import './WorldClockModal.css'

export default function WorldClockModal({ isOpen, onClose }) {
  const {
    aucklandTime,
    savedCities,
    suggestedToShow,
    searchTerm,
    setSearchTerm,
    searchResults,
    addCity,
    removeCity,
  } = useWorldClock()
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  if (!isOpen) return null

  const handleAdd = (city) => {
    addCity(city)
    setSearchTerm('')
  }

  const closePicker = () => {
    setIsPickerOpen(false)
    setSearchTerm('')
  }

  const listToShow = searchTerm.trim() ? searchResults : suggestedToShow

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog worldClockDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose}>✕</button>

        <div className="modalHeader">
          <h2 className="modalHeading">World Clock</h2>
          <p className="modalCaption">Keep track of the time back home</p>
        </div>

        <div className="wcAucklandCard">
          <div className="wcAucklandLabel">
            <span className="wcPinIcon">📍</span> Auckland
          </div>
          <div className="wcAucklandTime">{aucklandTime}</div>
        </div>

        {savedCities.length > 0 && (
          <div className="wcCityList">
            {savedCities.map((city) => (
              <div key={city.tz} className="wcCityRow">
                <div className="wcCityInfo">
                  <span className="wcCityLabel">
                    {city.label}
                    {city.dayOffset && <span className="wcDayOffset">{city.dayOffset}</span>}
                  </span>
                  <span className="wcCityCountry">{city.country}</span>
                </div>
                <div className="wcCityRight">
                  <span className="wcCityTime">{city.time}</span>
                  <span className={`wcCallNote wcCallNote-${city.callNote.tone}`}>
                    {city.callNote.text}
                  </span>
                  <button
                    className="wcRemoveBtn"
                    onClick={() => removeCity(city.tz)}
                    aria-label={`Remove ${city.label}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {savedCities.length === 0 && !isPickerOpen && (
          <p className="weatherStatusText">
            Add a city to see the time back home, right next to Auckland's.
          </p>
        )}

        {!isPickerOpen ? (
          <button className="btnGlass btnPrimary btnFullWidth" onClick={() => setIsPickerOpen(true)}>
            ➕ Add a city
          </button>
        ) : (
          <div className="wcPicker">
            <input
              type="text"
              className="wcSearchInput"
              placeholder="Search any city or country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />

            <span className="rentSectionLabel">
              {searchTerm.trim() ? 'Search results' : 'Suggested for students'}
            </span>

            <div className="wcPickerList">
              {listToShow.map((city) => (
                <button key={city.tz} className="wcPickerOption" onClick={() => handleAdd(city)}>
                  <span>{city.label}</span>
                  <span className="wcPickerCountry">{city.country}</span>
                </button>
              ))}
              {listToShow.length === 0 && (
                <p className="weatherStatusText">
                  {searchTerm.trim() ? 'No matching city found.' : "You've added every suggested city."}
                </p>
              )}
            </div>

            <button className="btnGlass btnFullWidth" onClick={closePicker}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
