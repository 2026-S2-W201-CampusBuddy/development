import { useState, useCallback } from 'react'
import { getPosts, getPost, createPost, getComments, createComment } from '../api'

export default function useCommunity() {
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [postsError, setPostsError] = useState('')

  const [activePost, setActivePost] = useState(null)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentsError, setCommentsError] = useState('')

  const fetchPosts = useCallback(() => {
    setLoadingPosts(true)
    setPostsError('')
    getPosts()
      .then((json) => setPosts(json.data))
      .catch((err) => setPostsError(err.message || 'Could not load posts'))
      .finally(() => setLoadingPosts(false))
  }, [])

  const openPost = useCallback((postId) => {
    setLoadingComments(true)
    setCommentsError('')
    Promise.all([getPost(postId), getComments(postId)])
      .then(([postJson, commentsJson]) => {
        setActivePost(postJson.data)
        setComments(commentsJson.data)
      })
      .catch((err) => setCommentsError(err.message || 'Could not load post'))
      .finally(() => setLoadingComments(false))
  }, [])

  const closePost = useCallback(() => {
    setActivePost(null)
    setComments([])
  }, [])

  const submitPost = useCallback(async (title, content, author) => {
    const json = await createPost(title, content, author)
    setPosts((prev) => [json.data, ...prev])
    return json.data
  }, [])

  const submitComment = useCallback(async (postId, content, author) => {
    const json = await createComment(postId, content, author)
    setComments((prev) => [...prev, json.data])
    return json.data
  }, [])

  return {
    posts, loadingPosts, postsError, fetchPosts,
    activePost, comments, loadingComments, commentsError, openPost, closePost,
    submitPost, submitComment,
  }
}