import type {
  AdminState,
  AuthAccount,
  AuthState,
  CommunitySnapshotResponse,
  FeedbackMutationRequest,
  FeedbackMutationResponse,
  FeedbackState,
  ProgressionBatchSyncRequest,
  ProgressionBatchSyncResponse,
  LeaderboardSnapshot,
  SessionBootstrapRequest,
  SessionBootstrapResponse,
} from './types.js'

const apiRequest = async <T>(
  input: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(input, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  })

  const raw = await response.text()
  let payload = {} as T & { message?: string }

  if (raw) {
    try {
      payload = JSON.parse(raw) as T & { message?: string }
    } catch {
      payload = { message: raw } as T & { message?: string }
    }
  }

  if (!response.ok) {
    throw new Error(
      payload.message ??
        (raw || 'Request failed.'),
    )
  }

  return payload
}

export const bootstrapSessionFromServer = (payload?: SessionBootstrapRequest) =>
  apiRequest<SessionBootstrapResponse>('/api/session/bootstrap', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  })

export const fetchLeaderboardsFromServer = async () => {
  const payload = await apiRequest<{ leaderboards: LeaderboardSnapshot[] }>(
    '/api/leaderboards',
  )
  return payload.leaderboards
}

export const fetchCommunityFromServer = () =>
  apiRequest<CommunitySnapshotResponse>('/api/community')

export const registerOnServer = (payload: {
  name: string
  password: string
  legacyAccount?: AuthAccount | null
}) =>
  apiRequest<{
    ok: boolean
    message: string
    authState: AuthState
  }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const loginOnServer = (payload: {
  name: string
  password: string
  legacyAccount?: AuthAccount | null
}) =>
  apiRequest<{
    ok: boolean
    message: string
    authState: AuthState
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const logoutOnServer = () =>
  apiRequest<{
    authState: AuthState
    message: string
  }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })

export const syncProgressionBatchToServer = (
  payload: ProgressionBatchSyncRequest,
  init?: RequestInit,
) =>
  apiRequest<ProgressionBatchSyncResponse>('/api/progression/batch', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...init,
  })

export const sendProgressionBatchBeacon = (payload: ProgressionBatchSyncRequest) => {
  if (typeof navigator === 'undefined') {
    return false
  }

  const body = new Blob([JSON.stringify(payload)], {
    type: 'application/json',
  })
  return navigator.sendBeacon('/api/progression/batch', body)
}

export const submitFeedbackToServer = (payload: FeedbackMutationRequest) =>
  apiRequest<FeedbackMutationResponse>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const syncAdminStateToServer = (adminState: AdminState) =>
  apiRequest<{ adminState: AdminState }>('/api/admin/state', {
    method: 'POST',
    body: JSON.stringify({ adminState }),
  })

export const syncAdminFeedbackStateToServer = (feedbackState: FeedbackState) =>
  apiRequest<{ feedbackState: FeedbackState }>('/api/admin/feedback', {
    method: 'POST',
    body: JSON.stringify({ feedbackState }),
  })

export const syncAdminAuthStateToServer = (authState: AuthState) =>
  apiRequest<{ authState: AuthState }>('/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify({ authState }),
  })
