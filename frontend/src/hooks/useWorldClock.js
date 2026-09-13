import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getWorldClockTimes } from '../api'
import ZONE_TO_COUNTRY from './zoneCountryData'

const STORAGE_KEY = 'campusbuddy_world_clock_cities'
const AUCKLAND_TZ = 'Pacific/Auckland'

// A curated shortlist for AUT/Auckland's international student population —
// shown as quick suggestions before the user starts typing a search.
//
// IMPORTANT: several countries only have ONE official timezone for the
// entire country (e.g. all of India uses Asia/Kolkata, all of China uses
// Asia/Shanghai). That means two genuinely different cities below can
// share the same `tz` value on purpose — that is correct, real-world
// behaviour, not a mistake. Because of this, cities must never be treated
// as "the same" just because their tz matches; see `makeCityId` below.
export const SUGGESTED_CITIES = [
  { label: 'Beijing', country: 'China', tz: 'Asia/Shanghai' },
  { label: 'Shanghai', country: 'China', tz: 'Asia/Shanghai' },
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
  { label: 'Melbourne', country: 'Australia', tz: 'Australia/Melbourne' },
  { label: 'Perth', country: 'Australia', tz: 'Australia/Perth' },
  { label: 'Los Angeles', country: 'USA', tz: 'America/Los_Angeles' },
  { label: 'New York', country: 'USA', tz: 'America/New_York' },
  { label: 'Chicago', country: 'USA', tz: 'America/Chicago' },
  { label: 'Toronto', country: 'Canada', tz: 'America/Toronto' },
  { label: 'Vancouver', country: 'Canada', tz: 'America/Vancouver' },
]

// A small fallback list, only used if a browser doesn't support
// Intl.supportedValuesOf (older Safari) — search still works, just
// across fewer zones instead of the full IANA database. This is purely
// for the city SEARCH/PICKER list — it has nothing to do with how the
// live time itself is fetched (that now always goes through our backend).
const FALLBACK_ZONES = [
  ...new Set(SUGGESTED_CITIES.map((c) => c.tz)),
  'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam',
  'Europe/Moscow', 'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg',
  'America/Sao_Paulo', 'America/Mexico_City', 'Pacific/Fiji',
]

function getAllTimeZones() {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return FALLBACK_ZONES
  }
}

// A city's real identity is the COMBINATION of its name and timezone —
// never the timezone alone, since many distinct real cities intentionally
// share one timezone (this is what caused the earlier New Delhi/Mumbai bug).
function makeCityId(label, tz) {
  return `${tz}::${label}`
}

// Turns a raw IANA zone id like "Africa/Accra" into a readable city name
// ("Accra") and its REAL country ("Ghana") — sourced from actual IANA/CLDR
// timezone data (ZONE_TO_COUNTRY), not a guess based on the zone's region
// prefix. Every one of the 418 zones the browser knows about has a real
// country entry here, so search results always show the correct country,
// not "Africa" or "Europe" as a placeholder.
function formatZoneAsCity(tz) {
  const parts = tz.split('/')
  const cityPart = parts[parts.length - 1].replace(/_/g, ' ')
  const country = ZONE_TO_COUNTRY[tz] || parts[0].replace(/_/g, ' ')
  return { label: cityPart, country, tz, id: makeCityId(cityPart, tz) }
}

function withId(city) {
  return { ...city, id: makeCityId(city.label, city.tz) }
}

function loadSavedCities() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((c) => c && c.tz && c.label).map(withId)
  } catch {
    return []
  }
}

function saveCities(cities) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cities))
}

