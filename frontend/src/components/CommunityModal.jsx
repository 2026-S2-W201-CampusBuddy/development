import { useState, useEffect } from 'react'
import useCommunity from '../hooks/useCommunity'
import './CommunityModal.css'

const CATEGORIES = [
  { id: 'general', label: '💬 General' },
  { id: 'study', label: '📚 Study Squad' },
  { id: 'food', label: '🍕 Eatery' },
  { id: 'wellness', label: '🏃 Wellness' },
  { id: 'travelling', label: '✈️ Travelling' },
]

const CATEGORY_PLACEHOLDERS = {
  general: {
    title: 'E.g., Any fun events happening this weekend?',
    content: 'Share your thoughts, ask questions, or start a general discussion...',
  },
  study: {
    title: 'E.g., Anyone studying for COMP602 or looking for a group?',
    content: 'Find study partners, discuss course topics, or share helpful tips...',
  },
  food: {
    title: 'E.g., Best $10 lunch deals near campus?',
    content: 'Share cheap eats, student food discounts, or restaurant reviews...',
  },
  wellness: {
    title: 'E.g., Good gym recommendations, running routes, or mental health tips?',
    content: 'Share workout routines, stress relief tips, sports activities, or wellness advice...',
  },
  travelling: {
    title: 'E.g., Day trip ideas or weekend getaways around Auckland?',
    content: 'Share travel tips, scenic spots, or public transport advice...',
  },
}

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const now = new Date()
  const past = new Date(dateString)
  const diffInSeconds = Math.floor((now - past) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`

  return past.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export default function CommunityModal({
  isOpen,
  initialView = 'list',
  initialCategory = 'general',
  onClose,
  currentUser,
}) {
  const [view, setView] = useState(initialView)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)

  // New post form state
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState(initialCategory)
  const [posting, setPosting] = useState(false)
  const [createPostError, setCreatePostError] = useState('')

  // Post edit & inline delete states
  const [isEditingPost, setIsEditingPost] = useState(false)
  const [editPostTitle, setEditPostTitle] = useState('')
  const [editPostContent, setEditPostContent] = useState('')
  const [isDeletingPost, setIsDeletingPost] = useState(false)

  // Comment & reply states
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [commenting, setCommenting] = useState(false)
  const [createCommentError, setCreateCommentError] = useState('')

  // Comment inline edit & inline delete states
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState(null)

  const {
    posts, loadingPosts, postsError, fetchPosts,
    activePost, comments, loadingComments, commentsError, openPost, closePost,
    submitPost, editPost, removePost,
    submitComment, editComment, removeComment,
  } = useCommunity()

  useEffect(() => {
    if (isOpen) {
      setView(initialView)
      setSelectedCategory(initialCategory)
      setNewCategory(initialCategory)
      setReplyingTo(null)
      setIsEditingPost(false)
      setIsDeletingPost(false)
      setEditingCommentId(null)
      setDeletingCommentId(null)
    }
  }, [isOpen, initialView, initialCategory])

  useEffect(() => {
    if (isOpen && view === 'list') {
      fetchPosts(selectedCategory)
    }
  }, [isOpen, view, selectedCategory, fetchPosts])

  if (!isOpen) return null

  const handleSelectCategory = (categoryId) => {
    setSelectedCategory(categoryId)
  }

  const handleOpenPost = (postId) => {
    setView('post')
    setReplyingTo(null)
    setIsEditingPost(false)
    setIsDeletingPost(false)
    setEditingCommentId(null)
    setDeletingCommentId(null)
    openPost(postId)
  }

  const handleBackToList = () => {
    closePost()
    setReplyingTo(null)
    setIsEditingPost(false)
    setIsDeletingPost(false)
    setEditingCommentId(null)
    setDeletingCommentId(null)
    setView('list')
  }

  const handleOpenNewPostForm = () => {
    setNewCategory(selectedCategory)
    setView('new')
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    setCreatePostError('')
    setPosting(true)
    try {
      await submitPost(newTitle, newContent, currentUser, newCategory)
      setNewTitle('')
      setNewContent('')
      setSelectedCategory(newCategory)
      setView('list')
    } catch (err) {
      setCreatePostError(err.message)
    } finally {
      setPosting(false)
    }
  }

  const handleSavePostEdit = async (e) => {
    e.preventDefault()
    try {
      await editPost(activePost.id, editPostTitle, editPostContent, currentUser)
      setIsEditingPost(false)
    } catch (err) {
      alert(err.message)
    }
  }

  // Handle post delete without browser confirm popup
  const handleConfirmDeletePost = async () => {
    try {
      await removePost(activePost.id, currentUser)
      setIsDeletingPost(false)
      setView('list')
    } catch (err) {
      alert(err.message)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    setCreateCommentError('')
    setCommenting(true)
    try {
      const parentId = replyingTo ? replyingTo.id : null
      await submitComment(activePost.id, commentText, currentUser, parentId)
      setCommentText('')
      setReplyingTo(null)
    } catch (err) {
      setCreateCommentError(err.message)
    } finally {
      setCommenting(false)
    }
  }

  const handleSaveCommentEdit = async (commentId) => {
    try {
      await editComment(activePost.id, commentId, editingCommentText, currentUser)
      setEditingCommentId(null)
    } catch (err) {
      alert(err.message)
    }
  }

  // Handle comment delete without browser confirm popup
  const handleConfirmDeleteComment = async (commentId) => {
    try {
      await removeComment(activePost.id, commentId, currentUser)
      setDeletingCommentId(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const commentsById = {}
  comments.forEach((c) => {
    commentsById[c.id] = c
  })

  const getRootId = (comment) => {
    let current = comment
    while (current && current.parent_id && commentsById[current.parent_id]) {
      current = commentsById[current.parent_id]
    }
    return current ? current.id : comment.id
  }

  const rootComments = comments.filter((c) => !c.parent_id)
  const threadRepliesMap = {}

  comments.forEach((c) => {
    if (c.parent_id) {
      const rootId = getRootId(c)
      if (!threadRepliesMap[rootId]) {
        threadRepliesMap[rootId] = []
      }
      threadRepliesMap[rootId].push(c)
    }
  })

  const currentPlaceholder = CATEGORY_PLACEHOLDERS[newCategory] || CATEGORY_PLACEHOLDERS.general

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog hubModalDialog communityDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose} aria-label="Close">✕</button>

        <div className="hubModalBody communityModalBody">
          {/* VIEW: Post List */}
          {view === 'list' && (
            <>
              <div className="modalHeader communityHeader">
                <h2 className="modalHeading">Community</h2>
                <p className="modalCaption">Connect and share tips with fellow students</p>
              </div>

              <div className="communityToolbar">
                <div className="communityCategoryTabs">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      className={`categoryTabBtn ${selectedCategory === cat.id ? 'active' : ''}`}
                      onClick={() => handleSelectCategory(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <button
                  className="btnGlass btnPrimary communityWriteBtn"
                  onClick={handleOpenNewPostForm}
                >
                  <span>✏️</span> New Post
                </button>
              </div>

              {loadingPosts && (
                <div className="communityEmptyBox">
                  <div className="communitySpinner"></div>
                  <p className="communityStatusText">Loading discussions...</p>
                </div>
              )}

              {!loadingPosts && postsError && (
                <div className="communityEmptyBox">
                  <p className="communityStatusText">{postsError}</p>
                  <button className="btnGlass btnSmall" onClick={() => fetchPosts(selectedCategory)}>
                    Try again
                  </button>
                </div>
              )}

              {!loadingPosts && !postsError && posts.length === 0 && (
                <div className="communityEmptyBox">
                  <div className="emptyIcon">💬</div>
                  <p className="emptyTitle">No posts here yet</p>
                  <p className="emptySubtitle">Be the first to start a conversation in this topic!</p>
                  <button className="btnGlass btnPrimary btnSmall" onClick={handleOpenNewPostForm}>
                    Create Post
                  </button>
                </div>
              )}

              {!loadingPosts && !postsError && posts.length > 0 && (
                <div className="communityPostList">
                  {posts.map((post) => {
                    const authorInitial = post.author ? post.author.charAt(0).toUpperCase() : '?'
                    return (
                      <div
                        key={post.id}
                        className="communityPostCard"
                        onClick={() => handleOpenPost(post.id)}
                      >
                        <div className="postCardHeader">
                          <div className="postAuthorGroup">
                            <div className="authorAvatar">{authorInitial}</div>
                            <span className="postAuthorName">{post.author}</span>
                          </div>
                          <span className="postTimeAgo">{formatTimeAgo(post.created_at)}</span>
                        </div>

                        <h3 className="communityPostTitle">{post.title}</h3>
                        <p className="communityPostPreview">{post.content}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* VIEW: Post Detail & Comments */}
          {view === 'post' && (
            <>
              <div className="modalHeader detailHeader">
                <button className="communityBackLink" onClick={handleBackToList}>
                  ← Back to Discussions
                </button>
              </div>

              {loadingComments && (
                <div className="communityEmptyBox">
                  <div className="communitySpinner"></div>
                  <p className="communityStatusText">Loading conversation...</p>
                </div>
              )}

              {!loadingComments && commentsError && (
                <div className="communityEmptyBox">
                  <p className="communityStatusText">{commentsError}</p>
                </div>
              )}

              {!loadingComments && !commentsError && activePost && (
                <div className="postDetailContainer">
                  <div className="communityPostDetail">
                    <div className="postDetailMetaBar">
                      <div className="postDetailMetaLeft">
                        <span className="postCategoryBadge">
                          {CATEGORIES.find((c) => c.id === activePost.category)?.label || activePost.category || 'General'}
                        </span>
                        <div className="postAuthorGroup">
                          <div className="authorAvatar small">
                            {activePost.author ? activePost.author.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="postAuthorName">{activePost.author}</span>
                        </div>
                        <span className="postTimeAgo">{formatTimeAgo(activePost.created_at)}</span>
                      </div>

                      {/* Post Author Action Buttons (with inline delete confirm) */}
                      {currentUser && currentUser === activePost.author && !isEditingPost && (
                        isDeletingPost ? (
                          <div className="inlineConfirmGroup">
                            <span className="confirmLabel">Delete post?</span>
                            <button
                              type="button"
                              className="btnGlass btnSmall deleteConfirmBtn"
                              onClick={handleConfirmDeletePost}
                            >
                              Yes, Delete
                            </button>
                            <button
                              type="button"
                              className="btnGlass btnSmall"
                              onClick={() => setIsDeletingPost(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="authorActionButtons">
                            <button
                              type="button"
                              className="cardActionBtn"
                              onClick={() => {
                                setIsEditingPost(true)
                                setEditPostTitle(activePost.title)
                                setEditPostContent(activePost.content)
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="cardActionBtn deleteBtn"
                              onClick={() => setIsDeletingPost(true)}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )
                      )}
                    </div>

                    {isEditingPost ? (
                      <form className="inlineEditForm" onSubmit={handleSavePostEdit}>
                        <input
                          type="text"
                          className="liquidInput inlineEditInput"
                          value={editPostTitle}
                          onChange={(e) => setEditPostTitle(e.target.value)}
                          required
                        />
                        <textarea
                          className="liquidInput inlineEditTextarea"
                          value={editPostContent}
                          onChange={(e) => setEditPostContent(e.target.value)}
                          required
                        />
                        <div className="inlineEditActions">
                          <button type="button" className="btnGlass btnSmall" onClick={() => setIsEditingPost(false)}>
                            Cancel
                          </button>
                          <button type="submit" className="btnGlass btnPrimary btnSmall">
                            Save Changes
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h2 className="communityPostDetailTitle">{activePost.title}</h2>
                        <p className="communityPostDetailContent">{activePost.content}</p>
                      </>
                    )}
                  </div>

                  {/* Threaded Comments Section */}
                  <div className="communityCommentsSection">
                    <h4 className="commentsHeaderTitle">
                      Replies ({comments.length})
                    </h4>

                    <div className="communityCommentList">
                      {comments.length === 0 ? (
                        <p className="noRepliesText">No replies yet. Be the first to join the conversation!</p>
                      ) : (
                        rootComments.map((rootComment) => {
                          const replies = threadRepliesMap[rootComment.id] || []
                          const isRootAuthor = currentUser && currentUser === rootComment.author

                          return (
                            <div key={rootComment.id} className="commentThreadBlock">
                              {/* Top-Level Root Comment */}
                              <div className="communityCommentCard">
                                <div className="commentHeaderRow">
                                  <div className="commentAuthorGroup">
                                    <div className="authorAvatar xsmall">
                                      {rootComment.author ? rootComment.author.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <span className="commentAuthorName">{rootComment.author}</span>
                                    <span className="commentTimeAgo">{formatTimeAgo(rootComment.created_at)}</span>
                                  </div>

                                  <div className="commentActionsGroup">
                                    {isRootAuthor && editingCommentId !== rootComment.id && (
                                      deletingCommentId === rootComment.id ? (
                                        <div className="inlineCommentConfirm">
                                          <span className="confirmLabel">Delete?</span>
                                          <button
                                            type="button"
                                            className="commentConfirmBtn yes"
                                            onClick={() => handleConfirmDeleteComment(rootComment.id)}
                                          >
                                            Yes
                                          </button>
                                          <button
                                            type="button"
                                            className="commentConfirmBtn no"
                                            onClick={() => setDeletingCommentId(null)}
                                          >
                                            No
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            className="commentActionBtn"
                                            onClick={() => {
                                              setEditingCommentId(rootComment.id)
                                              setEditingCommentText(rootComment.content)
                                            }}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            className="commentActionBtn deleteText"
                                            onClick={() => setDeletingCommentId(rootComment.id)}
                                          >
                                            Delete
                                          </button>
                                        </>
                                      )
                                    )}

                                    {deletingCommentId !== rootComment.id && (
                                      <button
                                        type="button"
                                        className="commentReplyBtn"
                                        onClick={() => setReplyingTo({ id: rootComment.id, author: rootComment.author })}
                                      >
                                        ↳ Reply
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {editingCommentId === rootComment.id ? (
                                  <div className="inlineCommentEditBox">
                                    <textarea
                                      className="liquidInput inlineCommentEditTextarea"
                                      value={editingCommentText}
                                      onChange={(e) => setEditingCommentText(e.target.value)}
                                      required
                                    />
                                    <div className="inlineEditActions">
                                      <button type="button" className="btnGlass btnSmall" onClick={() => setEditingCommentId(null)}>
                                        Cancel
                                      </button>
                                      <button type="button" className="btnGlass btnPrimary btnSmall" onClick={() => handleSaveCommentEdit(rootComment.id)}>
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="communityCommentContent">{rootComment.content}</p>
                                )}
                              </div>

                              {/* Nested Replies */}
                              {replies.length > 0 && (
                                <div className="nestedRepliesContainer">
                                  {replies.map((reply) => {
                                    const parentComment = commentsById[reply.parent_id]
                                    const repliedToAuthor = parentComment ? parentComment.author : null
                                    const isReplyAuthor = currentUser && currentUser === reply.author

                                    return (
                                      <div key={reply.id} className="communityCommentCard replyCard">
                                        <div className="commentHeaderRow">
                                          <div className="commentAuthorGroup">
                                            <div className="authorAvatar xsmall replyAvatar">
                                              {reply.author ? reply.author.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <span className="commentAuthorName">{reply.author}</span>
                                            <span className="commentTimeAgo">{formatTimeAgo(reply.created_at)}</span>
                                          </div>

                                          <div className="commentActionsGroup">
                                            {isReplyAuthor && editingCommentId !== reply.id && (
                                              deletingCommentId === reply.id ? (
                                                <div className="inlineCommentConfirm">
                                                  <span className="confirmLabel">Delete?</span>
                                                  <button
                                                    type="button"
                                                    className="commentConfirmBtn yes"
                                                    onClick={() => handleConfirmDeleteComment(reply.id)}
                                                  >
                                                    Yes
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="commentConfirmBtn no"
                                                    onClick={() => setDeletingCommentId(null)}
                                                  >
                                                    No
                                                  </button>
                                                </div>
                                              ) : (
                                                <>
                                                  <button
                                                    type="button"
                                                    className="commentActionBtn"
                                                    onClick={() => {
                                                      setEditingCommentId(reply.id)
                                                      setEditingCommentText(reply.content)
                                                    }}
                                                  >
                                                    Edit
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="commentActionBtn deleteText"
                                                    onClick={() => setDeletingCommentId(reply.id)}
                                                  >
                                                    Delete
                                                  </button>
                                                </>
                                              )
                                            )}

                                            {deletingCommentId !== reply.id && (
                                              <button
                                                type="button"
                                                className="commentReplyBtn"
                                                onClick={() => setReplyingTo({ id: reply.id, author: reply.author })}
                                              >
                                                ↳ Reply
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {editingCommentId === reply.id ? (
                                          <div className="inlineCommentEditBox">
                                            <textarea
                                              className="liquidInput inlineCommentEditTextarea"
                                              value={editingCommentText}
                                              onChange={(e) => setEditingCommentText(e.target.value)}
                                              required
                                            />
                                            <div className="inlineEditActions">
                                              <button type="button" className="btnGlass btnSmall" onClick={() => setEditingCommentId(null)}>
                                                Cancel
                                              </button>
                                              <button type="button" className="btnGlass btnPrimary btnSmall" onClick={() => handleSaveCommentEdit(reply.id)}>
                                                Save
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="communityCommentContent">
                                            {repliedToAuthor && (
                                              <span className="replyMentionTag">@{repliedToAuthor}</span>
                                            )}
                                            {reply.content}
                                          </p>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Comment & Reply Input Form */}
                  <form className="communityReplyForm" onSubmit={handleAddComment}>
                    {replyingTo && (
                      <div className="replyingToBanner">
                        <span>Replying to <strong>@{replyingTo.author}</strong></span>
                        <button
                          type="button"
                          className="cancelReplyBtn"
                          onClick={() => setReplyingTo(null)}
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <textarea
                      className="liquidInput communityCommentInput"
                      placeholder={replyingTo ? `Write a reply to @${replyingTo.author}...` : 'Write a helpful reply...'}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      required
                    />
                    {createCommentError && <p className="formError">{createCommentError}</p>}
                    <button type="submit" className="btnGlass btnPrimary replySubmitBtn" disabled={commenting}>
                      {commenting ? 'Sending...' : (replyingTo ? 'Reply to Comment' : 'Reply to Post')}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {/* VIEW: New Post */}
          {view === 'new' && (
            <>
              <div className="modalHeader detailHeader">
                <button className="communityBackLink" onClick={() => setView('list')}>
                  ← Cancel and Back
                </button>
                <h2 className="modalHeading">Create a Discussion</h2>
                <p className="modalCaption">Ask a question, share advice, or start a discussion</p>
              </div>

              <form className="formStack newPostForm" onSubmit={handleCreatePost}>
                <div className="inputFieldGroup">
                  <label className="fieldLabel">Topic / Category</label>
                  <select
                    className="liquidInput communitySelect"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="inputFieldGroup">
                  <label className="fieldLabel">Title</label>
                  <input
                    type="text"
                    className="liquidInput"
                    placeholder={currentPlaceholder.title}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="inputFieldGroup">
                  <label className="fieldLabel">Message Content</label>
                  <textarea
                    className="liquidInput communityNewPostTextarea"
                    placeholder={currentPlaceholder.content}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    required
                  />
                </div>

                {createPostError && <p className="formError">{createPostError}</p>}

                <button type="submit" className="btnGlass btnPrimary btnFullWidth postSubmitBtn" disabled={posting}>
                  {posting ? 'Publishing...' : 'Publish Post 🚀'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}