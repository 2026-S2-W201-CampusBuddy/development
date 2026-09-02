import { useState, useEffect, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'campusbuddy_world_clock_cities'
const AUCKLAND_TZ = 'Pacific/Auckland'

// A curated shortlist for AUT/Auckland's international student population —
// shown as quick suggestions before the user starts typing a search.
export const SUGGESTED_CITIES = [
  { label: 'Beijing', country: 'China', tz: 'Asia/Shanghai' },
  { label: 'New Delhi', country: 'India', tz: 'Asia/Kolkata' },
  { label: 'Mumbai', country: 'India', tz: 'Asia/Kolkata' },
  { label: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo' },
  { label: 'Seoul', country: 'South Korea', tz: 'Asia/Seoul' },
  { label: 'Manila', country: 'Philippines', tz: 'Asia/Manila' },
  { label: 'Jakarta', country: 'Indonesia', tz: 'Asia/Jakarta' },
  { label: 'Ho Chi Minh City', country: 'Vietnam', tz: 'Asia/Ho_Chi_Minh' },
  { label: 'Bangkok', country: 'Thailand', tz: 'Asia/Bangkok' },
  { label: 'Kuala Lumpur', country: 'Malaysia', tz: 'Asia/Kuala_Lumpur' },
  { label: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore' },
  { label: 'Hong Kong', country: 'Hong Kong', tz: 'Asia/Hong_Kong' },
  { label: 'Taipei', country: 'Taiwan', tz: 'Asia/Taipei' },
  { label: 'Dubai', country: 'UAE', tz: 'Asia/Dubai' },
  { label: 'London', country: 'United Kingdom', tz: 'Europe/London' },
  { label: 'Sydney', country: 'Australia', tz: 'Australia/Sydney' },
  { label: 'Los Angeles', country: 'USA', tz: 'America/Los_Angeles' },
  { label: 'New York', country: 'USA', tz: 'America/New_York' },
  { label: 'Toronto', country: 'Canada', tz: 'America/Toronto' },
]

// A small fallback list, only used if a browser doesn't support
// Intl.supportedValuesOf (older Safari) — search still works, just
// across fewer zones instead of the full IANA database.
const FALLBACK_ZONES = [
  ...SUGGESTED_CITIES.map((c) => c.tz),
  'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam',
  'Europe/Moscow', 'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg',
  'America/Chicago', 'America/Sao_Paulo', 'America/Mexico_City', 'Pacific/Fiji',
]

function getAllTimeZones() {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return FALLBACK_ZONES
  }
}

// Turns a raw IANA zone id like "Asia/Ho_Chi_Minh" into a readable city
// name ("Ho Chi Minh") and a loose region ("Asia") for display/search.
function formatZoneAsCity(tz) {
  const parts = tz.split('/')
  const cityPart = parts[parts.length - 1].replace(/_/g, ' ')
  const region = parts[0].replace(/_/g, ' ')
  return { label: cityPart, country: region, tz }
}

function loadSavedCities() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    // Guard against corrupted/old-format data
    return Array.isArray(parsed) ? parsed.filter((c) => c && c.tz) : []
  } catch {
    return []
  }
}

function saveCities(cities) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cities))
}

function formatTimeForZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function getHourForZone(date, timeZone) {
  const hourStr = new Intl.DateTimeFormat('en-NZ', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  }).format(date)
  return parseInt(hourStr, 10)
}

function getDayOffsetLabel(date, timeZone) {
  const aucklandDay = new Intl.DateTimeFormat('en-NZ', { timeZone: AUCKLAND_TZ, day: 'numeric' }).format(date)
  const cityDay = new Intl.DateTimeFormat('en-NZ', { timeZone, day: 'numeric' }).format(date)
  if (aucklandDay === cityDay) return null
  return parseInt(cityDay, 10) > parseInt(aucklandDay, 10) || (parseInt(aucklandDay, 10) === 1 && parseInt(cityDay, 10) > 20)
    ? 'Tomorrow'
    : 'Yesterday'
}

function getCallFriendlinessNote(hour) {
  if (hour >= 9 && hour < 21) return { text: 'Good time to call', tone: 'good' }
  if (hour >= 7 && hour < 9) return { text: 'Early morning there', tone: 'ok' }
  if (hour >= 21 && hour < 23) return { text: 'Getting late there', tone: 'ok' }
  return { text: 'Likely asleep', tone: 'poor' }
}

export default function useWorldClock() {
  const [now, setNow] = useState(new Date())
  const [savedCities, setSavedCitiesRaw] = useState(loadSavedCities)
  const [searchTerm, setSearchTerm] = useState('')

  const allZones = useMemo(() => getAllTimeZones(), [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => clearInterval(timer)
  }, [])

  const savedTzSet = useMemo(() => new Set(savedCities.map((c) => c.tz)), [savedCities])

  const addCity = useCallback((city) => {
    setSavedCitiesRaw((prev) => {
      if (prev.some((c) => c.tz === city.tz)) return prev // no duplicates, by timezone
      const next = [...prev, city]
      saveCities(next)
      return next
    })
  }, [])

  const removeCity = useCallback((tz) => {
    setSavedCitiesRaw((prev) => {
      const next = prev.filter((c) => c.tz !== tz)
      saveCities(next)
      return next
    })
  }, [])

  // Search results: matches on city name, region, or raw zone id —
  // covers the full IANA database, not just the curated shortlist.
  // Also checked against SUGGESTED_CITIES' display names directly, since
  // a few common city names (e.g. "Ho Chi Minh") differ from the
  // browser's canonical IANA zone name (e.g. "Asia/Saigon").
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return []

    const fromZoneDb = allZones
      .filter((tz) => tz.toLowerCase().includes(term.replace(/\s+/g, '_')) || tz.toLowerCase().replace(/_/g, ' ').includes(term))
      .map((tz) => {
        const suggested = SUGGESTED_CITIES.find((c) => c.tz === tz)
        return suggested || formatZoneAsCity(tz)
      })

    const fromSuggested = SUGGESTED_CITIES.filter(
      (c) => c.label.toLowerCase().includes(term) || c.country.toLowerCase().includes(term)
    )

    const merged = [...fromSuggested]
    fromZoneDb.forEach((city) => {
      if (!merged.some((c) => c.tz === city.tz)) merged.push(city)
    })

    return merged.slice(0, 40)
  }, [searchTerm, allZones])

  const suggestedToShow = SUGGESTED_CITIES.filter((c) => !savedTzSet.has(c.tz))

  const aucklandTime = formatTimeForZone(now, AUCKLAND_TZ)

  const enrichedSavedCities = savedCities.map((city) => {
    const hour = getHourForZone(now, city.tz)
    return {
      ...city,
      time: formatTimeForZone(now, city.tz),
      dayOffset: getDayOffsetLabel(now, city.tz),
      callNote: getCallFriendlinessNote(hour),
    }
  })

  return {
    aucklandTime,
    savedCities: enrichedSavedCities,
    suggestedToShow,
    searchTerm,
    setSearchTerm,
    searchResults,
    addCity,
    removeCity,
  }
}
