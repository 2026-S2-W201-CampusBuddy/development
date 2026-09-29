import { useState } from 'react'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import LandingPage from './pages/LandingPage'
import MainPage from './pages/MainPage'

function App() {
  const [currentPage, setCurrentPage] = useState('landing')
  const [authMode, setAuthMode] = useState(null)

  // Store user object instead of a string to provide user id across components
  // Set a default mock object or null depending on auth state
  const [loggedUser, setLoggedUser] = useState({ id: 1, username: 'John Doe', email: 'john@example.com' })

  const handleAuthSuccess = (userData) => {
    // userData is now { id: 1, username: "..." }
    setLoggedUser(userData)
    setAuthMode(null)
    setCurrentPage('main')
  }

  // Handle logout: clear user state and return to landing
  const handleLogout = () => {
    setLoggedUser(null)
    setCurrentPage('landing')
  }

  return (
    <div className="liquidViewport">
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onOpenAuth={setAuthMode}
        onLogout={handleLogout}
        // Pass username string to Navbar for display
        loggedUser={loggedUser?.username || loggedUser}
      />

      {currentPage === 'landing' ? (
        <LandingPage />
      ) : (
        <MainPage loggedUser={loggedUser} />
      )}

      <AuthModal
        authMode={authMode}
        onClose={() => setAuthMode(null)}
        onAuthSuccess={handleAuthSuccess}
        onSwitchMode={setAuthMode}
      />
    </div>
  )
}

export default App