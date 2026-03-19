import { getAdminRuntimeState } from './admin.js'
import {
  getActiveAccount,
  getProfileDisplayName,
  updateAccountSubmissionCooldown,
} from './auth.js'
import type {
  AuthState,
  FeedbackCategory,
  FeedbackPost,
  FeedbackState,
} from './types.js'

const FEEDBACK_STORAGE_KEY = 'midlane-reaction-feedback'
const MAX_FEEDBACK_POSTS = 36
const MAX_FEEDBACK_BODY_LENGTH = 420

export const FEEDBACK_COOLDOWN_MS = 60 * 60 * 1000

const normalizeBody = (value: string) => value.replace(/\s+/g, ' ').trim()

export const createEmptyFeedbackState = (): FeedbackState => ({
  posts: [],
})

export const loadFeedbackState = (): FeedbackState => {
  if (typeof window === 'undefined') {
    return createEmptyFeedbackState()
  }

  try {
    const raw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY)
    if (!raw) {
      return createEmptyFeedbackState()
    }

    const parsed = JSON.parse(raw) as Partial<FeedbackState>
    return {
      posts: Array.isArray(parsed.posts)
        ? parsed.posts
            .map(
              (post): FeedbackPost => ({
              id: typeof post.id === 'string' ? post.id : '',
              category:
                post.category === 'bug-report' ||
                post.category === 'feature-request' ||
                post.category === 'review'
                  ? post.category
                  : 'review',
              body: typeof post.body === 'string' ? post.body : '',
              createdAt: typeof post.createdAt === 'number' ? post.createdAt : 0,
              authorName:
                typeof post.authorName === 'string' && post.authorName.trim()
                  ? post.authorName.trim()
                  : 'Guest',
              accountName:
                typeof post.accountName === 'string' && post.accountName.trim()
                  ? post.accountName
                  : null,
              status:
                post.status === 'reviewed' ||
                post.status === 'fixed' ||
                post.status === 'planned' ||
                post.status === 'rejected' ||
                post.status === 'added'
                  ? post.status
                  : 'open',
              pinned: Boolean(post.pinned),
              }),
            )
            .filter((post) => post.id && post.body)
            .slice(0, MAX_FEEDBACK_POSTS)
        : [],
    }
  } catch {
    return createEmptyFeedbackState()
  }
}

export const saveFeedbackState = (state: FeedbackState) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    FEEDBACK_STORAGE_KEY,
    JSON.stringify({
      posts: state.posts.slice(0, MAX_FEEDBACK_POSTS),
    }),
  )
}

export const getCooldownRemainingMs = (
  lastSubmittedAt: number | null,
  now: number,
  cooldownMs = FEEDBACK_COOLDOWN_MS,
) => {
  if (lastSubmittedAt === null) {
    return 0
  }

  return Math.max(cooldownMs - (now - lastSubmittedAt), 0)
}

export const getFeedbackPostsByCategory = (
  state: FeedbackState,
  category: FeedbackCategory,
) => state.posts.filter((post) => post.category === category)

const getFeedbackRequirementLabel = (category: FeedbackCategory) =>
  category === 'bug-report'
    ? 'bug reports'
    : category === 'feature-request'
      ? 'feature requests'
      : 'reviews'

const getFeedbackSuccessMessage = (category: FeedbackCategory) =>
  category === 'bug-report'
    ? 'Bug report posted. You can send another one in 1 hour.'
    : category === 'feature-request'
      ? 'Feature request posted. You can send another one in 1 hour.'
      : 'Feedback posted.'

const getFeedbackEmptyMessage = (category: FeedbackCategory) =>
  category === 'bug-report'
    ? 'Write a short bug report before posting.'
    : category === 'feature-request'
      ? 'Write a feature request before posting.'
      : 'Write your feedback before posting.'

const buildFeedbackPost = (
  category: FeedbackCategory,
  body: string,
  now: number,
  accountName: string | null,
): FeedbackPost => ({
  id: `${category}-${now}-${Math.random().toString(36).slice(2, 8)}`,
  category,
  body,
  createdAt: now,
  authorName: accountName ? getProfileDisplayName(accountName) : 'Guest',
  accountName,
  status: 'open',
  pinned: false,
})

export const submitFeedbackPost = ({
  feedbackState,
  authState,
  category,
  body,
  now = Date.now(),
}: {
  feedbackState: FeedbackState
  authState: AuthState
  category: FeedbackCategory
  body: string
  now?: number
}) => {
  const normalizedBody = normalizeBody(body).slice(0, MAX_FEEDBACK_BODY_LENGTH)
  const activeAccount = getActiveAccount(authState)
  const adminState = getAdminRuntimeState()
  if (category !== 'review' && !activeAccount) {
    return {
      ok: false as const,
      message: `An account is required to post ${getFeedbackRequirementLabel(category)}.`,
      feedbackState,
      authState,
      remainingMs: 0,
    }
  }

  const cooldownField =
    category === 'bug-report'
      ? 'bugReportAt'
      : category === 'feature-request'
        ? 'featureRequestAt'
        : null
  const cooldownMs =
    cooldownField && activeAccount?.strictFeedbackCooldownMinutes
      ? Math.max(activeAccount.strictFeedbackCooldownMinutes, 60) * 60 * 1000
      : FEEDBACK_COOLDOWN_MS
  const remainingMs =
    cooldownField && activeAccount
      ? getCooldownRemainingMs(activeAccount.cooldowns[cooldownField], now, cooldownMs)
      : 0

  if (cooldownField && remainingMs > 0) {
    return {
      ok: false as const,
      message: `Please wait before posting another ${getFeedbackRequirementLabel(category)}.`,
      feedbackState,
      authState,
      remainingMs,
    }
  }

  if (!normalizedBody) {
    return {
      ok: false as const,
      message: getFeedbackEmptyMessage(category),
      feedbackState,
      authState,
      remainingMs: 0,
    }
  }

  const loweredBody = normalizedBody.toLowerCase()
  if (
    adminState.blockedWords.some(
      (word) => word.trim().length > 0 && loweredBody.includes(word.trim().toLowerCase()),
    )
  ) {
    return {
      ok: false as const,
      message: 'That post was blocked by the local moderation filter.',
      feedbackState,
      authState,
      remainingMs: 0,
    }
  }

  if (
    adminState.spamProtectionEnabled &&
    feedbackState.posts.some(
      (post) =>
        post.category === category &&
        post.body.toLowerCase() === loweredBody &&
        post.accountName === (activeAccount?.name ?? null),
    )
  ) {
    return {
      ok: false as const,
      message: 'That looks like a duplicate post.',
      feedbackState,
      authState,
      remainingMs: 0,
    }
  }

  const post = buildFeedbackPost(
    category,
    normalizedBody,
    now,
    activeAccount?.name ?? null,
  )
  const nextFeedbackState: FeedbackState = {
    posts: [post, ...feedbackState.posts].slice(0, MAX_FEEDBACK_POSTS),
  }
  const nextAuthState =
    cooldownField && activeAccount
      ? updateAccountSubmissionCooldown(authState, activeAccount.name, cooldownField, now)
      : authState

  return {
    ok: true as const,
    message: getFeedbackSuccessMessage(category),
    feedbackState: nextFeedbackState,
    authState: nextAuthState,
    remainingMs: 0,
  }
}
