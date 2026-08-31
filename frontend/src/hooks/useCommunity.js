import { useState, useCallback } from 'react'
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getComments,
  createComment,
  updateComment,
  deleteComment,
} from '../api'

export default function useCommunity() {
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [postsError, setPostsError] = useState('')

  const [activePost, setActivePost] = useState(null)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentsError, setCommentsError] = useState('')

  const fetchPosts = useCallback((category = 'general') => {
    setLoadingPosts(true)
    setPostsError('')
    getPosts(category)
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

  const submitPost = useCallback(async (title, content, author, category = 'general') => {
    const json = await createPost(title, content, author, category)
    setPosts((prev) => [json.data, ...prev])
    return json.data
  }, [])

  // Edit existing post
  const editPost = useCallback(async (postId, title, content, author) => {
    const json = await updatePost(postId, title, content, author)
    setActivePost(json.data)
    setPosts((prev) => prev.map((p) => (p.id === postId ? json.data : p)))
    return json.data
  }, [])

  // Remove existing post
  const removePost = useCallback(async (postId, author) => {
    await deletePost(postId, author)
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    setActivePost(null)
  }, [])

  const submitComment = useCallback(async (postId, content, author, parentId = null) => {
    const json = await createComment(postId, content, author, parentId)
    setComments((prev) => [...prev, json.data])
    return json.data
  }, [])

  // Edit existing comment
  const editComment = useCallback(async (postId, commentId, content, author) => {
    const json = await updateComment(postId, commentId, content, author)
    setComments((prev) => prev.map((c) => (c.id === commentId ? json.data : c)))
    return json.data
  }, [])

  // Remove existing comment
  const removeComment = useCallback(async (postId, commentId, author) => {
    await deleteComment(postId, commentId, author)
    // Remove comment and any replies that had it as parent
    setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId))
  }, [])

  return {
    posts,
    loadingPosts,
    postsError,
    fetchPosts,
    activePost,
    comments,
    loadingComments,
    commentsError,
    openPost,
    closePost,
    submitPost,
    editPost,
    removePost,
    submitComment,
    editComment,
    removeComment,
  }
}