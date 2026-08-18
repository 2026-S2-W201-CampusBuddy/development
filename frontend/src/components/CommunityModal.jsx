import { useState, useEffect } from 'react'
import useCommunity from '../hooks/useCommunity'
import './CommunityModal.css'

export default function CommunityModal({ isOpen, initialView = 'list', onClose, currentUser }) {
  const [view, setView] = useState(initialView) // 'list' | 'post' | 'new'

  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [createPostError, setCreatePostError] = useState('')

  const [commentText, setCommentText] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [createCommentError, setCreateCommentError] = useState('')

  const {
    posts, loadingPosts, postsError, fetchPosts,
    activePost, comments, loadingComments, commentsError, openPost, closePost,
    submitPost, submitComment,
  } = useCommunity()

  // Re-open at whichever view the button that opened this modal asked for
  useEffect(() => {
    if (isOpen) setView(initialView)
  }, [isOpen, initialView])

  // Load the post list whenever the list view becomes active
  useEffect(() => {
    if (isOpen && view === 'list') fetchPosts()
  }, [isOpen, view, fetchPosts])

  if (!isOpen) return null

  const handleOpenPost = (postId) => {
    setView('post')
    openPost(postId)
  }

  const handleBackToList = () => {
    closePost()
    setView('list')
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    setCreatePostError('')
    setPosting(true)
    try {
      await submitPost(newTitle, newContent, currentUser)
      setNewTitle('')
      setNewContent('')
      setView('list')
    } catch (err) {
      setCreatePostError(err.message)
    } finally {
      setPosting(false)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    setCreateCommentError('')
    setCommenting(true)
    try {
      await submitComment(activePost.id, commentText, currentUser)
      setCommentText('')
    } catch (err) {
      setCreateCommentError(err.message)
    } finally {
      setCommenting(false)
    }
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog hubModalDialog communityDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose} aria-label="Close">✕</button>

        <div className="hubModalBody">
          {view === 'list' && (
            <>
              <div className="modalHeader">
                <h2 className="modalHeading">Community</h2>
                <p className="modalCaption">See what other students are talking about</p>
              </div>

              <button className="btnGlass btnPrimary btnFullWidth communityNewPostBtn" onClick={() => setView('new')}>
                + New Post
              </button>

              {loadingPosts && <p className="communityStatusText">Loading posts...</p>}

              {!loadingPosts && postsError && (
                <div className="communityErrorBlock">
                  <p className="communityStatusText">{postsError}</p>
                  <button className="btnGlass" onClick={fetchPosts}>Try again</button>
                </div>
              )}

              {!loadingPosts && !postsError && posts.length === 0 && (
                <p className="communityStatusText">No posts yet — be the first to share something!</p>
              )}

              {!loadingPosts && !postsError && posts.length > 0 && (
                <div className="communityPostList">
                  {posts.map((post) => (
                    <button
                      key={post.id}
                      className="communityPostCard"
                      onClick={() => handleOpenPost(post.id)}
                    >
                      <span className="communityPostTitle">{post.title}</span>
                      <span className="communityPostMeta">by {post.author}</span>
                      <span className="communityPostPreview">{post.content}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'post' && (
            <>
              <div className="modalHeader">
                <button className="communityBackLink" onClick={handleBackToList}>← Back to Community</button>
              </div>

              {loadingComments && <p className="communityStatusText">Loading post...</p>}

              {!loadingComments && commentsError && (
                <p className="communityStatusText">{commentsError}</p>
              )}

              {!loadingComments && !commentsError && activePost && (
                <>
                  <div className="communityPostDetail">
                    <h3 className="communityPostDetailTitle">{activePost.title}</h3>
                    <span className="communityPostMeta">by {activePost.author}</span>
                    <p className="communityPostDetailContent">{activePost.content}</p>
                  </div>

                  <div className="communityCommentList">
                    {comments.length === 0 && (
                      <p className="communityStatusText">No replies yet — add the first one.</p>
                    )}
                    {comments.map((comment) => (
                      <div key={comment.id} className="communityCommentCard">
                        <span className="communityPostMeta">{comment.author}</span>
                        <p className="communityCommentContent">{comment.content}</p>
                      </div>
                    ))}
                  </div>

                  <form className="formStack" onSubmit={handleAddComment}>
                    <textarea
                      className="liquidInput communityCommentInput"
                      placeholder="Write a reply..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      required
                    />
                    {createCommentError && <p className="formError">{createCommentError}</p>}
                    <button type="submit" className="btnGlass btnPrimary btnFullWidth" disabled={commenting}>
                      {commenting ? 'Posting...' : 'Reply'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

          {view === 'new' && (
            <>
              <div className="modalHeader">
                <button className="communityBackLink" onClick={() => setView('list')}>← Back to Community</button>
                <h2 className="modalHeading">New Post</h2>
                <p className="modalCaption">Share something with the community</p>
              </div>

              <form className="formStack" onSubmit={handleCreatePost}>
                <div className="inputFieldGroup">
                  <label className="fieldLabel">Title</label>
                  <input
                    type="text"
                    className="liquidInput"
                    placeholder="What's this about?"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="inputFieldGroup">
                  <label className="fieldLabel">Content</label>
                  <textarea
                    className="liquidInput communityCommentInput"
                    placeholder="Write your post..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    required
                  />
                </div>

                {createPostError && <p className="formError">{createPostError}</p>}

                <button type="submit" className="btnGlass btnPrimary btnFullWidth" disabled={posting}>
                  {posting ? 'Posting...' : 'Post →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}