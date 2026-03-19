import type {
  AdminState,
  AuthAccount,
  AuthState,
  CommunitySnapshotResponse,
  FeedbackMutationRequest,
  FeedbackMutationResponse,
  FeedbackState,
  LeaderboardSnapshot,
  ProgressionSyncRequest,
  ProgressionSyncResponse,
  SessionBootstrapRequest,
  SessionBootstrapResponse,
} from './types.ts'

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

  const payload = (await response.json()) as T & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Request failed.')
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

export const syncProgressionToServer = (payload: ProgressionSyncRequest) =>
  apiRequest<ProgressionSyncResponse>('/api/progression/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

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
