import { getXpProgress } from './xp.ts'
import type {
  AccountStats,
  AuthAccount,
  AuthState,
  LeaderboardCategory,
  LeaderboardCategoryOption,
  LeaderboardEntry,
} from './types.ts'

const AUTH_STORAGE_KEY = 'midlane-reaction-auth'

const sanitizeName = (value: string) => value.trim()

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

export const LEADERBOARD_CATEGORIES: LeaderboardCategoryOption[] = [
  { id: 'level', label: 'Highest Level' },
  { id: 'xp', label: 'Highest XP' },
  { id: 'kills', label: 'Most Kills' },
  { id: 'average-reaction', label: 'Lowest Avg Reaction' },
  { id: 'headshots', label: 'Most Headshots' },
  { id: 'wallbangs', label: 'Most Wallbangs' },
  { id: 'best-score', label: 'Best Score' },
  { id: 'accuracy', label: 'Best Accuracy' },
  { id: 'fastest-reaction', label: 'Fastest Reaction Ever' },
]

export const createEmptyAuthState = (): AuthState => ({
  accounts: [],
  activeUserName: null,
})

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
    return {
      accounts: Array.isArray(parsed.accounts)
        ? parsed.accounts.map((account) => ({
            name: account.name,
            password: account.password,
            xp: Number(account.xp) || 0,
            stats: normalizeStats(account.stats),
          }))
        : [],
      activeUserName:
        typeof parsed.activeUserName === 'string' ? parsed.activeUserName : null,
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

export const registerAccount = (
  state: AuthState,
  name: string,
  password: string,
) => {
  const normalizedName = sanitizeName(name)
  const normalizedPassword = password.trim()

  if (!normalizedName || !normalizedPassword) {
    return {
      ok: false as const,
      message: 'Name and password are required.',
      state,
    }
  }

  if (findAccountIndex(state.accounts, normalizedName) >= 0) {
    return {
      ok: false as const,
      message: 'That name is already registered.',
      state,
    }
  }

  const nextState: AuthState = {
    accounts: [
      ...state.accounts,
        {
          name: normalizedName,
          password: normalizedPassword,
          xp: 0,
          stats: createEmptyAccountStats(),
        },
      ],
      activeUserName: normalizedName,
  }

  return {
    ok: true as const,
    message: `Logged in as ${normalizedName}.`,
    state: nextState,
  }
}

export const loginAccount = (
  state: AuthState,
  name: string,
  password: string,
) => {
  const normalizedName = sanitizeName(name)
  const index = findAccountIndex(state.accounts, normalizedName)

  if (index < 0) {
    return {
      ok: false as const,
      message: 'Account not found.',
      state,
    }
  }

  if (state.accounts[index].password !== password.trim()) {
    return {
      ok: false as const,
      message: 'Wrong password.',
      state,
    }
  }

  return {
    ok: true as const,
    message: `Logged in as ${state.accounts[index].name}.`,
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

export const updateAccountXp = (
  state: AuthState,
  userName: string | null,
  xp: number,
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
    xp,
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
  score: number | null
}

export const updateAccountProgress = (
  state: AuthState,
  userName: string | null,
  update: AccountProgressUpdate,
): AuthState => {
  if (!userName) {
    return state
  }

  const index = findAccountIndex(state.accounts, userName)
  if (index < 0) {
    return state
  }

  const current = state.accounts[index]
  if (
    current.xp === Math.max(0, Math.round(update.xp)) &&
    update.shotsDelta <= 0 &&
    update.killsDelta <= 0 &&
    update.headshotsDelta <= 0 &&
    update.wallbangsDelta <= 0 &&
    (update.reactionTime === null || update.reactionTime === undefined) &&
    (update.score === null || update.score === undefined)
  ) {
    return state
  }

  const nextStats: AccountStats = {
    shots: current.stats.shots + Math.max(update.shotsDelta, 0),
    kills: current.stats.kills + Math.max(update.killsDelta, 0),
    headshots: current.stats.headshots + Math.max(update.headshotsDelta, 0),
    wallbangs: current.stats.wallbangs + Math.max(update.wallbangsDelta, 0),
    cumulativeReactionMs:
      current.stats.cumulativeReactionMs + Math.max(update.reactionTime ?? 0, 0),
    qualifyingReactionMs:
      current.stats.qualifyingReactionMs +
      (update.reactionTime !== null && update.reactionTime < 1000 ? update.reactionTime : 0),
    qualifyingReactionCount:
      current.stats.qualifyingReactionCount +
      (update.reactionTime !== null && update.reactionTime < 1000 ? 1 : 0),
    fastestReactionMs:
      update.reactionTime === null
        ? current.stats.fastestReactionMs
        : current.stats.fastestReactionMs === null
          ? update.reactionTime
          : Math.min(current.stats.fastestReactionMs, update.reactionTime),
    bestScore: Math.max(current.stats.bestScore, update.score ?? 0),
  }

  const accounts = [...state.accounts]
  accounts[index] = {
    ...current,
    xp: Math.max(0, Math.round(update.xp)),
    stats: nextStats,
  }

  return {
    ...state,
    accounts,
  }
}

const formatMs = (value: number | null) =>
  value === null ? '--' : `${Math.round(value)} ms`

const formatAccuracy = (shots: number, kills: number) =>
  shots <= 0 ? '--' : `${((kills / shots) * 100).toFixed(1)}%`

const formatScore = (value: number) =>
  `${Math.max(0, Math.min(100, Math.round(value)))}`

const getAverageReaction = (stats: AccountStats) =>
  stats.qualifyingReactionCount > 0
    ? stats.qualifyingReactionMs / stats.qualifyingReactionCount
    : null

export const getLeaderboardEntries = (
  state: AuthState,
  category: LeaderboardCategory,
): LeaderboardEntry[] => {
  const rows = state.accounts.map((account) => {
    const level = getXpProgress(account.xp).level
    const averageReaction = getAverageReaction(account.stats)
    const accuracy = account.stats.shots > 0 ? (account.stats.kills / account.stats.shots) * 100 : null

    switch (category) {
      case 'level':
        return {
          name: account.name,
          value: `Level ${level}`,
          secondaryValue: `${account.xp.toLocaleString()} XP`,
          sortPrimary: level,
          sortSecondary: account.xp,
          ascending: false,
          empty: false,
        }
      case 'xp':
        return {
          name: account.name,
          value: `${account.xp.toLocaleString()} XP`,
          secondaryValue: `Level ${level}`,
          sortPrimary: account.xp,
          sortSecondary: level,
          ascending: false,
          empty: false,
        }
      case 'kills':
        return {
          name: account.name,
          value: `${account.stats.kills.toLocaleString()} kills`,
          secondaryValue: formatAccuracy(account.stats.shots, account.stats.kills),
          sortPrimary: account.stats.kills,
          sortSecondary: account.stats.headshots,
          ascending: false,
          empty: false,
        }
      case 'average-reaction':
        return {
          name: account.name,
          value: formatMs(averageReaction),
          secondaryValue: `${account.stats.qualifyingReactionCount.toLocaleString()} qualifying shots`,
          sortPrimary: averageReaction ?? Number.POSITIVE_INFINITY,
          sortSecondary: account.stats.qualifyingReactionCount,
          ascending: true,
          empty: averageReaction === null,
        }
      case 'headshots':
        return {
          name: account.name,
          value: `${account.stats.headshots.toLocaleString()} headshots`,
          secondaryValue: `${account.stats.kills.toLocaleString()} kills`,
          sortPrimary: account.stats.headshots,
          sortSecondary: account.stats.kills,
          ascending: false,
          empty: false,
        }
      case 'wallbangs':
        return {
          name: account.name,
          value: `${account.stats.wallbangs.toLocaleString()} wallbangs`,
          secondaryValue: `${account.stats.kills.toLocaleString()} kills`,
          sortPrimary: account.stats.wallbangs,
          sortSecondary: account.stats.kills,
          ascending: false,
          empty: false,
        }
      case 'best-score':
        return {
          name: account.name,
          value: formatScore(account.stats.bestScore),
          secondaryValue: `${account.stats.kills.toLocaleString()} kills`,
          sortPrimary: account.stats.bestScore,
          sortSecondary: account.stats.kills,
          ascending: false,
          empty: account.stats.bestScore <= 0,
        }
      case 'accuracy':
        return {
          name: account.name,
          value: formatAccuracy(account.stats.shots, account.stats.kills),
          secondaryValue: `${account.stats.kills.toLocaleString()} / ${account.stats.shots.toLocaleString()} shots`,
          sortPrimary: accuracy ?? Number.NEGATIVE_INFINITY,
          sortSecondary: account.stats.kills,
          ascending: false,
          empty: accuracy === null,
        }
      case 'fastest-reaction':
      default:
        return {
          name: account.name,
          value: formatMs(account.stats.fastestReactionMs),
          secondaryValue: `${account.stats.headshots.toLocaleString()} headshots`,
          sortPrimary: account.stats.fastestReactionMs ?? Number.POSITIVE_INFINITY,
          sortSecondary: account.stats.kills,
          ascending: true,
          empty: account.stats.fastestReactionMs === null,
        }
    }
  })

  const ascending = rows[0]?.ascending ?? false
  const rankedRows = rows
    .sort((left, right) => {
      if (left.empty !== right.empty) {
        return left.empty ? 1 : -1
      }

      if (left.sortPrimary !== right.sortPrimary) {
        return ascending
          ? left.sortPrimary - right.sortPrimary
          : right.sortPrimary - left.sortPrimary
      }

      return ascending
        ? right.sortSecondary - left.sortSecondary
        : right.sortSecondary - left.sortSecondary
    })

  return (category === 'average-reaction'
    ? rankedRows.filter((row) => !row.empty)
    : rankedRows)
    .map(({ name, value, secondaryValue }) => ({
      name,
      value,
      secondaryValue,
    }))
}
