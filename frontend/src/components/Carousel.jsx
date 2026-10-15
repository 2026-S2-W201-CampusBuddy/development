import { useState, useEffect, useRef } from 'react'
import './Carousel.css'

export default function Carousel({ features, onActionClick }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef(null)

  // Swipe support for touch screens
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    setIsPaused(true)
  }
  const handleTouchEnd = (e) => {
    setIsPaused(false)
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(deltaX) < 40) return
    const step = deltaX < 0 ? 1 : -1
    setActiveIndex((prev) => (prev + step + features.length) % features.length)
  }

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [isPaused, features.length])

  const getPositionClass = (cardIndex) => {
    const total = features.length
    const diff = (cardIndex - activeIndex + total) % total
    if (diff === 0) return 'posCenter'
    if (diff === 1 || diff === -(total - 1)) return 'posRight1'
    if (diff === 2 || diff === -(total - 2)) return 'posRight2'
    if (diff === total - 1) return 'posLeft1'
    if (diff === total - 2) return 'posLeft2'
    return 'posHidden'
  }

  return (
    <>
      <section 
        className="carouselStage"
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setIsPaused(true) }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setIsPaused(false) }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {features.map((feature, idx) => (
          <div
            key={feature.id}
            className={`landscapeGlassCard ${getPositionClass(idx)}`}
            onClick={() => setActiveIndex(idx)}
          >
            <div className="cardTopRow">
              <span className="cardCategoryBadge">{feature.badge}</span>
              <span className="cardIconPill">{feature.icon}</span>
            </div>
            <div className="cardBodyContent">
              <h3 className="cardTitle">{feature.title}</h3>
              <p className="cardDescription">{feature.desc}</p>
            </div>
            <div className="cardBottomRow">
              <button
                className="cardActionLink"
                onClick={(e) => {
                  e.stopPropagation()
                  onActionClick()
                }}
              >
                {feature.action}
              </button>
            </div>
          </div>
        ))}
      </section>

      <div className="carouselIndicators">
        {features.map((_, dotIdx) => (
          <button
            key={dotIdx}
            className={`indicatorDot ${dotIdx === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(dotIdx)}
            aria-label={`Go to slide ${dotIdx + 1}`}
          />
        ))}
      </div>
    </>
  )
}