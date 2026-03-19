import { ADMIN_USERNAME, setAdminRuntimeState } from '../src/game/admin.ts'
import { LEADERBOARD_CATEGORIES } from '../src/game/auth.ts'
import { getXpProgress } from '../src/game/xp.ts'
import type {
  AccountStats,
  AdminState,
  AnonymousProfile,
  AuthAccount,
  LeaderboardBadge,
  LeaderboardCategory,
  LeaderboardEntry,
  LeaderboardSnapshot,
} from '../src/game/types.ts'

interface LeaderboardRowCandidate {
  name: string
  accountName: string | null
  xp: number
  stats: AccountStats
  badges?: LeaderboardBadge[]
  nameColor?: string | null
  featured?: boolean
  pinned?: boolean
  admin?: boolean
  bot?: boolean
}

interface RankedRow extends LeaderboardEntry {
  sortPrimary: number
  sortSecondary: number
  ascending: boolean
  empty: boolean
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

const hasMeaningfulProgress = (xp: number, stats: AccountStats) =>
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

const buildRow = (
  candidate: LeaderboardRowCandidate,
  category: LeaderboardCategory,
): RankedRow => {
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

export const buildLeaderboardSnapshots = ({
  accounts,
  anonymousProfiles,
  adminState,
}: {
  accounts: AuthAccount[]
  anonymousProfiles: AnonymousProfile[]
  adminState: AdminState
}): LeaderboardSnapshot[] => {
  setAdminRuntimeState(adminState)

  const badgeDefinitions = Object.fromEntries(
    adminState.badges.map((badge) => [badge.id, badge]),
  )
  const pinnedNames = new Set(
    adminState.leaderboardPinnedNames.map((name) => name.trim().toLowerCase()),
  )
  const highlightedNames = new Set(
    adminState.leaderboardHighlightNames.map((name) => name.trim().toLowerCase()),
  )

  const candidates: LeaderboardRowCandidate[] = accounts
    .filter((account) => !account.hiddenFromLeaderboard)
    .map((account) => {
      const normalizedName = account.name.trim()
      const loweredName = normalizedName.toLowerCase()
      const isAdmin = normalizedName === ADMIN_USERNAME
      const displayBadges = [
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
        (badge, index, list) => list.findIndex((entry) => entry.id === badge.id) === index,
      )

      return {
        name: normalizedName || 'Anonymous',
        accountName: normalizedName || null,
        xp: account.xp,
        stats: account.stats,
        badges: displayBadges,
        nameColor: account.nameColor,
        featured: account.featured || highlightedNames.has(loweredName),
        pinned: account.featured || pinnedNames.has(loweredName),
        admin: isAdmin,
        bot: false,
      }
    })

  for (const profile of anonymousProfiles) {
    if (
      profile.hiddenFromLeaderboard ||
      !hasMeaningfulProgress(profile.xp, profile.stats)
    ) {
      continue
    }

    candidates.push({
      name: profile.alias?.trim() || `Anonymous ${profile.id}`,
      accountName: null,
      xp: profile.xp,
      stats: profile.stats,
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

  return LEADERBOARD_CATEGORIES.map((category) => {
    const rows = candidates.map((candidate) => buildRow(candidate, category.id))
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
      .filter((row) => category.id !== 'average-reaction' || !row.empty)
      .map(
        ({
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
        }): LeaderboardEntry => ({
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
        }),
      )

    return {
      id: category.id,
      label: category.label,
      entries: rankedRows,
    }
  })
}
