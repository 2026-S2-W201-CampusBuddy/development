import { useState } from 'react'
import './AuthModal.css'

export default function AuthModal({ authMode, onClose, onAuthSuccess, onSwitchMode }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')

  if (!authMode) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onAuthSuccess({ email, username: username || 'Student' })
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
          {authMode === 'signup' && (
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
          )}

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

          <button type="submit" className="btnGlass btnPrimary btnFullWidth">
            {authMode === 'signup' ? 'Create Account →' : 'Sign In →'}
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