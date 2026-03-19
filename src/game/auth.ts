import type {
  AccountSubmissionCooldowns,
  AccountStats,
  AnonymousProfile,
  AuthAccount,
  AuthState,
} from './types.js'

const AUTH_STORAGE_KEY = 'midlane-reaction-auth'
export const ANONYMOUS_DISPLAY_NAME = 'Anonymous'
const ANONYMOUS_ID_LENGTH = 3
const OPAQUE_ID_LENGTH = 10

const sanitizeName = (value: string) => value.trim()
const createOpaqueId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 2 + OPAQUE_ID_LENGTH)}`
const createAnonymousId = () =>
  Math.floor(Math.random() * 10 ** ANONYMOUS_ID_LENGTH)
    .toString()
    .padStart(ANONYMOUS_ID_LENGTH, '0')

const normalizeAnonymousId = (value: unknown) => {
  const digits =
    typeof value === 'string'
      ? value.replace(/\D/g, '').slice(-ANONYMOUS_ID_LENGTH)
      : ''

  return digits ? digits.padStart(ANONYMOUS_ID_LENGTH, '0') : createAnonymousId()
}

const findAccountIndex = (accounts: AuthAccount[], name: string) =>
  accounts.findIndex(
    (account) => account.name.toLowerCase() === name.trim().toLowerCase(),
  )

export const createEmptyAccountStats = (): AccountStats => ({
  shots: 0,
  kills: 0,
  headshots: 0,
  wallbangs: 0,
  cumulativeReactionMs: 0,
  qualifyingReactionMs: 0,
  qualifyingReactionCount: 0,
  fastestReactionMs: null,
  bestScore: 0,
})

export const createEmptyAccountSubmissionCooldowns = (): AccountSubmissionCooldowns => ({
  bugReportAt: null,
  featureRequestAt: null,
})

export const createEmptyAnonymousProfile = (): AnonymousProfile => ({
  profileId: createOpaqueId('anon'),
  id: createAnonymousId(),
  xp: 0,
  stats: createEmptyAccountStats(),
  alias: null,
  adminNotes: [],
})

const normalizeStats = (stats: Partial<AccountStats> | undefined): AccountStats => ({
  ...createEmptyAccountStats(),
  ...stats,
  shots: Number(stats?.shots) || 0,
  kills: Number(stats?.kills) || 0,
  headshots: Number(stats?.headshots) || 0,
  wallbangs: Number(stats?.wallbangs) || 0,
  cumulativeReactionMs: Number(stats?.cumulativeReactionMs) || 0,
  qualifyingReactionMs: Number(stats?.qualifyingReactionMs) || 0,
  qualifyingReactionCount: Number(stats?.qualifyingReactionCount) || 0,
  fastestReactionMs:
    typeof stats?.fastestReactionMs === 'number' ? stats.fastestReactionMs : null,
  bestScore: Number(stats?.bestScore) || 0,
})

const normalizeCooldowns = (
  cooldowns: Partial<AccountSubmissionCooldowns> | undefined,
): AccountSubmissionCooldowns => ({
  ...createEmptyAccountSubmissionCooldowns(),
  bugReportAt:
    typeof cooldowns?.bugReportAt === 'number' ? cooldowns.bugReportAt : null,
  featureRequestAt:
    typeof cooldowns?.featureRequestAt === 'number' ? cooldowns.featureRequestAt : null,
})

const normalizeAnonymousProfile = (
  profile: Partial<AnonymousProfile> | undefined,
): AnonymousProfile => ({
  profileId:
    typeof profile?.profileId === 'string' && profile.profileId.trim()
      ? profile.profileId
      : createOpaqueId('anon'),
  id: normalizeAnonymousId(profile?.id),
  xp: Number(profile?.xp) || 0,
  stats: normalizeStats(profile?.stats),
  alias:
    typeof profile?.alias === 'string' && profile.alias.trim() ? profile.alias : null,
  adminNotes: Array.isArray(profile?.adminNotes)
    ? profile.adminNotes.filter(
        (note): note is string => typeof note === 'string' && note.trim().length > 0,
      )
    : [],
})

export const hasMeaningfulProgress = ({
  xp,
  stats,
}: {
  xp: number
  stats: AccountStats
}) =>
  xp > 0 ||
  stats.shots > 0 ||
  stats.kills > 0 ||
  stats.headshots > 0 ||
  stats.wallbangs > 0 ||
  stats.cumulativeReactionMs > 0 ||
  stats.qualifyingReactionMs > 0 ||
  stats.qualifyingReactionCount > 0 ||
  stats.fastestReactionMs !== null ||
  stats.bestScore > 0

export const createEmptyAuthState = (): AuthState => ({
  accounts: [],
  activeUserName: null,
  anonymousProfile: createEmptyAnonymousProfile(),
})

export const getProfileDisplayName = (name: string | null | undefined) => {
  const normalizedName = typeof name === 'string' ? sanitizeName(name) : ''
  return normalizedName || ANONYMOUS_DISPLAY_NAME
}

export const getAnonymousDisplayName = (id: string) =>
  `${ANONYMOUS_DISPLAY_NAME} ${normalizeAnonymousId(id)}`

export const getAnonymousProfileDisplayName = (profile: AnonymousProfile) =>
  sanitizeName(profile.alias ?? '') || getAnonymousDisplayName(profile.id)

export const loadAuthState = (): AuthState => {
  if (typeof window === 'undefined') {
    return createEmptyAuthState()
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return createEmptyAuthState()
    }

    const parsed = JSON.parse(raw) as Partial<AuthState>
    const accounts = Array.isArray(parsed.accounts)
      ? parsed.accounts.map((account) => ({
          id:
            typeof account.id === 'string' && account.id.trim()
              ? account.id
              : createOpaqueId('acct'),
          name: typeof account.name === 'string' ? account.name : '',
          password: typeof account.password === 'string' ? account.password : '',
          xp: Number(account.xp) || 0,
          stats: normalizeStats(account.stats),
          cooldowns: normalizeCooldowns(account.cooldowns),
          suspended: Boolean(account.suspended),
          banned: Boolean(account.banned),
          strictFeedbackCooldownMinutes:
            typeof account.strictFeedbackCooldownMinutes === 'number'
              ? account.strictFeedbackCooldownMinutes
              : null,
          adminNotes: Array.isArray(account.adminNotes)
            ? account.adminNotes.filter(
                (note): note is string => typeof note === 'string' && note.trim().length > 0,
              )
            : [],
        }))
      : []

    return {
      accounts,
      activeUserName:
        typeof parsed.activeUserName === 'string' &&
        accounts.some((account) => account.name === parsed.activeUserName)
          ? parsed.activeUserName
          : null,
      anonymousProfile: normalizeAnonymousProfile(parsed.anonymousProfile),
    }
  } catch {
    return createEmptyAuthState()
  }
}

export const saveAuthState = (state: AuthState) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
}

export const getActiveAccount = (state: AuthState) =>
  state.accounts.find((account) => account.name === state.activeUserName) ?? null

export const getProgressionProfile = (state: AuthState) => {
  const activeAccount = getActiveAccount(state)

  if (activeAccount) {
    return {
      displayName: getProfileDisplayName(activeAccount.name),
      xp: activeAccount.xp,
      loggedInAccountName: activeAccount.name,
      isAnonymous: false as const,
    }
  }

  return {
    displayName: getAnonymousProfileDisplayName(state.anonymousProfile),
    xp: state.anonymousProfile.xp,
    loggedInAccountName: null,
    isAnonymous: true as const,
  }
}

export const registerAccount = (state: AuthState, name: string, password: string) => {
  const normalizedName = sanitizeName(name)
  const normalizedPassword = password.trim()

  if (!normalizedName || !normalizedPassword) {
    return { ok: false as const, message: 'Name and password are required.', state }
  }

  if (findAccountIndex(state.accounts, normalizedName) >= 0) {
    return { ok: false as const, message: 'That name is already registered.', state }
  }

  const transferringAnonymousProgress =
    state.activeUserName === null && hasMeaningfulProgress(state.anonymousProfile)

  return {
    ok: true as const,
    message: transferringAnonymousProgress
      ? `Logged in as ${normalizedName}. Anonymous progression transferred into the new account.`
      : `Logged in as ${normalizedName}. New account ready.`,
    state: {
      accounts: [
        ...state.accounts,
        {
          id: createOpaqueId('acct'),
          name: normalizedName,
          password: normalizedPassword,
          xp: transferringAnonymousProgress ? state.anonymousProfile.xp : 0,
          stats: transferringAnonymousProgress
            ? normalizeStats(state.anonymousProfile.stats)
            : createEmptyAccountStats(),
          cooldowns: createEmptyAccountSubmissionCooldowns(),
          suspended: false,
          banned: false,
          strictFeedbackCooldownMinutes: null,
          adminNotes: [],
        },
      ],
      activeUserName: normalizedName,
      anonymousProfile: transferringAnonymousProgress
        ? createEmptyAnonymousProfile()
        : state.anonymousProfile,
    },
  }
}

export const loginAccount = (state: AuthState, name: string, password: string) => {
  const normalizedName = sanitizeName(name)
  const index = findAccountIndex(state.accounts, normalizedName)

  if (index < 0) {
    return { ok: false as const, message: 'Account not found.', state }
  }

  if (state.accounts[index].password !== password.trim()) {
    return { ok: false as const, message: 'Wrong password.', state }
  }

  if (state.accounts[index].banned) {
    return { ok: false as const, message: 'That account is banned from this local system.', state }
  }

  if (state.accounts[index].suspended) {
    return { ok: false as const, message: 'That account is suspended right now.', state }
  }

  return {
    ok: true as const,
    message: `Logged in as ${state.accounts[index].name}. Using saved local progression.`,
    state: {
      ...state,
      activeUserName: state.accounts[index].name,
    },
  }
}

export const logoutAccount = (state: AuthState): AuthState => ({
  ...state,
  activeUserName: null,
})

export const updateAccountSubmissionCooldown = (
  state: AuthState,
  userName: string | null,
  cooldown: keyof AccountSubmissionCooldowns,
  submittedAt: number,
): AuthState => {
  if (!userName) {
    return state
  }

  const index = findAccountIndex(state.accounts, userName)
  if (index < 0) {
    return state
  }

  const accounts = [...state.accounts]
  accounts[index] = {
    ...accounts[index],
    cooldowns: {
      ...accounts[index].cooldowns,
      [cooldown]: submittedAt,
    },
  }

  return {
    ...state,
    accounts,
  }
}

export interface AccountProgressUpdate {
  xp: number
  shotsDelta: number
  killsDelta: number
  headshotsDelta: number
  wallbangsDelta: number
  reactionTime: number | null
  reactionTimes?: number[] | null
  score: number | null
}

export const updateAccountProgress = (
  state: AuthState,
  userName: string | null,
  update: AccountProgressUpdate,
): AuthState => {
  const normalizedReactionTimes =
    update.reactionTimes?.filter(
      (reactionTime): reactionTime is number =>
        typeof reactionTime === 'number' && Number.isFinite(reactionTime) && reactionTime > 0,
    ) ??
    (typeof update.reactionTime === 'number' && Number.isFinite(update.reactionTime)
      ? [update.reactionTime]
      : [])
  const qualifyingReactionTimes = normalizedReactionTimes.filter(
    (reactionTime) => reactionTime < 1000,
  )
  const fastestReaction =
    normalizedReactionTimes.length > 0 ? Math.min(...normalizedReactionTimes) : null
  const nextXp = Math.max(0, Math.round(update.xp))

  const updateStats = (current: AccountStats): AccountStats => ({
    shots: current.shots + Math.max(update.shotsDelta, 0),
    kills: current.kills + Math.max(update.killsDelta, 0),
    headshots: current.headshots + Math.max(update.headshotsDelta, 0),
    wallbangs: current.wallbangs + Math.max(update.wallbangsDelta, 0),
    cumulativeReactionMs:
      current.cumulativeReactionMs +
      normalizedReactionTimes.reduce((total, reactionTime) => total + reactionTime, 0),
    qualifyingReactionMs:
      current.qualifyingReactionMs +
      qualifyingReactionTimes.reduce((total, reactionTime) => total + reactionTime, 0),
    qualifyingReactionCount: current.qualifyingReactionCount + qualifyingReactionTimes.length,
    fastestReactionMs:
      fastestReaction === null
        ? current.fastestReactionMs
        : current.fastestReactionMs === null
          ? fastestReaction
          : Math.min(current.fastestReactionMs, fastestReaction),
    bestScore: Math.max(current.bestScore, update.score ?? 0),
  })

  if (!userName) {
    return {
      ...state,
      anonymousProfile: {
        ...state.anonymousProfile,
        xp: nextXp,
        stats: updateStats(state.anonymousProfile.stats),
      },
    }
  }

  const index = findAccountIndex(state.accounts, userName)
  if (index < 0) {
    return state
  }

  const accounts = [...state.accounts]
  accounts[index] = {
    ...accounts[index],
    xp: nextXp,
    stats: updateStats(accounts[index].stats),
  }

  return {
    ...state,
    accounts,
  }
}
