import { useState } from 'react'
import './BubbleHub.css'

export default function BubbleHub({ honeycombRows, liveTime }) {
  const [hoveredCoords, setHoveredCoords] = useState(null)

  const getRepulsionOffset = (rowIdx, colIdx, rowLength) => {
    if (!hoveredCoords) return { pushX: '0px', pushY: '0px' }

    const rowOffset = (5 - rowLength) * 0.5
    const currX = colIdx + rowOffset
    const currY = rowIdx

    const targetRowOffset = (5 - hoveredCoords.rowLength) * 0.5
    const targetX = hoveredCoords.colIdx + targetRowOffset
    const targetY = hoveredCoords.rowIdx

    const dx = currX - targetX
    const dy = currY - targetY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 0 && distance < 1.6) {
      const force = (1.6 - distance) * 22
      const angle = Math.atan2(dy, dx)
      const pushX = Math.cos(angle) * force
      const pushY = Math.sin(angle) * force
      return { pushX: `${pushX.toFixed(1)}px`, pushY: `${pushY.toFixed(1)}px` }
    }

    return { pushX: '0px', pushY: '0px' }
  }

  const getFisheyeBaseScale = (rowIdx, colIdx, rowLength) => {
    const rowOffset = (5 - rowLength) * 0.5
    const posX = colIdx + rowOffset - 2
    const posY = rowIdx - 2

    const distanceFromCenter = Math.sqrt(posX * posX + posY * posY)

    if (distanceFromCenter < 0.5) return 1.08
    if (distanceFromCenter < 1.3) return 0.95
    return 0.82
  }

  return (
    <section className="honeycombContainer" onMouseLeave={() => setHoveredCoords(null)}>
      {honeycombRows.map((row, rowIdx) => (
        <div key={rowIdx} className="honeycombRow">
          {row.map((bubble, colIdx) => {
            const isHovered = hoveredCoords?.id === bubble.id
            const { pushX, pushY } = getRepulsionOffset(rowIdx, colIdx, row.length)
            const baseScale = getFisheyeBaseScale(rowIdx, colIdx, row.length)

            return (
              <div
                key={bubble.id}
                className={`watchOrb ${isHovered ? 'isHoveredOrb' : ''}`}
                style={{
                  '--accentColor': bubble.accentColor,
                  '--glowColor': bubble.glowColor,
                  '--baseScale': baseScale,
                  '--pushX': pushX,
                  '--pushY': pushY
                }}
                onMouseEnter={() => setHoveredCoords({ id: bubble.id, rowIdx, colIdx, rowLength: row.length })}
                onClick={bubble.action}
              >
                {bubble.isClock ? (
                  <>
                    <span className="clockOrbTime">{liveTime}</span>
                    <span className="orbLabel">{bubble.label}</span>
                  </>
                ) : (
                  <>
                    <span className="orbIcon">{bubble.icon}</span>
                    <span className="orbLabel">{bubble.label}</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </section>
  )
}