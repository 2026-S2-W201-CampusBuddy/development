import { useState } from 'react'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import LandingPage from './pages/LandingPage'
import MainPage from './pages/MainPage'

function App() {
  const [currentPage, setCurrentPage] = useState('landing')
  const [authMode, setAuthMode] = useState(null)
  const [loggedUser, setLoggedUser] = useState('John Doe')

  const handleAuthSuccess = (userData) => {
    setLoggedUser(userData.username)
    setAuthMode(null)
    setCurrentPage('main')
  }

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
        loggedUser={loggedUser}
      />

      {currentPage === 'landing' ? (
        <LandingPage />
      ) : (
        <MainPage
          loggedUser={loggedUser}
          onUsernameChanged={setLoggedUser}
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