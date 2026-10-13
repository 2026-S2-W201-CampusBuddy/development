import { useState } from 'react'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import LandingPage from './pages/LandingPage'
import MainPage from './pages/MainPage'

// Earlier versions of CampusBuddy remembered the logged-in user in the browser,
// which made the site open straight into the account. Login now lives only in
// memory, so every fresh visit starts on the landing page. This clears any
// login saved by the older version (safe to delete this block later).
try {
  localStorage.removeItem('campusbuddy_logged_user')
} catch {
  // storage unavailable — nothing to clean up
}

function App() {
  const [loggedUser, setLoggedUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('landing')
  const [authMode, setAuthMode] = useState(null)

  const handleAuthSuccess = (userData) => {
    setLoggedUser(userData)
    setAuthMode(null)
    setCurrentPage('main')
  }

  const handleLogout = () => {
    setLoggedUser(null)
    setCurrentPage('landing')
  }

  const handleUsernameChanged = (newUsername) => {
    setLoggedUser((user) => ({ ...user, username: newUsername }))
  }

  return (
    <div className="liquidViewport">
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onOpenAuth={setAuthMode}
        onLogout={handleLogout}
        loggedUser={loggedUser?.username || ''}
      />

      {currentPage === 'landing' ? (
        <LandingPage onOpenAuth={setAuthMode} />
      ) : (
        <MainPage
          loggedUser={loggedUser}
          onUsernameChanged={handleUsernameChanged}
          onLogout={handleLogout}
        />
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
