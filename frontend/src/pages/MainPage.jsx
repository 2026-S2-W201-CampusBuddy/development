import { useState, useEffect } from 'react'
import BubbleHub from '../components/BubbleHub'
import WeatherModal from '../components/WeatherModal'
import CommunityModal from '../components/CommunityModal'
import GroceryModal from '../components/GroceryModal'
import RentModal from '../components/RentModal'
import useWeather from '../hooks/useWeather'
import useRent from '../hooks/useRent'
import MapModal from '../components/MapModal'
import EventsModal from '../components/EventsModal'
import './MainPage.css'

export default function MainPage({ loggedUser }) {
  const [liveTime, setLiveTime] = useState('')
  const [isWeatherOpen, setIsWeatherOpen] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [isGroceryOpen, setIsGroceryOpen] = useState(false)
  const [isEventsOpen, setIsEventsOpen] = useState(false)
  const [isRentOpen, setIsRentOpen] = useState(false)

  // Community modal configuration state
  const [communityState, setCommunityState] = useState({
    isOpen: false,
    view: 'list',
    category: 'general',
  })

  const weatherState = useWeather()
  const { weather } = weatherState
  const rentState = useRent()

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      setLiveTime(`${hours}:${minutes}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Helper function to open Community modal with target category and view
  const openCommunityModal = (category = 'general', view = 'list') => {
    setCommunityState({
      isOpen: true,
      view: view,
      category: category,
    })
  }

  // Helper function to close Community modal
  const closeCommunityModal = () => {
    setCommunityState((prev) => ({ ...prev, isOpen: false }))
  }

  const weatherOrbIcon = weather ? weather.icon : '⛅'
  const weatherOrbLabel = weather ? `${Math.round(weather.current_temp)}°C AKL` : 'Loading...'

  const honeycombRows = [
    // Row 1 (3 Orbs)
    [
      { id: 'weather', icon: weatherOrbIcon, label: weatherOrbLabel, accentColor: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.4)', action: () => setIsWeatherOpen(true) },
      { id: 'calendar', icon: '📅', label: 'Feb 17', accentColor: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.4)', action: () => alert('Calendar') },
      { id: 'alerts', icon: '🔔', label: 'Alerts', accentColor: '#f87171', glowColor: 'rgba(248, 113, 113, 0.4)', action: () => alert('Notifications') }
    ],
    // Row 2 (4 Orbs)
    [
      { id: 'market', icon: '🛒', label: 'Groceries', accentColor: '#fb7185', glowColor: 'rgba(251, 113, 133, 0.4)', action: () => setIsGroceryOpen(true) },
      { id: 'quickAdd', icon: '➕', label: 'New Post', accentColor: '#a78bfa', glowColor: 'rgba(167, 139, 250, 0.4)', action: () => openCommunityModal('general', 'new') },
      { id: 'community', icon: '💬', label: 'Community', accentColor: '#818cf8', glowColor: 'rgba(129, 140, 248, 0.4)', action: () => openCommunityModal('general', 'list') },
      { id: 'shuttle', icon: '🚌', label: 'Shuttle', accentColor: '#fb923c', glowColor: 'rgba(251, 146, 60, 0.4)', action: () => alert('Shuttle Bus') }
    ],
    // Row 3 (5 Orbs with Central Clock)
    [
      { id: 'study', icon: '📚', label: 'Study Squad', accentColor: '#2dd4bf', glowColor: 'rgba(45, 212, 191, 0.4)', action: () => openCommunityModal('study', 'list') },
      { id: 'map', icon: '🗺️', label: 'Campus Map', accentColor: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.45)', action: () => setIsMapOpen(true) },
      { id: 'clock', isClock: true, label: 'Auckland', accentColor: '#ffffff', glowColor: 'rgba(255, 255, 255, 0.65)', action: () => alert('Clock') },
      { id: 'events', icon: '🎪', label: 'Events', accentColor: '#f472b6', glowColor: 'rgba(244, 114, 182, 0.4)', action: () => setIsEventsOpen(true) },
      { id: 'library', icon: '📖', label: 'Library', accentColor: '#c084fc', glowColor: 'rgba(192, 132, 252, 0.4)', action: () => alert('Library') }
    ],
    // Row 4 (4 Orbs)
    [
      { id: 'radio', icon: '🏠', label: 'Rentals', accentColor: '#ec4899', glowColor: 'rgba(236, 72, 153, 0.4)', action: () => setIsRentOpen(true) },
      // Wellness orb now opens Community with 'wellness' category
      { id: 'wellness', icon: '🏃', label: 'Wellness', accentColor: '#10b981', glowColor: 'rgba(16, 185, 129, 0.4)', action: () => openCommunityModal('wellness', 'list') },
      { id: 'food', icon: '🍽️', label: 'Eatery', accentColor: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.4)', action: () => openCommunityModal('food', 'list') },
      { id: 'messages', icon: '💌', label: 'Inbox', accentColor: '#6366f1', glowColor: 'rgba(99, 102, 241, 0.4)', action: () => alert('Direct Messages') }
    ],
    // Row 5 (3 Orbs)
    [
      { id: 'settings', icon: '⚙️', label: 'Settings', accentColor: '#94a3b8', glowColor: 'rgba(148, 163, 184, 0.4)', action: () => alert('Settings') },
      { id: 'profile', icon: '👤', label: 'Student ID', accentColor: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.4)', action: () => alert('Student Profile') },
      { id: 'canvas', icon: '🔗', label: 'Canvas', accentColor: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.4)', action: () => alert('Canvas Portal') }
    ]
  ]

  return (
    <main className="mainHubWrapper">
      <BubbleHub honeycombRows={honeycombRows} liveTime={liveTime} />
      <WeatherModal
        isOpen={isWeatherOpen}
        onClose={() => setIsWeatherOpen(false)}
        {...weatherState}
      />
      <CommunityModal
        isOpen={communityState.isOpen}
        initialView={communityState.view}
        initialCategory={communityState.category}
        onClose={closeCommunityModal}
        currentUser={loggedUser}
      /> 
      <MapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
      <GroceryModal isOpen={isGroceryOpen} onClose={() => setIsGroceryOpen(false)} currentUser={loggedUser} />
      <EventsModal isOpen={isEventsOpen} onClose={() => setIsEventsOpen(false)} />
      <RentModal
        isOpen={isRentOpen}
        onClose={() => setIsRentOpen(false)}
        {...rentState}
      />
    </main>
  )
}