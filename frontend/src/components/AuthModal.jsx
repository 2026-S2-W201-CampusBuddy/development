import { useState } from 'react'
import { registerUser, loginUser, verifyEmail } from '../api'
import './AuthModal.css'

export default function AuthModal({ authMode, onClose, onAuthSuccess, onSwitchMode }) {
  const [step, setStep] = useState('form')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!authMode) return null

  const resetFields = () => {
    setUsername('')
    setEmail('')
    setPassword('')
    setCode('')
    setError('')
    setStep('form')
  }

  const handleClose = () => {
    resetFields()
    onClose()
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (authMode === 'signup') {
        await registerUser(username, email, password)
        setStep('verify')
      } else {
        const result = await loginUser(email, password)
        resetFields()
        onAuthSuccess({ username: result.data.username })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifySubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await verifyEmail(email, code)
      resetFields()
      onSwitchMode('login')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modalBackdrop" onClick={handleClose}>
      <div className="modalDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={handleClose}>✕</button>

        {step === 'form' && (
          <>
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

            <form className="formStack" onSubmit={handleFormSubmit}>
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
                <label className="fieldLabel">Email</label>
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

              {error && <p className="formError">{error}</p>}

              <button type="submit" className="btnGlass btnPrimary btnFullWidth" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Please wait...'
                  : authMode === 'signup'
                  ? 'Create Account →'
                  : 'Sign In →'}
              </button>
            </form>

            <div className="modalFooterSwitch">
              {authMode === 'signup' ? (
                <span>
                  Already have an account?
                  <button className="linkToggle" onClick={() => { resetFields(); onSwitchMode('login') }}>
                    Sign In
                  </button>
                </span>
              ) : (
                <span>
                  First time here?
                  <button className="linkToggle" onClick={() => { resetFields(); onSwitchMode('signup') }}>
                    Create Account
                  </button>
                </span>
              )}
            </div>
          </>
        )}

        {step === 'verify' && (
          <>
            <div className="modalHeader">
              <h2 className="modalHeading">Check your email</h2>
              <p className="modalCaption">
                We sent a 6-digit code to {email}
              </p>
            </div>

            <form className="formStack" onSubmit={handleVerifySubmit}>
              <div className="inputFieldGroup">
                <label className="fieldLabel">Verification Code</label>
                <input
                  type="text"
                  className="liquidInput"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>

              {error && <p className="formError">{error}</p>}

              <button type="submit" className="btnGlass btnPrimary btnFullWidth" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Verify →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}