// Converts the API's 24-hour "HH:MM" string into a friendly 12-hour
// display, e.g. "14:30" -> "2:30 pm".
function formatAs12Hour(time24) {
  if (!time24) return '--:--'
  const [hourStr, minuteStr] = time24.split(':')
  const hour = parseInt(hourStr, 10)
  const period = hour >= 12 ? 'pm' : 'am'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${minuteStr} ${period}`
}

function getHour24(time24) {
  if (!time24) return 12
  return parseInt(time24.split(':')[0], 10)
}

// Compares two "MM/DD/YYYY" date strings (as returned by our backend) to
// work out whether a city is a day ahead or behind Auckland right now.
function getDayOffsetLabel(aucklandDate, cityDate) {
  if (!aucklandDate || !cityDate || aucklandDate === cityDate) return null
  const [aMonth, aDay, aYear] = aucklandDate.split('/').map(Number)
  const [cMonth, cDay, cYear] = cityDate.split('/').map(Number)
  const aValue = aYear * 10000 + aMonth * 100 + aDay
  const cValue = cYear * 10000 + cMonth * 100 + cDay
  return cValue > aValue ? 'Tomorrow' : 'Yesterday'
}

function getCallFriendlinessNote(hour) {
  if (hour >= 9 && hour < 21) return { text: 'Good time to call', tone: 'good' }
  if (hour >= 7 && hour < 9) return { text: 'Early morning there', tone: 'ok' }
  if (hour >= 21 && hour < 23) return { text: 'Getting late there', tone: 'ok' }
  return { text: 'Likely asleep', tone: 'poor' }
}

export default function useWorldClock() {
  const [savedCities, setSavedCitiesRaw] = useState(loadSavedCities)
  const [searchTerm, setSearchTerm] = useState('')
  const [liveTimes, setLiveTimes] = useState({}) // tz -> { time, date, dayOfWeek, dstActive, source }
  const [isLoadingTimes, setIsLoadingTimes] = useState(true)
  const [usedFallback, setUsedFallback] = useState(false)
  const isMounted = useRef(true)

  const allZones = useMemo(() => getAllTimeZones(), [])

  const savedIdSet = useMemo(() => new Set(savedCities.map((c) => c.id)), [savedCities])
  // De-duplicated list of timezones actually needed, e.g. if the user has
  // saved both New Delhi and Mumbai, we only need to ask the backend for
  // Asia/Kolkata once.
  const zonesToFetch = useMemo(
    () => [...new Set(savedCities.map((c) => c.tz))],
    [savedCities]
  )

  const fetchLiveTimes = useCallback(() => {
    setIsLoadingTimes(true)
    getWorldClockTimes(zonesToFetch)
      .then((json) => {
        if (!isMounted.current) return
        setLiveTimes(json.data.zones)
        setUsedFallback(json.data.usedFallback)
      })
      .catch(() => {
        // Backend itself unreachable (e.g. Flask not running) — leave
        // whatever times we last had rather than clearing the screen
      })
      .finally(() => {
        if (isMounted.current) setIsLoadingTimes(false)
      })
  }, [zonesToFetch])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    fetchLiveTimes()
    const timer = setInterval(fetchLiveTimes, 1000 * 30) // refresh every 30s
    return () => clearInterval(timer)
  }, [fetchLiveTimes])

  const addCity = useCallback((city) => {
    const cityWithId = withId(city)
    setSavedCitiesRaw((prev) => {
      if (prev.some((c) => c.id === cityWithId.id)) return prev // no duplicates, by city+timezone
      const next = [...prev, cityWithId]
      saveCities(next)
      return next
    })
  }, [])

  const removeCity = useCallback((id) => {
    setSavedCitiesRaw((prev) => {
      const next = prev.filter((c) => c.id !== id)
      saveCities(next)
      return next
    })
  }, [])

  // Search results: matches on city name, real country name, or raw zone
  // id — covers the full IANA database (418 zones, each with its correct
  // country from ZONE_TO_COUNTRY), plus the curated shortlist for names
  // that differ from the browser's canonical zone name (e.g. "Ho Chi Minh"
  // vs the canonical "Asia/Saigon").
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return []

    const fromSuggested = SUGGESTED_CITIES.filter(
      (c) => c.label.toLowerCase().includes(term) || c.country.toLowerCase().includes(term)
    ).map(withId)

    const fromZoneDb = allZones
      .filter((tz) => {
        const cityName = tz.toLowerCase().replace(/_/g, ' ')
        const countryName = (ZONE_TO_COUNTRY[tz] || '').toLowerCase()
        return (
          tz.toLowerCase().includes(term.replace(/\s+/g, '_')) ||
          cityName.includes(term) ||
          countryName.includes(term)
        )
      })
      .map(formatZoneAsCity)

    const merged = [...fromSuggested]
    fromZoneDb.forEach((city) => {
      if (!merged.some((c) => c.id === city.id)) merged.push(city)
    })

    return merged.slice(0, 40)
  }, [searchTerm, allZones])

  const suggestedToShow = SUGGESTED_CITIES.map(withId).filter((c) => !savedIdSet.has(c.id))

  const aucklandData = liveTimes[AUCKLAND_TZ]
  const aucklandTime = aucklandData ? formatAs12Hour(aucklandData.time) : '--:--'
  const aucklandDate = aucklandData ? aucklandData.date : null

  const enrichedSavedCities = savedCities.map((city) => {
    const cityData = liveTimes[city.tz]
    return {
      ...city,
      time: cityData ? formatAs12Hour(cityData.time) : '--:--',
      dayOffset: cityData ? getDayOffsetLabel(aucklandDate, cityData.date) : null,
      callNote: getCallFriendlinessNote(cityData ? getHour24(cityData.time) : 12),
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
    isLoadingTimes,
    usedFallback,
  }
}
