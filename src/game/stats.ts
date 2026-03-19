import { average, median } from './math.js'
import type {
  BehaviorId,
  GameSettings,
  LifetimeStats,
  PeekSpeedId,
  RecentResult,
  SessionHistoryEntry,
  SessionStats,
  SessionSummary,
  WeaponMode,
} from './types.js'

export const createEmptyWeaponUsage = (): Record<WeaponMode, number> => ({
  awp: 0,
  ssg08: 0,
  scar20: 0,
})

export const createEmptySessionStats = (): SessionStats => ({
  hits: 0,
  misses: 0,
  failedReps: 0,
  wallbangHits: 0,
  headshots: 0,
  repsCompleted: 0,
  successes: 0,
  reactionTimes: [],
  recentResults: [],
  lastSuccessful: null,
  best: null,
  average: null,
  median: null,
  accuracy: 0,
})

export const createEmptyLifetimeStats = (): LifetimeStats => ({
  totalSessions: 0,
  totalHits: 0,
  totalMisses: 0,
  totalFailedReps: 0,
  totalWallbangHits: 0,
  totalHeadshots: 0,
  totalSuccesses: 0,
  cumulativeReactionMs: 0,
  allTimeBest: null,
  weaponUsage: createEmptyWeaponUsage(),
  subSecondReactionMsTotal: 0,
  subSecondReactionCount: 0,
})

export const getFavoriteWeapon = (lifetime: LifetimeStats): WeaponMode => {
  const ranking = Object.entries(lifetime.weaponUsage) as Array<[WeaponMode, number]>
  const favorite = ranking.reduce<[WeaponMode, number]>(
    (best, current) => {
      if (current[1] > best[1]) {
        return current
      }

      return best
    },
    ['awp', lifetime.weaponUsage.awp],
  )

  return favorite[1] > 0 ? favorite[0] : 'awp'
}

export const getAverageShotTime = (lifetime: LifetimeStats): number | null =>
  lifetime.subSecondReactionCount > 0
    ? lifetime.subSecondReactionMsTotal / lifetime.subSecondReactionCount
    : null

const withDerived = (stats: SessionStats): SessionStats => {
  const shotCount = stats.hits + stats.misses
  return {
    ...stats,
    average: average(stats.reactionTimes),
    median: median(stats.reactionTimes),
    best:
      stats.reactionTimes.length > 0 ? Math.min(...stats.reactionTimes) : null,
    accuracy: shotCount > 0 ? (stats.hits / shotCount) * 100 : 0,
  }
}

export const recordMiss = (stats: SessionStats): SessionStats =>
  withDerived({
    ...stats,
    misses: stats.misses + 1,
  })

export const recordFailure = (stats: SessionStats): SessionStats =>
  withDerived({
    ...stats,
    failedReps: stats.failedReps + 1,
    repsCompleted: stats.repsCompleted + 1,
  })

export const recordSuccess = (
  stats: SessionStats,
  reactionTime: number,
  result: RecentResult,
) =>
  withDerived({
    ...stats,
    hits: stats.hits + 1,
    repsCompleted: stats.repsCompleted + 1,
    successes: stats.successes + 1,
    wallbangHits: stats.wallbangHits + (result.wallbang ? 1 : 0),
    headshots: stats.headshots + (result.headshot ? 1 : 0),
    reactionTimes: [...stats.reactionTimes, reactionTime],
    recentResults: [result, ...stats.recentResults].slice(0, 14),
    lastSuccessful: reactionTime,
  })

