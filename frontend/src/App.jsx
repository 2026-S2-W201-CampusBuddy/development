import { useState } from 'react'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import LandingPage from './pages/LandingPage'
import MainPage from './pages/MainPage'

const STORAGE_KEY = 'campusbuddy_logged_user'

function loadSavedUser() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved && typeof saved === 'object' && saved.id ? saved : null
  } catch {
    return null
  }
}

function App() {
  const [loggedUser, setLoggedUser] = useState(loadSavedUser)
  const [currentPage, setCurrentPage] = useState(() => (loadSavedUser() ? 'main' : 'landing'))
  const [authMode, setAuthMode] = useState(null)

  const saveUser = (user) => {
    setLoggedUser(user)
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const handleAuthSuccess = (userData) => {
    saveUser(userData)
    setAuthMode(null)
    setCurrentPage('main')
  }

  const handleLogout = () => {
    saveUser(null)
    setCurrentPage('landing')
  }
  const handleUsernameChanged = (newUsername) => {
    saveUser({ ...loggedUser, username: newUsername })
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