import { useState, useEffect, useCallback } from 'react'
import { getRentAreas, getRentForArea, getCheapestRentAreas } from '../api'

export default function useRent() {
  const [areas, setAreas] = useState([])
  const [selectedAreaId, setSelectedAreaId] = useState(null)
  const [areaData, setAreaData] = useState(null)
  const [ranking, setRanking] = useState([])
  const [isLiveData, setIsLiveData] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load the area list + cheapest-areas ranking once, up front
  useEffect(() => {
    Promise.all([getRentAreas(), getCheapestRentAreas()])
      .then(([areasJson, cheapestJson]) => {
        setAreas(areasJson.data.areas)
        setIsLiveData(areasJson.data.isLiveData)
        setRanking(cheapestJson.data.ranking)

        // Default to the top pick in the ranking, so the modal opens
        // with something useful already showing
        if (areasJson.data.areas.length > 0) {
          setSelectedAreaId(cheapestJson.data.ranking[0]?.id || areasJson.data.areas[0].id)
        }
      })
      .catch((err) => setError(err.message || 'Could not load rent areas'))
  }, [])

  // Fetch the detail for whichever area is currently selected
  useEffect(() => {
    if (!selectedAreaId) return

    setLoading(true)
    setError('')
    getRentForArea(selectedAreaId)
      .then((json) => setAreaData(json.data))
      .catch((err) => setError(err.message || 'Could not load rent data'))
      .finally(() => setLoading(false))
  }, [selectedAreaId])

  const selectArea = useCallback((areaId) => {
    setSelectedAreaId(areaId)
  }, [])

  return {
    areas,
    selectedAreaId,
    selectArea,
    areaData,
    ranking,
    isLiveData,
    loading,
    error,
  }
}