export const recordResolvedRep = (
  stats: SessionStats,
  {
    rep,
    behavior,
    speed,
    killResults,
    failed,
  }: {
    rep: number
    behavior: BehaviorId
    speed: PeekSpeedId
    killResults: Array<Pick<RecentResult, 'reactionTime' | 'wallbang' | 'headshot'>>
    failed: boolean
  },
) => {
  const recentResults = killResults
    .map((result) => ({
      rep,
      behavior,
      speed,
      reactionTime: result.reactionTime,
      wallbang: result.wallbang,
      headshot: result.headshot,
    }))
    .reverse()
  const wallbangHits = killResults.reduce(
    (total, result) => total + (result.wallbang ? 1 : 0),
    0,
  )
  const headshots = killResults.reduce(
    (total, result) => total + (result.headshot ? 1 : 0),
    0,
  )
  const reactionTimes = killResults.map((result) => result.reactionTime)
  const lastSuccessful =
    reactionTimes.length > 0
      ? reactionTimes[reactionTimes.length - 1]
      : stats.lastSuccessful

  return withDerived({
    ...stats,
    hits: stats.hits + killResults.length,
    failedReps: stats.failedReps + (failed ? 1 : 0),
    repsCompleted: stats.repsCompleted + 1,
    successes: stats.successes + killResults.length,
    wallbangHits: stats.wallbangHits + wallbangHits,
    headshots: stats.headshots + headshots,
    reactionTimes: [...stats.reactionTimes, ...reactionTimes],
    recentResults: [...recentResults, ...stats.recentResults].slice(0, 14),
    lastSuccessful,
  })
}

export const recordLifetimeMiss = (lifetime: LifetimeStats): LifetimeStats => ({
  ...lifetime,
  totalMisses: lifetime.totalMisses + 1,
})

export const recordLifetimeShot = (
  lifetime: LifetimeStats,
  weapon: WeaponMode,
): LifetimeStats => ({
  ...lifetime,
  weaponUsage: {
    ...lifetime.weaponUsage,
    [weapon]: lifetime.weaponUsage[weapon] + 1,
  },
})

export const recordLifetimeFailure = (
  lifetime: LifetimeStats,
): LifetimeStats => ({
  ...lifetime,
  totalFailedReps: lifetime.totalFailedReps + 1,
})

export const recordLifetimeSuccess = (
  lifetime: LifetimeStats,
  reactionTime: number,
  wallbang: boolean,
  headshot: boolean,
): LifetimeStats => ({
  ...lifetime,
  totalHits: lifetime.totalHits + 1,
  totalWallbangHits: lifetime.totalWallbangHits + (wallbang ? 1 : 0),
  totalHeadshots: lifetime.totalHeadshots + (headshot ? 1 : 0),
  totalSuccesses: lifetime.totalSuccesses + 1,
  cumulativeReactionMs: lifetime.cumulativeReactionMs + reactionTime,
  subSecondReactionMsTotal:
    lifetime.subSecondReactionMsTotal + (reactionTime < 1000 ? reactionTime : 0),
  subSecondReactionCount:
    lifetime.subSecondReactionCount + (reactionTime < 1000 ? 1 : 0),
  allTimeBest:
    lifetime.allTimeBest === null
      ? reactionTime
      : Math.min(lifetime.allTimeBest, reactionTime),
})

export const recordLifetimeSession = (
  lifetime: LifetimeStats,
): LifetimeStats => ({
  ...lifetime,
  totalSessions: lifetime.totalSessions + 1,
})

export const buildSessionHistoryEntry = (
  settings: GameSettings,
  stats: SessionStats,
  completedAt: number,
): SessionHistoryEntry => ({
  id: `${completedAt}`,
  completedAt,
  mode: settings.mode,
  weapon: settings.weapon,
  sessionType: settings.sessionType,
  repsCompleted: stats.repsCompleted,
  successes: stats.successes,
  average: stats.average,
  best: stats.best,
  accuracy: stats.accuracy,
  wallbangHits: stats.wallbangHits,
  headshots: stats.headshots,
})

export const buildSessionSummary = (
  settings: GameSettings,
  stats: SessionStats,
  completedAt: number,
): SessionSummary => ({
  completedAt,
  mode: settings.mode,
  weapon: settings.weapon,
  sessionType: settings.sessionType,
  targetReps: settings.sessionLength,
  stats,
})
