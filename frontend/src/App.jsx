import { useState } from 'react'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import LandingPage from './pages/LandingPage'
import MainPage from './pages/MainPage'

// Older versions saved the login in localStorage, which kept people signed in
// forever. Clear that old value (safe to delete this block later).
try {
  localStorage.removeItem('campusbuddy_logged_user')
} catch {
  // storage unavailable
}

// The login is kept in sessionStorage: it survives a page reload, but a new
// visit (new tab, or after the browser is closed) starts on the landing page.
const SESSION_KEY = 'campusbuddy_session_user'

function loadSessionUser() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    return saved && typeof saved === 'object' && saved.id ? saved : null
  } catch {
    return null
  }
}

function saveSessionUser(user) {
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // storage unavailable: the login just won't survive a reload
  }
}

function App() {
  const [loggedUser, setLoggedUser] = useState(loadSessionUser)
  const [currentPage, setCurrentPage] = useState(() => (loadSessionUser() ? 'main' : 'landing'))
  const [authMode, setAuthMode] = useState(null)

  const handleAuthSuccess = (userData) => {
    setLoggedUser(userData)
    saveSessionUser(userData)
    setAuthMode(null)
    setCurrentPage('main')
  }

  const handleLogout = () => {
    setLoggedUser(null)
    saveSessionUser(null)
    setCurrentPage('landing')
  }

  const handleUsernameChanged = (newUsername) => {
    const updated = { ...loggedUser, username: newUsername }
    setLoggedUser(updated)
    saveSessionUser(updated)
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