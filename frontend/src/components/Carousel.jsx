import { useState, useEffect } from 'react'
import './Carousel.css'

export default function Carousel({ features }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

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
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
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
              <span>{feature.action}</span>
              <span>Active Showcase</span>
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