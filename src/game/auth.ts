import { ADMIN_USERNAME, getAdminRuntimeState } from './admin'
import { getXpProgress } from './xp'
import type {
  AccountSubmissionCooldowns,
  AccountStats,
  AnonymousProfile,
  AuthAccount,
  AuthState,
  LeaderboardCategory,
  LeaderboardCategoryOption,
  LeaderboardEntry,
} from './types'

const AUTH_STORAGE_KEY = 'midlane-reaction-auth'
export const ANONYMOUS_LEADERBOARD_NAME = 'Anonymous'
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
  hiddenFromLeaderboard: false,
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
    typeof cooldowns?.featureRequestAt === 'number'
      ? cooldowns.featureRequestAt
      : null,
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
  hiddenFromLeaderboard: Boolean(profile?.hiddenFromLeaderboard),
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
  anonymousProfile: createEmptyAnonymousProfile(),
})

export const getLeaderboardDisplayName = (name: string | null | undefined) => {
  const normalizedName = typeof name === 'string' ? sanitizeName(name) : ''
  return normalizedName || ANONYMOUS_LEADERBOARD_NAME
}

export const getAnonymousDisplayName = (id: string) =>
  `${ANONYMOUS_LEADERBOARD_NAME} ${normalizeAnonymousId(id)}`

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
          badges: Array.isArray(account.badges)
            ? account.badges.filter(
                (badge): badge is string => typeof badge === 'string' && badge.trim().length > 0,
              )
            : [],
          featured: Boolean(account.featured),
          suspended: Boolean(account.suspended),
          banned: Boolean(account.banned),
          hiddenFromLeaderboard: Boolean(account.hiddenFromLeaderboard),
          strictFeedbackCooldownMinutes:
            typeof account.strictFeedbackCooldownMinutes === 'number'
              ? account.strictFeedbackCooldownMinutes
              : null,
          nameColor:
            typeof account.nameColor === 'string' && account.nameColor.trim()
              ? account.nameColor
              : null,
          adminNotes: Array.isArray(account.adminNotes)
            ? account.adminNotes.filter(
                (note): note is string => typeof note === 'string' && note.trim().length > 0,
              )
            : [],
        }))
      : []
    const activeUserName =
      typeof parsed.activeUserName === 'string' &&
      accounts.some((account) => account.name === parsed.activeUserName)
        ? parsed.activeUserName
        : null

    return {
      accounts,
      activeUserName,
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
      displayName: getLeaderboardDisplayName(activeAccount.name),
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

  const transferringAnonymousProgress =
    state.activeUserName === null && hasMeaningfulProgress(state.anonymousProfile)
  const nextState: AuthState = {
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
        badges: [],
        featured: false,
        suspended: false,
        banned: false,
        hiddenFromLeaderboard: false,
        strictFeedbackCooldownMinutes: null,
        nameColor: null,
        adminNotes: [],
      },
    ],
    activeUserName: normalizedName,
    anonymousProfile: transferringAnonymousProgress
      ? createEmptyAnonymousProfile()
      : state.anonymousProfile,
  }

  return {
    ok: true as const,
    message: transferringAnonymousProgress
      ? `Logged in as ${normalizedName}. Anonymous progression transferred into the new account.`
      : `Logged in as ${normalizedName}. New account ready.`,
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

  if (state.accounts[index].banned) {
    return {
      ok: false as const,
      message: 'That account is banned from this local system.',
      state,
    }
  }

  if (state.accounts[index].suspended) {
    return {
      ok: false as const,
      message: 'That account is suspended right now.',
      state,
    }
  }

  return {
    ok: true as const,
    message: `Logged in as ${state.accounts[index].name}. Using saved account progression.`,
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
    if (state.anonymousProfile.xp === xp) {
      return state
    }

    return {
      ...state,
      anonymousProfile: {
        ...state.anonymousProfile,
        xp,
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
    xp,
  }

  return {
    ...state,
    accounts,
  }
}

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
  const hasNoMeaningfulChange =
    update.shotsDelta <= 0 &&
    update.killsDelta <= 0 &&
    update.headshotsDelta <= 0 &&
    update.wallbangsDelta <= 0 &&
    normalizedReactionTimes.length === 0 &&
    (update.score === null || update.score === undefined)

  if (!userName) {
    const current = state.anonymousProfile
    if (current.xp === nextXp && hasNoMeaningfulChange) {
      return state
    }

    return {
      ...state,
      anonymousProfile: {
        ...current,
        xp: nextXp,
        stats: {
          shots: current.stats.shots + Math.max(update.shotsDelta, 0),
          kills: current.stats.kills + Math.max(update.killsDelta, 0),
          headshots: current.stats.headshots + Math.max(update.headshotsDelta, 0),
          wallbangs: current.stats.wallbangs + Math.max(update.wallbangsDelta, 0),
          cumulativeReactionMs:
            current.stats.cumulativeReactionMs +
            normalizedReactionTimes.reduce((total, reactionTime) => total + reactionTime, 0),
          qualifyingReactionMs:
            current.stats.qualifyingReactionMs +
            qualifyingReactionTimes.reduce((total, reactionTime) => total + reactionTime, 0),
          qualifyingReactionCount:
            current.stats.qualifyingReactionCount + qualifyingReactionTimes.length,
          fastestReactionMs:
            fastestReaction === null
              ? current.stats.fastestReactionMs
              : current.stats.fastestReactionMs === null
                ? fastestReaction
                : Math.min(current.stats.fastestReactionMs, fastestReaction),
          bestScore: Math.max(current.stats.bestScore, update.score ?? 0),
        },
      },
    }
  }

  const index = findAccountIndex(state.accounts, userName)
  if (index < 0) {
    return state
  }

  const current = state.accounts[index]
  if (current.xp === nextXp && hasNoMeaningfulChange) {
    return state
  }
  const nextStats: AccountStats = {
    shots: current.stats.shots + Math.max(update.shotsDelta, 0),
    kills: current.stats.kills + Math.max(update.killsDelta, 0),
    headshots: current.stats.headshots + Math.max(update.headshotsDelta, 0),
    wallbangs: current.stats.wallbangs + Math.max(update.wallbangsDelta, 0),
    cumulativeReactionMs:
      current.stats.cumulativeReactionMs +
      normalizedReactionTimes.reduce((total, reactionTime) => total + reactionTime, 0),
    qualifyingReactionMs:
      current.stats.qualifyingReactionMs +
      qualifyingReactionTimes.reduce((total, reactionTime) => total + reactionTime, 0),
    qualifyingReactionCount:
      current.stats.qualifyingReactionCount + qualifyingReactionTimes.length,
    fastestReactionMs:
      fastestReaction === null
        ? current.stats.fastestReactionMs
        : current.stats.fastestReactionMs === null
          ? fastestReaction
          : Math.min(current.stats.fastestReactionMs, fastestReaction),
    bestScore: Math.max(current.stats.bestScore, update.score ?? 0),
  }

  const accounts = [...state.accounts]
  accounts[index] = {
    ...current,
    xp: nextXp,
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

interface LeaderboardRowCandidate {
  name: string
  accountName: string | null
  xp: number
  stats: AccountStats
  badges?: LeaderboardEntry['badges']
  nameColor?: string | null
  featured?: boolean
  pinned?: boolean
  admin?: boolean
  bot?: boolean
}

const buildLeaderboardRow = (
  candidate: LeaderboardRowCandidate,
  category: LeaderboardCategory,
) => {
  const level = getXpProgress(candidate.xp).level
  const averageReaction = getAverageReaction(candidate.stats)
  const accuracy =
    candidate.stats.shots > 0 ? (candidate.stats.kills / candidate.stats.shots) * 100 : null

  switch (category) {
    case 'level':
      return {
        name: candidate.name,
        accountName: candidate.accountName,
        value: `Level ${level}`,
        secondaryValue: `${candidate.xp.toLocaleString()} XP`,
        sortPrimary: level,
        sortSecondary: candidate.xp,
        ascending: false,
        empty: false,
        badges: candidate.badges,
        nameColor: candidate.nameColor,
        featured: candidate.featured,
        pinned: candidate.pinned,
        admin: candidate.admin,
        bot: candidate.bot,
      }
    case 'xp':
      return {
        name: candidate.name,
        accountName: candidate.accountName,
        value: `${candidate.xp.toLocaleString()} XP`,
        secondaryValue: `Level ${level}`,
        sortPrimary: candidate.xp,
        sortSecondary: level,
        ascending: false,
        empty: false,
        badges: candidate.badges,
        nameColor: candidate.nameColor,
        featured: candidate.featured,
        pinned: candidate.pinned,
        admin: candidate.admin,
        bot: candidate.bot,
      }
    case 'kills':
      return {
        name: candidate.name,
        accountName: candidate.accountName,
        value: `${candidate.stats.kills.toLocaleString()} kills`,
        secondaryValue: formatAccuracy(candidate.stats.shots, candidate.stats.kills),
        sortPrimary: candidate.stats.kills,
        sortSecondary: candidate.stats.headshots,
        ascending: false,
        empty: false,
        badges: candidate.badges,
        nameColor: candidate.nameColor,
        featured: candidate.featured,
        pinned: candidate.pinned,
        admin: candidate.admin,
        bot: candidate.bot,
      }
    case 'average-reaction':
      return {
        name: candidate.name,
        accountName: candidate.accountName,
        value: formatMs(averageReaction),
        secondaryValue: `${candidate.stats.qualifyingReactionCount.toLocaleString()} qualifying shots`,
        sortPrimary: averageReaction ?? Number.POSITIVE_INFINITY,
        sortSecondary: candidate.stats.qualifyingReactionCount,
        ascending: true,
        empty: averageReaction === null,
        badges: candidate.badges,
        nameColor: candidate.nameColor,
        featured: candidate.featured,
        pinned: candidate.pinned,
        admin: candidate.admin,
        bot: candidate.bot,
      }
    case 'headshots':
      return {
        name: candidate.name,
        accountName: candidate.accountName,
        value: `${candidate.stats.headshots.toLocaleString()} headshots`,
        secondaryValue: `${candidate.stats.kills.toLocaleString()} kills`,
        sortPrimary: candidate.stats.headshots,
        sortSecondary: candidate.stats.kills,
        ascending: false,
        empty: false,
        badges: candidate.badges,
        nameColor: candidate.nameColor,
        featured: candidate.featured,
        pinned: candidate.pinned,
        admin: candidate.admin,
        bot: candidate.bot,
      }
    case 'wallbangs':
      return {
        name: candidate.name,
        accountName: candidate.accountName,
        value: `${candidate.stats.wallbangs.toLocaleString()} wallbangs`,
        secondaryValue: `${candidate.stats.kills.toLocaleString()} kills`,
        sortPrimary: candidate.stats.wallbangs,
        sortSecondary: candidate.stats.kills,
        ascending: false,
        empty: false,
        badges: candidate.badges,
        nameColor: candidate.nameColor,
        featured: candidate.featured,
        pinned: candidate.pinned,
        admin: candidate.admin,
        bot: candidate.bot,
      }
    case 'best-score':
      return {
        name: candidate.name,
        accountName: candidate.accountName,
        value: formatScore(candidate.stats.bestScore),
        secondaryValue: `${candidate.stats.kills.toLocaleString()} kills`,
        sortPrimary: candidate.stats.bestScore,
        sortSecondary: candidate.stats.kills,
        ascending: false,
        empty: candidate.stats.bestScore <= 0,
        badges: candidate.badges,
        nameColor: candidate.nameColor,
        featured: candidate.featured,
        pinned: candidate.pinned,
        admin: candidate.admin,
        bot: candidate.bot,
      }
    case 'accuracy':
      return {
        name: candidate.name,
        accountName: candidate.accountName,
        value: formatAccuracy(candidate.stats.shots, candidate.stats.kills),
        secondaryValue: `${candidate.stats.kills.toLocaleString()} / ${candidate.stats.shots.toLocaleString()} shots`,
        sortPrimary: accuracy ?? Number.NEGATIVE_INFINITY,
        sortSecondary: candidate.stats.kills,
        ascending: false,
        empty: accuracy === null,
        badges: candidate.badges,
        nameColor: candidate.nameColor,
        featured: candidate.featured,
        pinned: candidate.pinned,
        admin: candidate.admin,
        bot: candidate.bot,
      }
    case 'fastest-reaction':
    default:
      return {
        name: candidate.name,
        accountName: candidate.accountName,
        value: formatMs(candidate.stats.fastestReactionMs),
        secondaryValue: `${candidate.stats.headshots.toLocaleString()} headshots`,
        sortPrimary: candidate.stats.fastestReactionMs ?? Number.POSITIVE_INFINITY,
        sortSecondary: candidate.stats.kills,
        ascending: true,
        empty: candidate.stats.fastestReactionMs === null,
        badges: candidate.badges,
        nameColor: candidate.nameColor,
        featured: candidate.featured,
        pinned: candidate.pinned,
        admin: candidate.admin,
        bot: candidate.bot,
      }
  }
}

export const getLeaderboardEntries = (
  state: AuthState,
  category: LeaderboardCategory,
): LeaderboardEntry[] => {
  const adminState = getAdminRuntimeState()
  const badgeDefinitions = Object.fromEntries(
    adminState.badges.map((badge) => [badge.id, badge]),
  )
  const pinnedNames = new Set(
    adminState.leaderboardPinnedNames.map((name) => name.trim().toLowerCase()),
  )
  const highlightedNames = new Set(
    adminState.leaderboardHighlightNames.map((name) => name.trim().toLowerCase()),
  )
  const candidates: LeaderboardRowCandidate[] = state.accounts
    .filter((account) => !account.hiddenFromLeaderboard)
    .map((account) => {
      const normalizedName = sanitizeName(account.name)
      const isAdmin = normalizedName === ADMIN_USERNAME
      const displayBadges =
        [
          ...account.badges
            .map((badgeId) => badgeDefinitions[badgeId])
            .filter(Boolean)
            .map((badge) => ({
              id: badge.id,
              label: badge.name,
              color: badge.color,
              style: badge.style,
            })),
          ...(isAdmin && adminState.adminBadgeVisible
            ? [
                {
                  id: 'admin',
                  label: 'Admin',
                  color: '#c15cff',
                  style: 'glow' as const,
                },
              ]
            : []),
        ].filter(
          (badge, index, list) => list.findIndex((item) => item.id === badge.id) === index,
        )

      return {
        name: getLeaderboardDisplayName(account.name),
        accountName: normalizedName.length > 0 ? account.name : null,
        xp: account.xp,
        stats: account.stats,
        badges: displayBadges,
        nameColor: account.nameColor,
        featured:
          account.featured || highlightedNames.has(normalizedName.toLowerCase()),
        pinned:
          account.featured || pinnedNames.has(normalizedName.toLowerCase()),
        admin: isAdmin,
        bot: false,
      }
    })

  if (hasMeaningfulProgress(state.anonymousProfile) && !state.anonymousProfile.hiddenFromLeaderboard) {
    candidates.push({
      name: getAnonymousProfileDisplayName(state.anonymousProfile),
      accountName: null,
      xp: state.anonymousProfile.xp,
      stats: state.anonymousProfile.stats,
      featured: false,
      pinned: false,
      admin: false,
      bot: false,
    })
  }

  for (const bot of adminState.bots) {
    if (bot.hidden) {
      continue
    }

    candidates.push({
      name: bot.name,
      accountName: null,
      xp: bot.xp,
      stats: bot.stats,
      badges: [
        {
          id: 'bot',
          label: bot.theme ? `${bot.theme} Bot` : 'Bot',
          color: '#7cb8ff',
          style: 'outline',
        },
      ],
      nameColor: bot.nameColor,
      featured: bot.featured,
      pinned: bot.featured,
      admin: false,
      bot: true,
    })
  }

  const rows = candidates.map((candidate) => buildLeaderboardRow(candidate, category))

  const ascending = rows[0]?.ascending ?? false
  const rankedRows = rows
    .sort((left, right) => {
      if (left.pinned !== right.pinned) {
        return left.pinned ? -1 : 1
      }

      if (left.empty !== right.empty) {
        return left.empty ? 1 : -1
      }

      if (left.sortPrimary !== right.sortPrimary) {
        return ascending
          ? left.sortPrimary - right.sortPrimary
          : right.sortPrimary - left.sortPrimary
      }

      return ascending
        ? left.sortSecondary - right.sortSecondary
        : right.sortSecondary - left.sortSecondary
    })

  return (category === 'average-reaction'
    ? rankedRows.filter((row) => !row.empty)
    : rankedRows)
    .map(({ name, accountName, value, secondaryValue, badges, nameColor, featured, pinned, admin, bot }) => ({
      name,
      accountName,
      value,
      secondaryValue,
      badges,
      nameColor,
      featured,
      pinned,
      admin,
      bot,
    }))
}
