import './RentModal.css'

export default function RentModal({
  isOpen,
  onClose,
  areas,
  selectedAreaId,
  selectArea,
  areaData,
  ranking,
  isLiveData,
  loading,
  error,
}) {
  if (!isOpen) return null

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog rentDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose}>✕</button>

        <div className="modalHeader">
          <h2 className="modalHeading">Auckland Rent Guide</h2>
          <p className="modalCaption">
            Median weekly rent by suburb, from Tenancy Services bond data
          </p>
        </div>

        {!isLiveData && (
          <div className="rentDataBadge">
            📊 Estimated figures — live Tenancy Services API access is pending approval
          </div>
        )}

        {ranking.length > 0 && (
          <div className="rentRankingSection">
            <span className="rentSectionLabel">Cheapest picks for students</span>
            <div className="rentRankingList">
              {ranking.map((area, index) => (
                <button
                  key={area.id}
                  className={`rentRankingChip ${selectedAreaId === area.id ? 'rentRankingChipActive' : ''}`}
                  onClick={() => selectArea(area.id)}
                >
                  <span className="rentRankingIndex">{index + 1}</span>
                  <span className="rentRankingLabel">{area.label}</span>
                  <span className="rentRankingPrice">${area.cheapestMedian}/wk</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rentAreaSelectRow">
          <span className="rentSectionLabel">Or browse any suburb</span>
          <select
            className="rentAreaSelect"
            value={selectedAreaId || ''}
            onChange={(e) => selectArea(e.target.value)}
          >
            {areas.map((area) => (
              <option key={area.id} value={area.id}>{area.label}</option>
            ))}
          </select>
        </div>

        {loading && <p className="weatherStatusText">Loading rent data...</p>}
        {!loading && error && <p className="weatherStatusText">{error}</p>}

        {!loading && !error && areaData && (
          <>
            <div className="rentTableWrap">
              <table className="rentTable">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Beds</th>
                    <th>Low</th>
                    <th>Median</th>
                    <th>High</th>
                  </tr>
                </thead>
                <tbody>
                  {areaData.entries.map((entry, i) => (
                    <tr key={i}>
                      <td>{entry.dwellingType}</td>
                      <td>{entry.bedrooms}</td>
                      <td>${entry.lq}</td>
                      <td className="rentTableMedian">${entry.med}</td>
                      <td>${entry.uq}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="rentPeriodNote">Reporting period: {areaData.period}</p>

            <div className="weatherTipBanner">
              <span className="weatherTipIcon">🏠</span>
              <span>{areaData.cheapestTip}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
