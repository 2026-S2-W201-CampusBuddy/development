import React, { useState, useEffect } from 'react'
import './FriendsModal.css'

export default function FriendsModal({ isOpen, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('search') // 'search', 'requests', 'friends'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [friendsList, setFriendsList] = useState([])
  
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('info') // 'info' | 'error' | 'success'
  const [friendToRemove, setFriendToRemove] = useState(null)

  // Safely extract current user ID from multiple possible structures
  const currentUserId = 
    currentUser?.id || 
    currentUser?.user_id || 
    currentUser?.data?.id || 
    currentUser?.data?.user_id

  // Fetch count and lists whenever modal opens or current user changes
  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchPendingRequests()
      fetchFriendsList()
    }
  }, [isOpen, currentUserId])

  // Also refresh specific lists when active tab changes if needed
  useEffect(() => {
    if (isOpen && currentUserId) {
      if (activeTab === 'requests') fetchPendingRequests()
      if (activeTab === 'friends') fetchFriendsList()
    }
  }, [activeTab])

  const showAlert = (msg, type = 'info') => {
    setAlertMessage(msg)
    setAlertType(type)
    setTimeout(() => setAlertMessage(''), 4000)
  }

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    // Safely append user_id query parameter
    const params = new URLSearchParams({ q: searchQuery.trim() })
    if (currentUserId) {
      params.append('user_id', currentUserId)
    }

    try {
      const res = await fetch(`/api/users/search?${params.toString()}`)
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Search request failed:', err)
    }
  }

  const handleSendRequest = async (receiverId) => {
    // Guard against missing sender id
    if (!currentUserId) {
      showAlert('User session not found. Please log in again.', 'error')
      return
    }

    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sender_id: Number(currentUserId), 
          receiver_id: Number(receiverId) 
        })
      })
      const data = await res.json()

      if (!res.ok) {
        showAlert(data.message || 'Error sending request', 'error')
      } else {
        showAlert('Friend request sent!', 'success')
        // Optimistically update the UI to pending
        setSearchResults((prev) =>
          prev.map((item) => (item.id === receiverId ? { ...item, status: 'pending_sent' } : item))
        )
      }
    } catch (err) {
      showAlert('Failed to send request', 'error')
    }
  }

  const fetchPendingRequests = async () => {
    if (!currentUserId) return
    try {
      const res = await fetch(`/api/friends/requests/pending?user_id=${currentUserId}`)
      const data = await res.json()
      setPendingRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    }
  }

  // When accepting/declining request, refresh both requests and friends list
  const handleRespond = async (requestId, action) => {
    try {
      await fetch(`/api/friends/request/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      showAlert(`Request ${action === 'accept' ? 'accepted' : 'declined'}`, 'success')
      // Refresh both lists immediately
      fetchPendingRequests()
      fetchFriendsList()
    } catch (err) {
      console.error(err)
    }
  }

  const fetchFriendsList = async () => {
    if (!currentUserId) return
    try {
      const res = await fetch(`/api/friends?user_id=${currentUserId}`)
      const data = await res.json()
      setFriendsList(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    }
  }

  // When removing a friend, refresh both list and requests count
  const confirmRemoveFriend = async () => {
    if (!friendToRemove || !currentUserId) return
    try {
      await fetch(`/api/friends/${friendToRemove.id}?user_id=${currentUserId}`, {
        method: 'DELETE'
      })
      showAlert('Friend removed', 'info')
      setFriendToRemove(null)
      fetchFriendsList()
    } catch (err) {
      console.error(err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="friendsModalOverlay">
      <div className="hubModalDialog friendsModalContainer">
        <button className="modalCloseBtn" onClick={onClose}>✕</button>
        
        <div className="hubModalBody friendsBodyLayout">
          {/* Header */}
          <div className="friendsHeader">
            <h2>👥 Friends Hub</h2>
            <p className="friendsSubHeader">Connect and manage your campus friends</p>
          </div>

          {/* Navigation Tabs */}
          <div className="friendsPillTabs">
            <button 
              className={`pillTab ${activeTab === 'search' ? 'active' : ''}`} 
              onClick={() => setActiveTab('search')}
            >
              <span>🔍</span> Search Users
            </button>
            <button 
              className={`pillTab ${activeTab === 'requests' ? 'active' : ''}`} 
              onClick={() => setActiveTab('requests')}
            >
              <span>📩</span> Requests
              {pendingRequests.length > 0 && <span className="tabBadge">{pendingRequests.length}</span>}
            </button>
            <button 
              className={`pillTab ${activeTab === 'friends' ? 'active' : ''}`} 
              onClick={() => setActiveTab('friends')}
            >
              <span>👥</span> My Friends
              <span className="tabBadge neutral">{friendsList.length}</span>
            </button>
          </div>

          {/* Alert Toast */}
          {alertMessage && (
            <div className={`friendsToast ${alertType}`}>
              <span>{alertType === 'error' ? '⚠️' : '✨'}</span>
              <span>{alertMessage}</span>
            </div>
          )}

          {/* Main Content Area */}
          <div className="friendsTabContainer">
            {/* Tab 1: Search */}
            {activeTab === 'search' && (
              <div className="tabPane">
                <form onSubmit={handleSearch} className="stylishSearchBox">
                  <span className="searchIcon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by username (e.g. George)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="btnGlow">Search</button>
                </form>

                {/* Search Results Card Grid */}
                <div className="cardGrid">
                  {searchResults.length === 0 ? (
                    <div className="emptyState">
                      <p>Type a name above to search for classmates.</p>
                    </div>
                  ) : (
                    searchResults.map((u) => (
                      <div key={u.id} className="modernUserCard">
                        <div className="userInfo">
                          <div className="userAvatar">{u.username.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="userName">{u.username}</div>
                            <div className="userEmail">{u.email}</div>
                          </div>
                        </div>

                        {/* Dynamic Action Button depending on friendship status */}
                        <div className="userCardAction">
                          {u.status === 'friends' && (
                            <button className="btnAction statusBadge friendBadge" disabled>
                              ✓ Friends
                            </button>
                          )}

                          {u.status === 'pending_sent' && (
                            <button className="btnAction statusBadge pendingBadge" disabled>
                              ⏳ Pending...
                            </button>
                          )}

                          {u.status === 'pending_received' && (
                            <button 
                              className="btnAction warning" 
                              onClick={() => setActiveTab('requests')}
                            >
                              Respond
                            </button>
                          )}

                          {(!u.status || u.status === 'none') && (
                            <button 
                              className="btnAction primary" 
                              onClick={() => handleSendRequest(u.id)}
                            >
                              Add Friend
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Requests */}
            {activeTab === 'requests' && (
              <div className="tabPane">
                <div className="cardGrid">
                  {pendingRequests.length === 0 ? (
                    <div className="emptyState">
                      <p>No pending friend requests.</p>
                    </div>
                  ) : (
                    pendingRequests.map((req) => (
                      <div key={req.request_id} className="modernUserCard">
                        <div className="userInfo">
                          <div className="userAvatar pending">📩</div>
                          <div>
                            <div className="userName">{req.sender_username}</div>
                            <div className="userEmail">Sent you a friend request</div>
                          </div>
                        </div>
                        <div className="cardActions">
                          <button className="btnAction success" onClick={() => handleRespond(req.request_id, 'accept')}>
                            Accept
                          </button>
                          <button className="btnAction danger" onClick={() => handleRespond(req.request_id, 'decline')}>
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Friends List */}
            {activeTab === 'friends' && (
              <div className="tabPane">
                <div className="cardGrid">
                  {friendsList.length === 0 ? (
                    <div className="emptyState">
                      <p>You haven't added any friends yet.</p>
                    </div>
                  ) : (
                    friendsList.map((f) => (
                      <div key={f.id} className="modernUserCard">
                        <div className="userInfo">
                          <div className="userAvatar friend">👤</div>
                          <div>
                            <div className="userName">{f.username}</div>
                            <div className="userEmail">Connected Friend</div>
                          </div>
                        </div>
                        <button className="btnAction dangerOutline" onClick={() => setFriendToRemove(f)}>
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {friendToRemove && (
        <div className="confirmModalOverlay">
          <div className="confirmModalBox">
            <div className="confirmIcon">🗑️</div>
            <h3>Remove Friend?</h3>
            <p>Are you sure you want to remove <strong>{friendToRemove.username}</strong>?</p>
            <div className="confirmBtnGroup">
              <button className="btnAction secondary" onClick={() => setFriendToRemove(null)}>
                Cancel
              </button>
              <button className="btnAction danger" onClick={confirmRemoveFriend}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}