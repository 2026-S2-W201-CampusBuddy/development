import Carousel from '../components/Carousel'
import './LandingPage.css'

export default function LandingPage() {
  const showcaseFeatures = [
    { id: 0, badge: 'Interactive Map', icon: '📍', title: 'Campus 3D Navigator', desc: 'Explore Auckland City Campus with real-time navigation.', action: 'Launch 3D Map →' },
    { id: 1, badge: 'Student Feed', icon: '💬', title: 'Peer Community Hub', desc: 'Join study squads and campus social updates in real time.', action: 'View Discussions →' },
    { id: 2, badge: 'Campus Perks', icon: '🥤', title: 'Smart Marketplace', desc: 'Exclusive discounts on student groceries and textbooks.', action: 'Browse Perks →' },
    { id: 3, badge: 'Timetable Sync', icon: '📅', title: 'Adaptive Timetable', desc: 'Sync lecture schedules and room locations in one place.', action: 'Check Calendar →' },
    { id: 4, badge: 'Live Weather', icon: '⛅', title: 'Weather & Status', desc: 'Live temperature, rain alerts, and campus shuttle tracking.', action: 'Current Status →' }
  ]

  return (
    <main className="heroWrapper">
      <div className="heroPillBadge">
        <span>✨</span> Next-Gen Student Experience
      </div>

      <h1 className="heroHeading">
        Kia Ora, <span>Welcome to CampusBuddy</span>
      </h1>
      <p className="heroSubheading">
        Your all-in-one ecosystem for navigation, community collaboration, timetables, and campus life.
      </p>

      <Carousel features={showcaseFeatures} />
    </main>
  )
}