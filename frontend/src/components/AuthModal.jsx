import { useState } from 'react'
import { registerUser, loginUser } from '../api'
import './AuthModal.css'

export default function AuthModal({ authMode, onClose, onAuthSuccess, onSwitchMode }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!authMode) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const result = 
        authMode === 'signup'
          ? await registerUser(username, password)
          : await loginUser(username, password)
      onAuthSuccess({username: result.data.username})
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose}>✕</button>

        <div className="modalHeader">
          <h2 className="modalHeading">
            {authMode === 'signup' ? "Let's Sign Up" : "Welcome Back"}
          </h2>
          <p className="modalCaption">
            {authMode === 'signup'
              ? 'Join CampusBuddy with your university email'
              : 'Enter your credentials to access your dashboard'}
          </p>
        </div>

        <form className="formStack" onSubmit={handleSubmit}>
            <div className="inputFieldGroup">
              <label className="fieldLabel">Username</label>
              <input
                type="text"
                className="liquidInput"
                placeholder="e.g. JohnDoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

          
          {authMode === 'signup' && (
          <div className="inputFieldGroup">
            <label className="fieldLabel">University Email</label>
            <input
              type="email"
              className="liquidInput"
              placeholder="student@autuni.ac.nz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          )}

          <div className="inputFieldGroup">
            <label className="fieldLabel">Password</label>
            <input
              type="password"
              className="liquidInput"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="formError">{error}</p>}

          <button type="submit" className="btnGlass btnPrimary btnFullWidth" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : authMode === 'signup' ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="modalFooterSwitch">
          {authMode === 'signup' ? (
            <span>
              Already have an account?
              <button className="linkToggle" onClick={() => onSwitchMode('login')}>
                Sign In
              </button>
            </span>
          ) : (
            <span>
              First time here?
              <button className="linkToggle" onClick={() => onSwitchMode('signup')}>
                Create Account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}