import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getWorldClockTimes, searchWorldClockCities } from '../api'

const STORAGE_KEY = 'campusbuddy_world_clock_cities'
const AUCKLAND_TZ = 'Pacific/Auckland'
const SEARCH_DEBOUNCE_MS = 300

// A curated shortlist for AUT/Auckland's international student population —
// shown as quick suggestions before the user starts typing a search.
// Searching any OTHER city now goes through the backend's GeoNames-backed
// search (see searchWorldClockCities in api.js), which covers every real
// city worldwide with population 15,000+ — not just this shortlist.
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

// A city's real identity is the COMBINATION of its name and timezone —
// never the timezone alone, since many distinct real cities intentionally
// share one timezone (e.g. all of India uses Asia/Kolkata).
function makeCityId(label, tz) {
  return `${tz}::${label}`
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

// Computes a city's time RIGHT NOW using the browser's own timezone
// database — zero network latency. Used the instant a city is added, so
// it appears immediately instead of showing "--:--" until the next live
// API refresh completes. The periodic backend refresh (every 30s) then
// reconciles with the authoritative live-API time in the background; the
// two should always agree, since both ultimately reflect the same real
// time for that zone.
function computeInstantTimeData(tz) {
  try {
    const now = new Date()
    const time = new Intl.DateTimeFormat('en-NZ', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(now)
    const date = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, month: '2-digit', day: '2-digit', year: 'numeric',
    }).format(now)
    return { tz, time, date, source: 'instant' }
  } catch {
    return null
  }
}

export default function useWorldClock() {
  const [savedCities, setSavedCitiesRaw] = useState(loadSavedCities)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [liveTimes, setLiveTimes] = useState({}) // tz -> { time, date, dayOfWeek, dstActive, source }
  const [isLoadingTimes, setIsLoadingTimes] = useState(true)
  const [usedFallback, setUsedFallback] = useState(false)
  const isMounted = useRef(true)
  const searchDebounceRef = useRef(null)
  const searchRequestIdRef = useRef(0)

  const savedIdSet = useMemo(() => new Set(savedCities.map((c) => c.id)), [savedCities])
  const zonesToFetch = useMemo(
    () => [...new Set(savedCities.map((c) => c.tz))],
    [savedCities]
  )

  const fetchLiveTimes = useCallback(() => {
    setIsLoadingTimes(true)
    getWorldClockTimes(zonesToFetch)
      .then((json) => {
        if (!isMounted.current) return
        // Merge rather than replace: keeps any "instant" client-computed
        // times visible until the live-API values for them arrive, instead
        // of briefly wiping everything on every refresh cycle.
        setLiveTimes((prev) => ({ ...prev, ...json.data.zones }))
        setUsedFallback(json.data.usedFallback)
      })
      .catch(() => {
        // Backend itself unreachable — leave whatever times we last had
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
    const timer = setInterval(fetchLiveTimes, 1000 * 30)
    return () => clearInterval(timer)
  }, [fetchLiveTimes])

  const addCity = useCallback((city) => {
    const cityWithId = withId(city)

    // Show a real, correct time for this city IMMEDIATELY — computed
    // right here in the browser, no network round trip — so there's no
    // visible delay before the user sees a time appear.
    const instant = computeInstantTimeData(cityWithId.tz)
    if (instant) {
      setLiveTimes((prev) => ({ ...prev, [cityWithId.tz]: instant }))
    }

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

  // Debounced backend search — waits for the user to pause typing before
  // calling the GeoNames-backed endpoint, so every keystroke doesn't fire
  // a separate request. searchRequestIdRef guards against an older, slower
  // request overwriting a newer one's results if they resolve out of order.
  useEffect(() => {
    const term = searchTerm.trim()

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)

    if (!term) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const thisRequestId = ++searchRequestIdRef.current

    searchDebounceRef.current = setTimeout(() => {
      searchWorldClockCities(term)
        .then((json) => {
          if (!isMounted.current) return
          if (thisRequestId !== searchRequestIdRef.current) return // a newer search superseded this one
          setSearchResults(json.data.results.map(withId))
        })
        .catch(() => {
          if (isMounted.current && thisRequestId === searchRequestIdRef.current) {
            setSearchResults([])
          }
        })
        .finally(() => {
          if (isMounted.current && thisRequestId === searchRequestIdRef.current) {
            setIsSearching(false)
          }
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchTerm])

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
    isSearching,
    addCity,
    removeCity,
    isLoadingTimes,
    usedFallback,
  }
}
