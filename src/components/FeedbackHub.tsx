import { useEffect, useState, type FormEvent } from 'react'
import { getCooldownRemainingMs } from '../game/feedback.ts'
import type { FeedbackPost } from '../game/types.ts'

interface FeedbackHubProps {
  accountName: string | null
  posts: FeedbackPost[]
  status: {
    bugReport: { tone: 'good' | 'warn'; message: string } | null
    featureRequest: { tone: 'good' | 'warn'; message: string } | null
    review: { tone: 'good' | 'warn'; message: string } | null
  }
  availability: {
    isLoggedIn: boolean
    bugReportLastSubmittedAt: number | null
    featureRequestLastSubmittedAt: number | null
  }
  onSubmitBugReport: (body: string) => boolean
  onSubmitFeatureRequest: (body: string) => boolean
  onSubmitReview: (body: string) => boolean
}

const formatRemaining = (remainingMs: number) => {
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h`
  }

  return `${minutes}m`
}

const formatPostedAt = (createdAt: number) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(createdAt)

const buildRequirementMessage = (
  isLoggedIn: boolean,
  remainingMs: number,
  label: string,
) => {
  if (!isLoggedIn) {
    return `Account required: log in or register to post ${label}.`
  }

  if (remainingMs > 0) {
    return `Cooldown active: you can post another ${label} in ${formatRemaining(remainingMs)}.`
  }

  return `Logged-in ${label} are limited to one post per account every hour.`
}

interface FeedbackColumnProps {
  title: string
  eyebrow: string
  placeholder: string
  submitLabel: string
  helper: string
  posts: FeedbackPost[]
  status: { tone: 'good' | 'warn'; message: string } | null
  onSubmit: (body: string) => boolean
}

const orderPosts = (posts: FeedbackPost[]) =>
  [...posts].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1
    }

    return right.createdAt - left.createdAt
  })

function FeedbackColumn({
  title,
  eyebrow,
  placeholder,
  submitLabel,
  helper,
  posts,
  status,
  onSubmit,
}: FeedbackColumnProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (onSubmit(value)) {
      setValue('')
    }
  }

  return (
    <section className="feedback-card panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <p className="feedback-helper">{helper}</p>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <label>
          <span>Post</span>
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            rows={4}
          />
        </label>
        <button className="primary-button feedback-submit-button" type="submit">
          {submitLabel}
        </button>
      </form>

      {status && (
        <p className={`feedback-status feedback-status-${status.tone}`}>{status.message}</p>
      )}

      <div className="feedback-post-list">
        {posts.length > 0 ? (
          posts.map((post) => (
            <article key={post.id} className="feedback-post">
              <div className="feedback-post-meta">
                <strong>{post.authorName}</strong>
                <span>{formatPostedAt(post.createdAt)}</span>
              </div>
              <div className="leaderboard-name-line">
                {post.pinned && (
                  <span className="leaderboard-badge leaderboard-badge-outline">Pinned</span>
                )}
                {post.status !== 'open' && (
                  <span className="leaderboard-badge leaderboard-badge-solid">{post.status}</span>
                )}
              </div>
              <p>{post.body}</p>
            </article>
          ))
        ) : (
          <p className="empty-copy">No posts here yet.</p>
        )}
      </div>
    </section>
  )
}

export function FeedbackHub({
  accountName,
  posts,
  status,
  availability,
  onSubmitBugReport,
  onSubmitFeatureRequest,
  onSubmitReview,
}: FeedbackHubProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  const bugPosts = orderPosts(posts.filter((post) => post.category === 'bug-report')).slice(0, 4)
  const featurePosts = orderPosts(posts.filter((post) => post.category === 'feature-request')).slice(0, 4)
  const reviewPosts = orderPosts(posts.filter((post) => post.category === 'review')).slice(0, 4)

  const bugRemainingMs = getCooldownRemainingMs(availability.bugReportLastSubmittedAt, now)
  const featureRemainingMs = getCooldownRemainingMs(
    availability.featureRequestLastSubmittedAt,
    now,
  )
  const reviewHelper = accountName
    ? `Posting as ${accountName}. Reviews stay open so signed-in players can leave quick impressions between sessions.`
    : 'Guest reviews are allowed. If you sign in first, your account name will be attached automatically.'

  return (
    <section className="feedback-hub">
      <div className="panel feedback-hub-intro">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Bottom Page Feedback</p>
            <h2>Bug Reports, Requests, And Reviews</h2>
          </div>
        </div>
        <p className="menu-copy">
          This area stays at the bottom of the main page so it is easy to reach after a practice
          block. Bug reports and feature requests are account-only, while reviews stay open for
          quick community feedback.
        </p>
      </div>

      <div className="feedback-grid">
        <FeedbackColumn
          title="Bug Reports"
          eyebrow="Issues"
          placeholder="Describe what broke, where it happened, and how to reproduce it."
          submitLabel="Post Bug Report"
          helper={buildRequirementMessage(availability.isLoggedIn, bugRemainingMs, 'bug reports')}
          posts={bugPosts}
          status={status.bugReport}
          onSubmit={onSubmitBugReport}
        />

        <FeedbackColumn
          title="Feature Requests"
          eyebrow="Ideas"
          placeholder="Describe the feature, how it should work, and why it would help."
          submitLabel="Post Feature Request"
          helper={buildRequirementMessage(
            availability.isLoggedIn,
            featureRemainingMs,
            'feature requests',
          )}
          posts={featurePosts}
          status={status.featureRequest}
          onSubmit={onSubmitFeatureRequest}
        />

        <FeedbackColumn
          title="Reviews / Feedback"
          eyebrow="Community"
          placeholder="Share quick feedback about the trainer, the mode flow, or the feel of the reps."
          submitLabel="Post Feedback"
          helper={reviewHelper}
          posts={reviewPosts}
          status={status.review}
          onSubmit={onSubmitReview}
        />
      </div>
    </section>
  )
}
