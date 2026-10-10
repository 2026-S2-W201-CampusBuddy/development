import Carousel from '../components/Carousel'
import './LandingPage.css'

export default function LandingPage({ onOpenAuth }) {
  const showcaseFeatures = [
    { id: 0, badge: 'Interactive Map', icon: '📍', title: 'Campus 3D Navigator', desc: 'Explore AUT Campus in rich detail \.', action: 'Launch 3D Map →' },
    { id: 1, badge: 'Community', icon: '💬', title: 'Community Hub', desc: 'Discuss important student topics with your peers.', action: 'View Discussions →' },
    { id: 2, badge: 'Currency Exchange', icon: '💱', title: 'Currency Exchange', desc: 'Exchange international currency rates.', action: 'Convert currencies →' },
    { id: 3, badge: 'Rental Info', icon: '🏠', title: 'Rental Information', desc: 'View auckland rental prices at a glance.', action: 'View Rentals →' },
    { id: 4, badge: 'Live Weather', icon: '⛅', title: 'Weather', desc: 'Check live auckland weather conditions.', action: 'Current Weather →' }
  ]

  return (
    <main className="heroWrapper">
      <div className="heroPillBadge">
        <span>✨</span> A CampusBuddy for the Students of Today.
      </div>

      <h1 className="heroHeading">
        Kia Ora, <span>Welcome to CampusBuddy</span>
      </h1>
      <p className="heroSubheading">
        SDP Semester 2 2026
      </p>

      <Carousel features={showcaseFeatures} onActionClick={() => onOpenAuth('login')} />
    </main>
  )
}