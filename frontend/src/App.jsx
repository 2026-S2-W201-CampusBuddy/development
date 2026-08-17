import { useState, useEffect } from 'react'
import WeatherNotification from './components/WeatherNotification'
import './App.css'

// useState -> to remember/store a value (data)
// useEffect -> to run some code automatically (like API calls)

function App() {
  // Tracks whether the user is currently logged in
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  // Stores the username input value
  const [username, setUsername] = useState('')
  // Stores the password input value
  const [password, setPassword] = useState('')

  // Store the list of posts (starts empty)
  const [posts, setPosts] = useState([])
  
  // true = still loading data, false = loading finished
  const [loading, setLoading] = useState(true)

  // Store what the user types in the form
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('')

  // This runs automatically ONE TIME when the page first loads
  // (because the second argument is an empty array [])
  useEffect(() => {
    // fetch only when logged in
    if (isLoggedIn){
      // Send a GET request to the server to fetch posts
      fetch('http://127.0.0.1:5000/api/posts')
        // Turn the response into JSON format
        .then(response => response.json())
        .then(json => {
          // Save the posts array into state
          setPosts(json.data)
          // Loading is done now
          setLoading(false)
        })
        // If something goes wrong
        .catch(error => {
          console.error("Error fetching data:", error)
          setLoading(false)
        })
    }
  }, [isLoggedIn]) // runs every time isLoggedIn changes

  // Example (not used): this would run every time "title" changes
  // useEffect(() => {
  //     console.log("title has changed!")
  // }, [title])


  // This function only runs when the user clicks the "Post" button
  // (NOT automatic like useEffect)
  function handleSubmit() {
    // Send a POST request to create a new post
    fetch('http://127.0.0.1:5000/api/posts', {
        method: 'POST', // we are sending data, not just asking for it
        headers: {
            'Content-Type': 'application/json' // tell server we're sending JSON
        },
        body: JSON.stringify({
            title: title,
            content: content,
            author: author
        })
    })
        .then(response => response.json())
        .then(json => {
            console.log("Post created:", json)

            // Add the new post to the existing posts list (so it shows up right away)
            const newList = posts.concat(json.data)

            // Replace posts with the newList
            setPosts(newList)
            
            // Clear the input fields after posting
            setTitle('')
            setContent('')
            setAuthor('')
        })
        .catch(error => {
            console.error("Error creating post:", error)
        })
  }

  function handleLogin() {
      // Send username and password to the backend to check login
      fetch('http://127.0.0.1:5000/api/login', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: username, password: password })
      })
          // Convert the response into usable data
          .then(response => response.json())
          .then(json => {
              // If login was successful, switch the screen to the community page
              if (json.status === 'success') {
                  setIsLoggedIn(true)
              } else {
                  // If login failed, show the error message from the backend
                  alert(json.message)
              }
          })
          .catch(error => {
              console.error("Error logging in:", error)
          })
  }

function handleLogout() {
    // Just flip the login state back to false
    setIsLoggedIn(false)
    // Clear the login form inputs too, so it's empty for the next login
    setUsername('')
    setPassword('')
  }

  return (
      <div className="App">
        {!isLoggedIn ? (
          // Show this if the user is NOT logged in yet
          <div className="login-form">
            <h2>Login to CampusBuddy</h2>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleLogin}>Log In</button>
          </div>
        ) : (
          // Show this if the user IS logged in
          <>
            <h1>CampusBuddy Community</h1>
            <WeatherNotification />

            {/* Logout button */}
            <button onClick={handleLogout}>Log Out</button>

            {/* Form for writing a new post */}
            <div className="post-form">
              <h3>Write a New Post</h3>

              {/* Each input updates its own state when user types */}
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
              <input value={content} onChange={(e) => setContent(e.target.value)} />
              <input value={author} onChange={(e) => setAuthor(e.target.value)} />

              {/* Clicking this button calls handleSubmit */}
              <button onClick={handleSubmit}>Post</button>
            </div>

            {/* Show "Loading..." while data is not ready yet */}
            {loading ? (
              <p>Loading posts from backend...</p>
            ) : (
              <div className="card">
                <h3>All Posts:</h3>
                <ul>
                  {/* Go through each post and display it */}
                  {posts.map((post) => (
                    <li key={post.id}> {/* key helps React track each item */}
                      <strong>{post.title}</strong> by {post.author}
                      <p>{post.content}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
  )
}

export default App