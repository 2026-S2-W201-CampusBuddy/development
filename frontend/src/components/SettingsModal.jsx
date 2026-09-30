import { useState, useEffect } from 'react'
import { changeUsername, changePassword, deleteAccount, updateNotifications, getUserLocation, updateUserLocation } from '../api'
import './SettingsModal.css'

export default function SettingsModal({ isOpen, onClose, currentUser, onUsernameChanged, onLogout }) {
  const [view, setView] = useState('menu') 

  const [newUsername, setNewUsername] = useState('')
  const [currentPasswordForUsername, setCurrentPasswordForUsername] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [location, setLocation] = useState('')
  const [currentPasswordForDelete, setCurrentPasswordForDelete] = useState('')

  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setView('menu')
      setError('')
      setMessage('')
      getUserLocation(currentUser).then((json) => setLocation(json.preferred_location || '')).catch(() => {})
    }
  }, [isOpen, currentUser])

  if (!isOpen) return null

  const resetFormFields = () => {
    setNewUsername('')
    setCurrentPasswordForUsername('')
    setCurrentPassword('')
    setNewPassword('')
    setCurrentPasswordForDelete('')
    setError('')
    setMessage('')
  }

  const handleChangeUsername = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const result = await changeUsername(currentUser, currentPasswordForUsername, newUsername)
      onUsernameChanged(result.data.username)
      resetFormFields()
      setView('menu')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await changePassword(currentUser, currentPassword, newPassword)
      resetFormFields()
      setMessage('Password updated')
      setView('menu')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveLocation = async () => {
    setError('')
    try {
      await updateUserLocation(currentUser, location)
      setMessage('Location saved')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleToggleNotifications = async () => {
    const newValue = !notificationsEnabled
    setNotificationsEnabled(newValue) // optimistic update
    try {
      await updateNotifications(currentUser, newValue)
    } catch (err) {
      setNotificationsEnabled(!newValue) // revert on failure
      setError(err.message)
    }
  }

  const handleDeleteAccount = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await deleteAccount(currentUser, currentPasswordForDelete)
      onClose()
      onLogout()
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

        {view === 'menu' && (
          <>
            <div className="modalHeader">
              <h2 className="modalHeading">Settings</h2>
            </div>

            {message && <p className="formSuccess">{message}</p>}

            <div className="settingsMenuList">
              <button className="settingsMenuItem" onClick={() => { resetFormFields(); setView('username') }}>
                Change Username
              </button>
              <button className="settingsMenuItem" onClick={() => { resetFormFields(); setView('password') }}>
                Change Password
              </button>
              <button className="settingsMenuItem" onClick={() => { resetFormFields(); setView('location') }}>
                Preferred Location
              </button>

              <div className="settingsMenuItem settingsToggleRow">
                <span>Notifications</span>
                <button
                  type="button"
                  className={`toggleSwitch ${notificationsEnabled ? 'on' : ''}`}
                  onClick={handleToggleNotifications}
                  aria-label="Toggle notifications"
                />
              </div>

              <button className="settingsMenuItem dangerItem" onClick={() => { resetFormFields(); setView('delete') }}>
                Delete Account
              </button>

              <button className="settingsMenuItem" onClick={onLogout}>
                Log Out
              </button>
            </div>
          </>
        )}

        {view === 'username' && (
          <>
            <div className="modalHeader">
              <button className="communityBackLink" onClick={() => setView('menu')}>← Back</button>
              <h2 className="modalHeading">Change Username</h2>
            </div>
            <form className="formStack" onSubmit={handleChangeUsername}>
              <div className="inputFieldGroup">
                <label className="fieldLabel">New Username</label>
                <input type="text" className="liquidInput" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
              </div>
              <div className="inputFieldGroup">
                <label className="fieldLabel">Current Password</label>
                <input type="password" className="liquidInput" value={currentPasswordForUsername} onChange={(e) => setCurrentPasswordForUsername(e.target.value)} required />
              </div>
              {error && <p className="formError">{error}</p>}
              <button type="submit" className="btnGlass btnPrimary btnFullWidth" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </form>
          </>
        )}

        {view === 'password' && (
          <>
            <div className="modalHeader">
              <button className="communityBackLink" onClick={() => setView('menu')}>← Back</button>
              <h2 className="modalHeading">Change Password</h2>
            </div>
            <form className="formStack" onSubmit={handleChangePassword}>
              <div className="inputFieldGroup">
                <label className="fieldLabel">Current Password</label>
                <input type="password" className="liquidInput" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="inputFieldGroup">
                <label className="fieldLabel">New Password</label>
                <input type="password" className="liquidInput" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              {error && <p className="formError">{error}</p>}
              <button type="submit" className="btnGlass btnPrimary btnFullWidth" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </form>
          </>
        )}

        {view === 'location' && (
          <>
            <div className="modalHeader">
              <button className="communityBackLink" onClick={() => setView('menu')}>← Back</button>
              <h2 className="modalHeading">Preferred Location</h2>
            </div>
            <div className="formStack">
              <div className="inputFieldGroup">
                <label className="fieldLabel">Location</label>
                <input type="text" className="liquidInput" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Auckland CBD" />
              </div>
              {error && <p className="formError">{error}</p>}
              {message && <p className="formSuccess">{message}</p>}
              <button type="button" className="btnGlass btnPrimary btnFullWidth" onClick={handleSaveLocation}>
                Save
              </button>
            </div>
          </>
        )}

        {view === 'delete' && (
          <>
            <div className="modalHeader">
              <button className="communityBackLink" onClick={() => setView('menu')}>← Back</button>
              <h2 className="modalHeading">Delete Account</h2>
              <p className="modalCaption">This can't be undone.</p>
            </div>
            <form className="formStack" onSubmit={handleDeleteAccount}>
              <div className="inputFieldGroup">
                <label className="fieldLabel">Current Password</label>
                <input type="password" className="liquidInput" value={currentPasswordForDelete} onChange={(e) => setCurrentPasswordForDelete(e.target.value)} required />
              </div>
              {error && <p className="formError">{error}</p>}
              <button type="submit" className="btnGlass btnFullWidth dangerBtn" disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Delete My Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}