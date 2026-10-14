import { useState, useEffect } from 'react'
import BubbleHub from '../components/BubbleHub'
import WeatherModal from '../components/WeatherModal'
import CommunityModal from '../components/CommunityModal'
import GroceryModal from '../components/GroceryModal'
import RentModal from '../components/RentModal'
import WorldClockModal from '../components/WorldClockModal'
import useWeather from '../hooks/useWeather'
import useRent from '../hooks/useRent'
import useWeatherPush from '../hooks/useWeatherPush'
import useReminderPush from '../hooks/useReminderPush'
import useAlerts from '../hooks/useAlerts'
import CalendarModal from '../components/CalendarModal'
import AlertsModal from '../components/AlertsModal'
import { formatOrbDate } from '../utils/calendarUtils'
import MapModal from '../components/MapModal'
import EventsModal from '../components/EventsModal'
import FriendsModal from '../components/FriendsModal'
import SettingsModal from '../components/SettingsModal'
import CurrencyModal from '../components/CurrencyModal'
import PeerReviewModal from '../components/PeerReviewModal'
import AdminModal from '../components/AdminModal'
import './MainPage.css'

export default function MainPage({ loggedUser, onUsernameChanged, onLogout }) {
  const [liveTime, setLiveTime] = useState('')
  const [isWeatherOpen, setIsWeatherOpen] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [isGroceryOpen, setIsGroceryOpen] = useState(false)
  const [isEventsOpen, setIsEventsOpen] = useState(false)
  const [isRentOpen, setIsRentOpen] = useState(false)
  const [isClockOpen, setIsClockOpen] = useState(false)
  const [isFriendsOpen, setIsFriendsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false)
  const [isPeerReviewOpen, setIsPeerReviewOpen] = useState(false)
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isAlertsOpen, setIsAlertsOpen] = useState(false)
  const [calendarFocusDate, setCalendarFocusDate] = useState(null) // jump the calendar to this day when it opens
  const isAdmin = loggedUser?.role === 'admin'
  // Pending friend requests counter for the main hub orb
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  // Community modal configuration state
  const [communityState, setCommunityState] = useState({
    isOpen: false,
    view: 'list',
    category: 'general',
  })

  // Fetched once here and shared with their modals via props below
  const weatherState = useWeather()
  const { weather } = weatherState
  const rentState = useRent()
  const weatherPush = useWeatherPush(loggedUser) // scheduled alerts (works with the site closed)
  const reminderPush = useReminderPush(loggedUser) // calendar event + alert notifications (also work with the site closed)
  const alertsState = useAlerts(loggedUser, { onOpenAlerts: () => setIsAlertsOpen(true) }) // unread badge + today's count

  // Real-time clock timer
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

  // Function to fetch pending friend request count from backend
  const fetchPendingCount = async () => {
    const userId = loggedUser?.id || loggedUser?.user_id
    if (!userId) return

    try {
      const res = await fetch(`/api/friends/requests/pending?user_id=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setPendingRequestsCount(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('Failed to fetch pending requests count:', err)
    }
  }

  // Poll friend requests count on load and every 30 seconds
  useEffect(() => {
    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 30000)
    return () => clearInterval(interval)
  }, [loggedUser])

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

  // Calendar and Alerts open each other so they feel like one feature
  const openCalendar = (dateKey = null) => {
    setCalendarFocusDate(dateKey)
    setIsAlertsOpen(false)
    setIsCalendarOpen(true)
  }
  const openAlerts = () => {
    setIsCalendarOpen(false)
    setIsAlertsOpen(true)
  }

  const calendarOrbLabel = alertsState.todayCount > 0
    ? `${formatOrbDate(new Date())} (${alertsState.todayCount})`
    : formatOrbDate(new Date())
  const alertsOrbLabel = alertsState.unreadCount > 0 ? `Alerts (${alertsState.unreadCount})` : 'Alerts'

  const weatherOrbIcon = weather ? weather.icon : '⛅'
  const weatherOrbLabel = weather ? `${Math.round(weather.current_temp)}°C AKL` : 'Loading...'

  const honeycombRows = [
    // Row 1 (3 Orbs)
    [
      { id: 'weather', icon: weatherOrbIcon, label: weatherOrbLabel, accentColor: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.4)', action: () => setIsWeatherOpen(true) },
      { id: 'calendar', icon: '📅', label: calendarOrbLabel, accentColor: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.4)', action: () => openCalendar() },
      { id: 'alerts', icon: '🔔', label: alertsOrbLabel, accentColor: '#f87171', glowColor: 'rgba(248, 113, 113, 0.4)', action: openAlerts }
    ],
    // Row 2 (4 Orbs)
    [
      { id: 'market', icon: '🛒', label: 'Groceries', accentColor: '#fb7185', glowColor: 'rgba(251, 113, 133, 0.4)', action: () => setIsGroceryOpen(true) },
      { id: 'peerReview', icon: '📝', label: 'Peer Review', accentColor: '#a78bfa', glowColor: 'rgba(167, 139, 250, 0.4)', action: () => setIsPeerReviewOpen(true) },
      { id: 'community', icon: '💬', label: 'Community', accentColor: '#818cf8', glowColor: 'rgba(129, 140, 248, 0.4)', action: () => openCommunityModal('general', 'list') },
      {
        id: 'friends',
        icon: '👥',
        // Display count badge on the orb label when pending requests exist
        label: pendingRequestsCount > 0 ? `Friends (${pendingRequestsCount})` : 'Friends',
        accentColor: '#fb923c',
        glowColor: 'rgba(251, 146, 60, 0.4)',
        action: () => setIsFriendsOpen(true)
      }
    ],
    // Row 3 (5 Orbs with Central Clock)
    [
      { id: 'study', icon: '📚', label: 'Study Squad', accentColor: '#2dd4bf', glowColor: 'rgba(45, 212, 191, 0.4)', action: () => openCommunityModal('study', 'list') },
      { id: 'map', icon: '🗺️', label: 'Campus Map', accentColor: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.45)', action: () => setIsMapOpen(true) },
      { id: 'clock', isClock: true, label: 'Auckland', accentColor: '#ffffff', glowColor: 'rgba(255, 255, 255, 0.65)', action: () => setIsClockOpen(true) },
      { id: 'events', icon: '🎪', label: 'Events', accentColor: '#f472b6', glowColor: 'rgba(244, 114, 182, 0.4)', action: () => setIsEventsOpen(true) },
      { id: 'travelling', icon: '✈️', label: 'Travelling', accentColor: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.4)', action: () => openCommunityModal('travelling', 'list') }
    ],
    // Row 4 (4 Orbs)
    [
      { id: 'radio', icon: '🏠', label: 'Rentals', accentColor: '#ec4899', glowColor: 'rgba(236, 72, 153, 0.4)', action: () => setIsRentOpen(true) },
      { id: 'wellness', icon: '🏃', label: 'Wellness', accentColor: '#10b981', glowColor: 'rgba(16, 185, 129, 0.4)', action: () => openCommunityModal('wellness', 'list') },
      { id: 'food', icon: '🍽️', label: 'Eatery', accentColor: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.4)', action: () => openCommunityModal('food', 'list') },
      { id: 'messages', icon: '💌', label: 'Inbox', accentColor: '#6366f1', glowColor: 'rgba(99, 102, 241, 0.4)', action: () => alert('Direct Messages') }
    ],
    // Row 5 (3 Orbs, +1 for admins)
    [
      { id: 'settings', icon: '⚙️', label: 'Settings', accentColor: '#94a3b8', glowColor: 'rgba(148, 163, 184, 0.4)', action: () => setIsSettingsOpen(true) },
      { id: 'currency', icon: '💱', label: 'Currency Exchange', accentColor: '#facc15', glowColor: 'rgba(250, 204, 21, 0.4)', action: () => setIsCurrencyOpen(true) },
      { id: 'canvas', icon: '🔗', label: 'Canvas', accentColor: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.4)', action: () => alert('Canvas Portal') },
      ...(isAdmin ? [{ id: 'admin', icon: '🛡️', label: 'Admin', accentColor: '#f87171', glowColor: 'rgba(248, 113, 113, 0.4)', action: () => setIsAdminOpen(true) }] : [])
    ]
  ]

  return (
    <main className="mainHubWrapper">
      <BubbleHub honeycombRows={honeycombRows} liveTime={liveTime} />
      <WeatherModal
        isOpen={isWeatherOpen}
        onClose={() => setIsWeatherOpen(false)}
        {...weatherState}
        push={weatherPush}
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
      <EventsModal
        isOpen={isEventsOpen}
        onClose={() => setIsEventsOpen(false)}
        onOpenCommunityEvents={(view) => {
          setIsEventsOpen(false)
          openCommunityModal('event', view)
        }}
      />
      <RentModal
        isOpen={isRentOpen}
        onClose={() => setIsRentOpen(false)}
        {...rentState}
      />
      <WorldClockModal isOpen={isClockOpen} onClose={() => setIsClockOpen(false)} />
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        currentUser={loggedUser}
        push={reminderPush}
        onChanged={alertsState.refreshSummary}
        initialDate={calendarFocusDate}
        onOpenAlerts={openAlerts}
      />
      <AlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        currentUser={loggedUser}
        push={reminderPush}
        onChanged={alertsState.refreshSummary}
        unreadCount={alertsState.unreadCount}
        onOpenCalendar={openCalendar}
      />
      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => {
          setIsFriendsOpen(false)
          fetchPendingCount() // Sync count when modal closes
        }}
        currentUser={loggedUser}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={loggedUser}
        onUsernameChanged={onUsernameChanged}
        onLogout={onLogout}
      />
      <CurrencyModal isOpen={isCurrencyOpen} onClose={() => setIsCurrencyOpen(false)} />
      <PeerReviewModal
        isOpen={isPeerReviewOpen}
        onClose={() => setIsPeerReviewOpen(false)}
        currentUser={loggedUser}
      />
      {isAdmin && (
        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          currentUser={loggedUser}
        />
      )}
    </main>
  )
}