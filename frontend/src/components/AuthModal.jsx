import { useState, useEffect } from 'react'
import { registerUser, loginUser, verifyEmail, resendCode } from '../api'
import './AuthModal.css'

const PENDING_KEY = 'campusbuddy_pending_verification_email'

export default function AuthModal({ authMode, onClose, onAuthSuccess, onSwitchMode }) {
  const [step, setStep] = useState('form') // 'form' | 'verify'

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isTermsExpanded, setIsTermsExpanded] = useState(false)

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  const pendingEmail = localStorage.getItem(PENDING_KEY)

  if (!authMode) return null

  const resetFields = () => {
    setUsername('')
    setEmail('')
    setPassword('')
    setCode('')
    setError('')
    setResendMessage('')
    setStep('form')
    setAgreedToTerms(false)
    setIsTermsExpanded(false)
  }

  const handleClose = () => {
    resetFields()
    onClose()
  }

  const goToVerifyForPendingEmail = () => {
    setEmail(pendingEmail)
    setError('')
    setStep('verify')
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (authMode === 'signup') {
        if (!agreedToTerms) {
          setError('You must agree to the Terms and Conditions to create an account')
          setIsSubmitting(false)
          return
        }
        await registerUser(username, email, password, agreedToTerms)
        localStorage.setItem(PENDING_KEY, email) // remember it in case they close out
        setStep('verify')
      } else {
        const result = await loginUser(email, password)
        resetFields()
        onAuthSuccess(result.data)
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
      localStorage.removeItem(PENDING_KEY) // done — clear the "still pending" flag
      resetFields()
      onSwitchMode('login')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setResendMessage('')
    try {
      await resendCode(email)
      setResendMessage('New code sent — check your email')
    } catch (err) {
      setError(err.message)
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

            {authMode === 'login' && pendingEmail && (
              <button className="pendingVerifyBanner" onClick={goToVerifyForPendingEmail}>
                Still need to verify {pendingEmail}? Tap here →
              </button>
            )}

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

              {authMode === 'signup' && (
                <div className="termsGroup">
                  <label className="termsCheckboxRow">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                    />
                    <span>
                      I agree to the{' '}
                      <button
                        type="button"
                        className="linkToggle termsReadLink"
                        onClick={() => setIsTermsExpanded((prev) => !prev)}
                      >
                        Terms and Conditions
                      </button>
                    </span>
                  </label>

                  {isTermsExpanded && (
                    <div className="termsTextBox">
                      <p>
                        By creating a CampusBuddy account, you agree that content you post —
                        including Community posts, comments, and Peer Review ratings and
                        comments — may be visible to other members of the relevant group
                        or community. Peer Review ratings and comments are visible to every
                        member of the group they're submitted under.
                      </p>
                      <p>
                        Your email is used only for account verification and essential
                        account-related messages. You are responsible for keeping your
                        login details secure and for the accuracy of what you post.
                        CampusBuddy is a university student project and is provided as-is,
                        without warranty.
                      </p>
                    </div>
                  )}
                </div>
              )}

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
              <p className="modalCaption">We sent a 6-digit code to {email}</p>
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
              {resendMessage && <p className="formSuccess">{resendMessage}</p>}

              <button type="submit" className="btnGlass btnPrimary btnFullWidth" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Verify →'}
              </button>

              <button type="button" className="linkToggle resendLink" onClick={handleResend}>
                Didn't get a code? Resend
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}