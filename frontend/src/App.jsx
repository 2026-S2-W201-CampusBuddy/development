import { useState } from 'react'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import LandingPage from './pages/LandingPage'
import MainPage from './pages/MainPage'

function App() {
  const [currentPage, setCurrentPage] = useState('landing')
  const [authMode, setAuthMode] = useState(null)
  const [loggedUser, setLoggedUser] = useState(null) // Safe default

  const handleAuthSuccess = (userData) => {
    setLoggedUser(userData)
    setAuthMode(null)
    setCurrentPage('main')
  }

  const handleLogout = () => {
    setLoggedUser(null)
    setCurrentPage('landing')
  }

  // --- ADD THIS FUNCTION: Update username while preserving user id object structure ---
  const handleUsernameChanged = (newUsername) => {
    setLoggedUser((prev) => {
      if (typeof prev === 'object' && prev !== null) {
        return { ...prev, username: newUsername }
      }
      return { username: newUsername }
    })
  }
  // -----------------------------------------------------------------------------------

  return (
    <div className="liquidViewport">
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onOpenAuth={setAuthMode}
        onLogout={handleLogout}
        loggedUser={loggedUser?.username || (typeof loggedUser === 'string' ? loggedUser : '')}
      />

      {currentPage === 'landing' ? (
        <LandingPage />
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