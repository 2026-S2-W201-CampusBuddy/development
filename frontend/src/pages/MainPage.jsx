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
import InternshipsModal from '../components/InternshipsModal'
import StudyRoomsModal from '../components/StudyRoomsModal'
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
  const [calendarFocusDate, setCalendarFocusDate] = useState(null)
  const [isInternshipsOpen, setIsInternshipsOpen] = useState(false)
  const [isStudyRoomsOpen, setIsStudyRoomsOpen] = useState(false)

  const isAdmin = loggedUser?.role === 'admin'

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  const [communityState, setCommunityState] = useState({
    isOpen: false,
    view: 'list',
    category: 'general',
  })

  const weatherState = useWeather()
  const { weather } = weatherState
  const rentState = useRent()

  const weatherPush = useWeatherPush(loggedUser)
  const reminderPush = useReminderPush(loggedUser)
  const alertsState = useAlerts(loggedUser, {
    onOpenAlerts: () => setIsAlertsOpen(true),
  })

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

  const fetchPendingCount = async () => {
    const userId = loggedUser?.id || loggedUser?.user_id

    if (!userId) return

    try {
      const res = await fetch(
        `/api/friends/requests/pending?user_id=${userId}`
      )

      if (res.ok) {
        const data = await res.json()

        setPendingRequestsCount(
          Array.isArray(data) ? data.length : 0
        )
      }
    } catch (err) {
      console.error(
        'Failed to fetch pending requests count:',
        err
      )
    }
  }

  useEffect(() => {
    fetchPendingCount()

    const interval = setInterval(
      fetchPendingCount,
      30000
    )

    return () => clearInterval(interval)
  }, [loggedUser])

  const openCommunityModal = (
    category = 'general',
    view = 'list'
  ) => {
    setCommunityState({
      isOpen: true,
      view,
      category,
    })
  }

  const closeCommunityModal = () => {
    setCommunityState((prev) => ({
      ...prev,
      isOpen: false,
    }))
  }

  const openCalendar = (dateKey = null) => {
    setCalendarFocusDate(dateKey)
    setIsAlertsOpen(false)
    setIsCalendarOpen(true)
  }

  const openAlerts = () => {
    setIsCalendarOpen(false)
    setIsAlertsOpen(true)
  }

  const calendarOrbLabel =
    alertsState.todayCount > 0
      ? `${formatOrbDate(new Date())} (${alertsState.todayCount})`
      : formatOrbDate(new Date())

  const alertsOrbLabel =
    alertsState.unreadCount > 0
      ? `Alerts (${alertsState.unreadCount})`
      : 'Alerts'

  const weatherOrbIcon = weather
    ? weather.icon
    : '⛅'

  const weatherOrbLabel = weather
    ? `${Math.round(weather.current_temp)}°C AKL`
    : 'Loading...'

  const honeycombRows = [
    // Row 1
    [
      {
        id: 'weather',
        icon: weatherOrbIcon,
        label: weatherOrbLabel,
        accentColor: '#fbbf24',
        glowColor: 'rgba(251, 191, 36, 0.4)',
        action: () => setIsWeatherOpen(true),
      },
      {
        id: 'calendar',
        icon: '📅',
        label: calendarOrbLabel,
        accentColor: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.4)',
        action: () => openCalendar(),
      },
      {
        id: 'alerts',
        icon: '🔔',
        label: alertsOrbLabel,
        accentColor: '#f87171',
        glowColor: 'rgba(248, 113, 113, 0.4)',
        action: openAlerts,
      },
    ],

    // Row 2
    [
      {
        id: 'market',
        icon: '🛒',
        label: 'Groceries',
        accentColor: '#fb7185',
        glowColor: 'rgba(251, 113, 133, 0.4)',
        action: () => setIsGroceryOpen(true),
      },
      {
        id: 'peerReview',
        icon: '📝',
        label: 'Peer Review',
        accentColor: '#a78bfa',
        glowColor: 'rgba(167, 139, 250, 0.4)',
        action: () => setIsPeerReviewOpen(true),
      },
      {
        id: 'community',
        icon: '💬',
        label: 'Community',
        accentColor: '#818cf8',
        glowColor: 'rgba(129, 140, 248, 0.4)',
        action: () =>
          openCommunityModal('general', 'list'),
      },
      {
        id: 'friends',
        icon: '👥',
        label:
          pendingRequestsCount > 0
            ? `Friends (${pendingRequestsCount})`
            : 'Friends',
        accentColor: '#fb923c',
        glowColor: 'rgba(251, 146, 60, 0.4)',
        action: () => setIsFriendsOpen(true),
      },
    ],

    // Row 3
    [
      {
        id: 'study',
        icon: '📚',
        label: 'Study Squad',
        accentColor: '#2dd4bf',
        glowColor: 'rgba(45, 212, 191, 0.4)',
        action: () =>
          openCommunityModal('study', 'list'),
      },
      {
        id: 'map',
        icon: '🗺️',
        label: 'Campus Map',
        accentColor: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.45)',
        action: () => setIsMapOpen(true),
      },
      {
        id: 'clock',
        isClock: true,
        label: 'Auckland',
        accentColor: '#ffffff',
        glowColor: 'rgba(255, 255, 255, 0.65)',
        action: () => setIsClockOpen(true),
      },
      {
        id: 'events',
        icon: '🎪',
        label: 'Events',
        accentColor: '#f472b6',
        glowColor: 'rgba(244, 114, 182, 0.4)',
        action: () => setIsEventsOpen(true),
      },
      {
        id: 'travelling',
        icon: '✈️',
        label: 'Travelling',
        accentColor: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.4)',
        action: () =>
          openCommunityModal('travelling', 'list'),
      },
    ],

    // Row 4
    [
      {
        id: 'radio',
        icon: '🏠',
        label: 'Rentals',
        accentColor: '#ec4899',
        glowColor: 'rgba(236, 72, 153, 0.4)',
        action: () => setIsRentOpen(true),
      },
      {
        id: 'wellness',
        icon: '🏃',
        label: 'Wellness',
        accentColor: '#10b981',
        glowColor: 'rgba(16, 185, 129, 0.4)',
        action: () =>
          openCommunityModal('wellness', 'list'),
      },
      {
        id: 'food',
        icon: '🍽️',
        label: 'Eatery',
        accentColor: '#f59e0b',
        glowColor: 'rgba(245, 158, 11, 0.4)',
        action: () =>
          openCommunityModal('food', 'list'),
      },
      {
        id: 'studyRooms',
        icon: '📚',
        label: 'Study Rooms',
        accentColor: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.4)',
        action: () => setIsStudyRoomsOpen(true),
      },
    ],

    // Row 5
    [
      {
        id: 'settings',
        icon: '⚙️',
        label: 'Settings',
        accentColor: '#94a3b8',
        glowColor: 'rgba(148, 163, 184, 0.4)',
        action: () => setIsSettingsOpen(true),
      },
      {
        id: 'currency',
        icon: '💱',
        label: 'Currency Exchange',
        accentColor: '#facc15',
        glowColor: 'rgba(250, 204, 21, 0.4)',
        action: () => setIsCurrencyOpen(true),
      },
      {
        id: 'internships',
        icon: '💼',
        label: 'Internships',
        accentColor: '#f6b93b',
        glowColor: 'rgba(246, 185, 59, 0.4)',
        action: () => setIsInternshipsOpen(true),
      },
      ...(isAdmin
        ? [
            {
              id: 'admin',
              icon: '🛡️',
              label: 'Admin',
              accentColor: '#f87171',
              glowColor: 'rgba(248, 113, 113, 0.4)',
              action: () => setIsAdminOpen(true),
            },
          ]
        : []),
    ],
  ]

  return (
    <main className="mainHubWrapper">
      <BubbleHub
        honeycombRows={honeycombRows}
        liveTime={liveTime}
      />

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

      <MapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
      />

      <GroceryModal
        isOpen={isGroceryOpen}
        onClose={() => setIsGroceryOpen(false)}
        currentUser={loggedUser}
      />

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

      <WorldClockModal
        isOpen={isClockOpen}
        onClose={() => setIsClockOpen(false)}
      />

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
          fetchPendingCount()
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

      <CurrencyModal
        isOpen={isCurrencyOpen}
        onClose={() => setIsCurrencyOpen(false)}
      />

      <PeerReviewModal
        isOpen={isPeerReviewOpen}
        onClose={() => setIsPeerReviewOpen(false)}
        currentUser={loggedUser}
      />

      <InternshipsModal
        isOpen={isInternshipsOpen}
        onClose={() => setIsInternshipsOpen(false)}
      />

      <StudyRoomsModal
        isOpen={isStudyRoomsOpen}
        onClose={() => setIsStudyRoomsOpen(false)}
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