import {
  CAMERA_BASE,
  CAMERA_BASE_YAW,
  CAMERA_FOV,
  CAMERA_PITCH_LIMIT,
  CAMERA_SCOPE_FOV_LEVEL_1,
  CAMERA_SCOPE_FOV_LEVEL_2,
  VIEW_YAW_LIMIT,
  WEAPON_PROPERTIES,
  withDerivedMode,
} from './constants'
import { buildEnemyHitboxes, evaluateVisibility, raycastEnemyHit } from './hitDetection'
import { clamp, directionFromAngles, lerp } from './math'
import { createRepPlan, getBehaviorDescription } from './patterns'
import { evaluateAttemptScore } from './scoring'
import {
  buildSessionHistoryEntry,
  buildSessionSummary,
  createEmptySessionStats,
  getAverageShotTime,
  getFavoriteWeapon,
  recordFailure,
  recordLifetimeFailure,
  recordLifetimeMiss,
  recordLifetimeShot,
  recordLifetimeSession,
  recordLifetimeSuccess,
  recordMiss,
  recordResolvedRep,
  recordSuccess,
} from './stats'
import { evaluateShotReward, getXpProgress } from './xp'
import type {
  EnemyHitboxes,
  EnemyPlan,
  EnemyStance,
  ScopeLevel,
} from './types'
import type {
  GamePhase,
  GameSettings,
  GameSnapshot,
  LifetimeStats,
  PracticeMessage,
  RoundResult,
  SessionHistoryEntry,
  SessionStats,
  SessionSummary,
  ShotFeedback,
  Vector3,
  WeaponMode,
} from './types'

export interface RuntimeEnemyState {
  id: string
  role: EnemyPlan['role']
  behavior: EnemyPlan['behavior']
  position: Vector3
  stance: EnemyStance
  hitboxes: EnemyHitboxes
  visibleFraction: number
  openVisibleFraction: number
  doorFraction: number
  throughDoor: boolean
  targetable: boolean
  visibleToPlayer: boolean
  openVisible: boolean
  alive: boolean
  exited: boolean
  preferDoor: boolean
}

export interface RuntimeRepState {
  plan: ReturnType<typeof createRepPlan>
  queuedAt: number
  liveAt: number
  firstVisibleAt: Record<string, number | undefined>
  firstDoorEligibleAt: Record<string, number | undefined>
  deadIds: Set<string>
  penaltyMs: number
  shotsFired: number
  missesBeforeHit: number
  attemptXpGained: number
  eligibleTargetIds: Set<string>
  enemyHealthById: Record<string, number>
  enemies: RuntimeEnemyState[]
  roundStart:
    | {
        targetCount: number
        killEvents: Array<{
          reactionTime: number
          headshot: boolean
          wallbang: boolean
        }>
      }
    | null
}

export interface GameRuntime {
  settings: GameSettings
  phase: GamePhase
  pointerLocked: boolean
  accountName: string | null
  accountXp: number
  currentRep: number
  sessionGoal: number | null
  stats: SessionStats
  history: SessionHistoryEntry[]
  lifetime: LifetimeStats
  summary: SessionSummary | null
  lastResult: RoundResult | null
  currentMessage: PracticeMessage | null
  shotFeedback: ShotFeedback | null
  rep: RuntimeRepState | null
  nextRepAt: number | null
  weaponCooldownUntil: number
  persistenceVersion: number
  lastUpdateAt: number
  aim: {
    yaw: number
    pitch: number
    recoil: number
    inaccuracy: number
  }
  scope: {
    level: ScopeLevel
    visualLevel: number
  }
}

export interface FireOutcome {
  fired: boolean
  hit: boolean
  scored: boolean
  headshot: boolean
  wallbang: boolean
}

const neutralMessage = (detail: string): PracticeMessage => ({
  title: 'Hold The Lane',
  detail,
  tone: 'neutral',
})

const isRoundStartBehavior = (behavior: string | null | undefined) =>
  behavior === 'round-start'

const getAverageReactionTime = (reactionTimes: number[]) =>
  reactionTimes.length > 0
    ? reactionTimes.reduce((total, reactionTime) => total + reactionTime, 0) /
      reactionTimes.length
    : null

const samplePlan = (
  plan: EnemyPlan,
  elapsedMs: number,
  hitboxScale: number,
): RuntimeEnemyState => {
  const first = plan.keyframes[0]
  const last = plan.keyframes[plan.keyframes.length - 1]
  const exited = elapsedMs > plan.despawnAt
  const clampedTime = clamp(elapsedMs, first.at, last.at)
  const nextIndex = plan.keyframes.findIndex((keyframe) => keyframe.at >= clampedTime)
  const index = nextIndex <= 0 ? 0 : nextIndex - 1
  const current = plan.keyframes[index]
  const next = plan.keyframes[Math.min(index + 1, plan.keyframes.length - 1)]
  const span = Math.max(next.at - current.at, 1)
  const progress = clamp((clampedTime - current.at) / span, 0, 1)
  const stance = progress > 0.5 ? next.stance : current.stance
  const position = {
    x: lerp(current.x, next.x, progress),
    y: lerp(current.y, next.y, progress),
    z: lerp(current.z, next.z, progress),
  }

  return {
    id: plan.id,
    role: plan.role,
    behavior: plan.behavior,
    position,
    stance,
    hitboxes: buildEnemyHitboxes(position, stance, hitboxScale),
    visibleFraction: 0,
    openVisibleFraction: 0,
    doorFraction: 0,
    throughDoor: false,
    targetable: false,
    visibleToPlayer: false,
    openVisible: false,
    alive: true,
    exited,
    preferDoor: plan.preferDoor,
  }
}

const updateRepEnemies = (runtime: GameRuntime, now: number) => {
  if (!runtime.rep) {
    return
  }

  const elapsedMs = Math.max(now - runtime.rep.liveAt, 0)
  const origin = getCameraPose(runtime).position

  runtime.rep.enemies = runtime.rep.plan.enemies.map((plan) => {
    const sampled = samplePlan(
      plan,
      elapsedMs,
      runtime.settings.difficulty.hitboxScale,
    )

    if (runtime.rep?.deadIds.has(plan.id)) {
      return {
        ...sampled,
        alive: false,
      }
    }

    const visibility = evaluateVisibility(origin, sampled.hitboxes)
    const visibleFraction = runtime.settings.doorVisibilityAssist
      ? visibility.assistedVisibleFraction
      : visibility.openVisibleFraction
    const openVisible = visibility.openVisibleFraction >= 0.1
    const visibleToPlayer = visibleFraction >= 0.1

    return {
      ...sampled,
      visibleFraction,
      openVisibleFraction: visibility.openVisibleFraction,
      doorFraction: visibility.doorFraction,
      throughDoor: visibility.throughDoor,
      targetable: visibility.engageable && !sampled.exited,
      visibleToPlayer: visibleToPlayer && !sampled.exited,
      openVisible: openVisible && !sampled.exited,
    }
  })
}

const queueNextRep = (runtime: GameRuntime, now: number) => {
  runtime.currentRep += 1
  const plan = createRepPlan(runtime.currentRep, runtime.settings)
  runtime.phase = 'preround'
  runtime.rep = {
    plan,
    queuedAt: now,
    liveAt: now + plan.preRoundDelayMs,
    firstVisibleAt: {},
    firstDoorEligibleAt: {},
    deadIds: new Set(),
    penaltyMs: 0,
    shotsFired: 0,
    missesBeforeHit: 0,
    attemptXpGained: 0,
    eligibleTargetIds: new Set(plan.eligibleTargetIds),
    enemyHealthById: Object.fromEntries(
      plan.enemies.map((enemy) => [enemy.id, WEAPON_PROPERTIES[runtime.settings.weapon].maxHealth]),
    ),
    enemies: [],
    roundStart: isRoundStartBehavior(plan.behavior)
      ? {
          targetCount: plan.eligibleTargetIds.length,
          killEvents: [],
        }
      : null,
  }
  runtime.nextRepAt = null
  runtime.lastResult = null
  runtime.shotFeedback = null
  runtime.currentMessage = neutralMessage(
    `${getBehaviorDescription(plan.behavior, plan.speed)} queued. Hold your line and react only when the peek commits into the lane.`,
  )
  updateRepEnemies(runtime, now)
}

const finalizeSession = (runtime: GameRuntime, now: number) => {
  const historyEntry = buildSessionHistoryEntry(runtime.settings, runtime.stats, now)
  runtime.history = [historyEntry, ...runtime.history].slice(0, 12)
  runtime.lifetime = recordLifetimeSession(runtime.lifetime)
  runtime.summary = buildSessionSummary(runtime.settings, runtime.stats, now)
  runtime.phase = 'summary'
  runtime.rep = null
  runtime.nextRepAt = null
  runtime.lastResult = null
  runtime.currentMessage = {
    title: 'Session Complete',
    detail: 'Review the summary, then reset to run another lane-hold block.',
    tone: 'good',
  }
  runtime.persistenceVersion += 1
}

const buildRoundResult = (
  runtime: GameRuntime,
  success: boolean,
  reactionTime: number | null,
  headshot: boolean,
  wallbang: boolean,
  xpGained: number,
): RoundResult | null => {
  if (!runtime.rep) {
    return null
  }

  const killCount = success ? 1 : 0
  const accuracy =
    runtime.rep.shotsFired > 0 ? (killCount / runtime.rep.shotsFired) * 100 : 0
  const { total, breakdown } = evaluateAttemptScore({
    success,
    reactionTime,
    headshot,
    wallbang,
    behavior: runtime.rep.plan.behavior,
    speed: runtime.rep.plan.speed,
    weapon: runtime.settings.weapon,
    missesBeforeHit: runtime.rep.missesBeforeHit,
    shotsFired: runtime.rep.shotsFired,
    doorVisibilityAssist: runtime.settings.doorVisibilityAssist,
  })

  return {
    success,
    reactionTime,
    wallbang,
    headshot,
    weapon: runtime.settings.weapon,
    behavior: runtime.rep.plan.behavior,
    speed: runtime.rep.plan.speed,
    score: total,
    xpGained,
    shotsFired: runtime.rep.shotsFired,
    missesBeforeHit: runtime.rep.missesBeforeHit,
    killCount,
    totalTargets: 1,
    averageReactionTime: reactionTime,
    accuracy,
    headshotCount: headshot ? 1 : 0,
    wallbangCount: wallbang ? 1 : 0,
    killReactionTimes: success && reactionTime !== null ? [reactionTime] : [],
    doorVisibilityAssist: runtime.settings.doorVisibilityAssist,
    breakdown,
  }
}

const buildRoundStartResult = (
  runtime: GameRuntime,
  success: boolean,
): RoundResult | null => {
  if (!runtime.rep) {
    return null
  }

  const killEvents = runtime.rep.roundStart?.killEvents ?? []
  const killReactionTimes = killEvents.map((killEvent) => killEvent.reactionTime)
  const killCount = killEvents.length
  const totalTargets = runtime.rep.roundStart?.targetCount ?? runtime.rep.eligibleTargetIds.size
  const averageReactionTime = getAverageReactionTime(killReactionTimes)
  const headshotCount = killEvents.reduce(
    (total, killEvent) => total + (killEvent.headshot ? 1 : 0),
    0,
  )
  const wallbangCount = killEvents.reduce(
    (total, killEvent) => total + (killEvent.wallbang ? 1 : 0),
    0,
  )
  const accuracy =
    runtime.rep.shotsFired > 0 ? (killCount / runtime.rep.shotsFired) * 100 : 0
  const { total, breakdown } = evaluateAttemptScore({
    success,
    reactionTime: averageReactionTime,
    headshot: headshotCount > 0,
    wallbang: wallbangCount > 0,
    behavior: runtime.rep.plan.behavior,
    speed: runtime.rep.plan.speed,
    weapon: runtime.settings.weapon,
    missesBeforeHit: runtime.rep.missesBeforeHit,
    shotsFired: runtime.rep.shotsFired,
    doorVisibilityAssist: runtime.settings.doorVisibilityAssist,
  })

  return {
    success,
    reactionTime: averageReactionTime,
    wallbang: wallbangCount > 0,
    headshot: headshotCount > 0,
    weapon: runtime.settings.weapon,
    behavior: runtime.rep.plan.behavior,
    speed: runtime.rep.plan.speed,
    score: total,
    xpGained: runtime.rep.attemptXpGained,
    shotsFired: runtime.rep.shotsFired,
    missesBeforeHit: runtime.rep.missesBeforeHit,
    killCount,
    totalTargets,
    averageReactionTime,
    accuracy,
    headshotCount,
    wallbangCount,
    killReactionTimes,
    doorVisibilityAssist: runtime.settings.doorVisibilityAssist,
    breakdown,
  }
}

const finalizeRoundStartAttempt = (
  runtime: GameRuntime,
  success: boolean,
  detail: string,
) => {
  if (!runtime.rep) {
    return
  }

  const killEvents = runtime.rep.roundStart?.killEvents ?? []
  runtime.stats = recordResolvedRep(runtime.stats, {
    rep: runtime.currentRep,
    behavior: runtime.rep.plan.behavior,
    speed: runtime.rep.plan.speed,
    killResults: killEvents,
    failed: !success,
  })

  let lifetime = runtime.lifetime
  for (const killEvent of killEvents) {
    lifetime = recordLifetimeSuccess(
      lifetime,
      killEvent.reactionTime,
      killEvent.wallbang,
      killEvent.headshot,
    )
  }
  if (!success) {
    lifetime = recordLifetimeFailure(lifetime)
  }
  runtime.lifetime = lifetime
  runtime.phase = 'result'
  runtime.nextRepAt = null
  runtime.lastResult = buildRoundStartResult(runtime, success)
  runtime.currentMessage = {
    title: success ? 'Sequence Cleared' : 'Round Start Ended',
    detail,
    tone: success ? 'good' : 'bad',
  }
  runtime.persistenceVersion += 1
}

const resolveFailure = (runtime: GameRuntime, now: number, detail: string) => {
  if (isRoundStartBehavior(runtime.rep?.plan.behavior)) {
    finalizeRoundStartAttempt(runtime, false, detail)
    return
  }

  runtime.stats = recordFailure(runtime.stats)
  runtime.lifetime = recordLifetimeFailure(runtime.lifetime)
  runtime.phase = 'cooldown'
  runtime.nextRepAt = now + 900
  runtime.lastResult = null
  runtime.currentMessage = {
    title: 'Failed Rep',
    detail,
    tone: 'bad',
  }
  runtime.persistenceVersion += 1
}

const resolveSuccess = (
  runtime: GameRuntime,
  enemyId: string,
  headshot: boolean,
  wallbang: boolean,
  reactionTime: number,
  xpGained: number,
) => {
  if (!runtime.rep) {
    return
  }

  runtime.rep.enemyHealthById[enemyId] = 0
  runtime.rep.deadIds.add(enemyId)

  if (isRoundStartBehavior(runtime.rep.plan.behavior)) {
    runtime.rep.roundStart?.killEvents.push({
      reactionTime,
      headshot,
      wallbang,
    })

    const killCount = runtime.rep.roundStart?.killEvents.length ?? 0
    const totalTargets = runtime.rep.roundStart?.targetCount ?? runtime.rep.eligibleTargetIds.size

    if (killCount >= totalTargets) {
      finalizeRoundStartAttempt(
        runtime,
        true,
        `Cleared all ${totalTargets} enemies in the Round Start sequence.`,
      )
      return
    }

    runtime.currentMessage = {
      title: 'Sequence Live',
      detail: `${killCount} / ${totalTargets} down. Stay ready for the remaining crossers.`,
      tone: 'good',
    }
    runtime.persistenceVersion += 1
    return
  }

  runtime.stats = recordSuccess(runtime.stats, reactionTime, {
    rep: runtime.currentRep,
    behavior: runtime.rep.plan.behavior,
    speed: runtime.rep.plan.speed,
    reactionTime,
    wallbang,
    headshot,
  })

  runtime.lifetime = recordLifetimeSuccess(
    runtime.lifetime,
    reactionTime,
    wallbang,
    headshot,
  )
  runtime.phase = 'result'
  runtime.nextRepAt = null
  runtime.lastResult = buildRoundResult(
    runtime,
    true,
    reactionTime,
    headshot,
    wallbang,
    xpGained,
  )
  runtime.currentMessage = {
    title: wallbang ? 'Wallbang Counted' : 'Valid Hit',
    detail: `${Math.round(reactionTime)} ms${headshot ? ' headshot' : ''}${
      wallbang ? ' through a penetrable door panel.' : '.'
    }`,
    tone: 'good',
  }
  runtime.persistenceVersion += 1
}

const getReactionStartAt = (
  runtime: GameRuntime,
  enemyId: string,
  wallbang: boolean,
) => {
  if (!runtime.rep) {
    return undefined
  }

  const currentEnemy = runtime.rep.enemies.find((enemy) => enemy.id === enemyId)
  const visibleAt = runtime.rep.firstVisibleAt[enemyId]
  const doorEligibleAt = runtime.rep.firstDoorEligibleAt[enemyId]

  return (
    visibleAt ??
    (wallbang ? doorEligibleAt : undefined) ??
    (currentEnemy?.visibleToPlayer ? runtime.lastUpdateAt : undefined) ??
    (wallbang && currentEnemy?.targetable ? runtime.lastUpdateAt : undefined)
  )
}

const setShotFeedback = (
  runtime: GameRuntime,
  now: number,
  title: string,
  detail: string | null,
  tone: PracticeMessage['tone'],
  xpGained: number,
  xpLabel: string,
  headshot: boolean,
  wallbang: boolean,
  scored: boolean,
) => {
  runtime.shotFeedback = {
    title,
    detail,
    tone,
    at: now,
    xpGained,
    xpLabel,
    scored,
    wallbang,
    headshot,
  }
}

const addAttemptXp = (runtime: GameRuntime, xpGained: number) => {
  if (!runtime.rep) {
    return
  }

  runtime.rep.attemptXpGained += Math.max(0, xpGained)
}

const applyMissPunishment = (runtime: GameRuntime, now: number) => {
  switch (runtime.settings.difficulty.missPunishment) {
    case 'time':
      if (runtime.rep) {
        runtime.rep.penaltyMs += 120
      }
      runtime.currentMessage = {
        title: 'Missed Shot',
        detail:
          'Timer stays live, but this mode adds a time penalty for every miss.',
        tone: 'warn',
      }
      break
    case 'fail':
      resolveFailure(
        runtime,
        now,
        'Miss punishment is set to fail. The rep ended without a logged reaction time.',
      )
      break
    case 'none':
    default:
      runtime.currentMessage = {
        title: 'Missed Shot',
        detail:
          'No reaction time was shown because the shot missed. The rep is still live until you land a valid hit.',
        tone: 'warn',
      }
  }
}

export const createGameRuntime = (
  settings: GameSettings,
  history: SessionHistoryEntry[],
  lifetime: LifetimeStats,
): GameRuntime => ({
  settings: withDerivedMode(settings),
  phase: 'menu',
  pointerLocked: false,
  accountName: null,
  accountXp: 0,
  currentRep: 0,
  sessionGoal: null,
  stats: createEmptySessionStats(),
  history,
  lifetime,
  summary: null,
  lastResult: null,
  currentMessage: neutralMessage(
    'Click start, lock your cursor, and hold the lane for a live target.',
  ),
  shotFeedback: null,
  rep: null,
  nextRepAt: null,
  weaponCooldownUntil: 0,
  persistenceVersion: 0,
  lastUpdateAt: performance.now(),
  aim: {
    yaw: 0,
    pitch: 0,
    recoil: 0,
    inaccuracy: 0,
  },
  scope: {
    level: 0,
    visualLevel: 0,
  },
})

export const setAccountSession = (
  runtime: GameRuntime,
  accountName: string | null,
  accountXp: number,
) => {
  runtime.accountName = accountName
  runtime.accountXp = accountName ? Math.max(0, Math.round(accountXp)) : 0
}

export const applySettings = (runtime: GameRuntime, settings: GameSettings) => {
  runtime.settings = withDerivedMode(settings)
  const yawLimit = VIEW_YAW_LIMIT * settings.difficulty.horizontalAimRange
  runtime.aim.yaw = clamp(runtime.aim.yaw, -yawLimit, yawLimit)
  if (!settings.difficulty.verticalAimEnabled) {
    runtime.aim.pitch = 0
  } else {
    runtime.aim.pitch = clamp(runtime.aim.pitch, -CAMERA_PITCH_LIMIT, CAMERA_PITCH_LIMIT)
  }

  runtime.weaponCooldownUntil = Math.min(runtime.weaponCooldownUntil, runtime.lastUpdateAt)
}

export const setPointerLocked = (runtime: GameRuntime, pointerLocked: boolean) => {
  runtime.pointerLocked = pointerLocked
}

const getScopeSensitivityMultiplier = (runtime: GameRuntime) => {
  const configuredMultiplier = clamp(
    runtime.settings.scopeSensitivityMultiplier,
    0.3,
    1.25,
  )

  switch (runtime.scope.level) {
    case 2:
      return 0.48 * configuredMultiplier
    case 1:
      return 0.74 * configuredMultiplier
    default:
      return 1
  }
}

export const updateAimFromDelta = (
  runtime: GameRuntime,
  deltaX: number,
  deltaY: number,
) => {
  const yawLimit = VIEW_YAW_LIMIT * runtime.settings.difficulty.horizontalAimRange
  const sensitivity =
    clamp(runtime.settings.mouseSensitivity, 0.2, 2.5) *
    getScopeSensitivityMultiplier(runtime)

  runtime.aim.yaw = clamp(
    runtime.aim.yaw + deltaX * 0.00135 * sensitivity,
    -yawLimit,
    yawLimit,
  )

  if (runtime.settings.difficulty.verticalAimEnabled) {
    runtime.aim.pitch = clamp(
      runtime.aim.pitch - deltaY * 0.0011 * sensitivity,
      -CAMERA_PITCH_LIMIT,
      CAMERA_PITCH_LIMIT,
    )
  }
}

export const updateAimFromAbsolute = (
  runtime: GameRuntime,
  normalizedX: number,
  normalizedY: number,
) => {
  const yawLimit = VIEW_YAW_LIMIT * runtime.settings.difficulty.horizontalAimRange
  const sensitivity = getScopeSensitivityMultiplier(runtime)

  runtime.aim.yaw = clamp(normalizedX * yawLimit * sensitivity, -yawLimit, yawLimit)
  runtime.aim.pitch = runtime.settings.difficulty.verticalAimEnabled
    ? clamp(
        -normalizedY * CAMERA_PITCH_LIMIT * sensitivity,
        -CAMERA_PITCH_LIMIT,
        CAMERA_PITCH_LIMIT,
      )
    : 0
}

export const cycleScopeLevel = (runtime: GameRuntime) => {
  runtime.scope.level = ((runtime.scope.level + 1) % 3) as ScopeLevel
}

export const startSession = (runtime: GameRuntime, now: number) => {
  runtime.stats = createEmptySessionStats()
  runtime.summary = null
  runtime.lastResult = null
  runtime.currentRep = 0
  runtime.sessionGoal = runtime.settings.sessionLength
  runtime.shotFeedback = null
  runtime.weaponCooldownUntil = 0
  runtime.nextRepAt = null
  runtime.aim.recoil = 0
  runtime.aim.inaccuracy = 0
  queueNextRep(runtime, now)
}

export const resetToMenu = (runtime: GameRuntime) => {
  runtime.phase = 'menu'
  runtime.currentRep = 0
  runtime.sessionGoal = null
  runtime.stats = createEmptySessionStats()
  runtime.summary = null
  runtime.lastResult = null
  runtime.rep = null
  runtime.nextRepAt = null
  runtime.scope.level = 0
  runtime.scope.visualLevel = 0
  runtime.shotFeedback = null
  runtime.aim.recoil = 0
  runtime.aim.inaccuracy = 0
  runtime.currentMessage = neutralMessage(
    'Pick a mode, tune the settings, and start a fresh session.',
  )
}

export const skipToNextRep = (runtime: GameRuntime, now: number) => {
  if (runtime.phase === 'summary') {
    startSession(runtime, now)
    return
  }

  if (runtime.phase === 'result') {
    if (runtime.sessionGoal !== null && runtime.stats.repsCompleted >= runtime.sessionGoal) {
      finalizeSession(runtime, now)
      return
    }

    queueNextRep(runtime, now)
    return
  }

  if (runtime.phase === 'menu') {
    startSession(runtime, now)
    return
  }

  if (
    runtime.phase === 'cooldown' ||
    runtime.phase === 'preround' ||
    (runtime.phase === 'active' && runtime.rep === null)
  ) {
    if (runtime.sessionGoal !== null && runtime.stats.repsCompleted >= runtime.sessionGoal) {
      finalizeSession(runtime, now)
      return
    }

    queueNextRep(runtime, now)
  }
}

const getScopedFov = (scopeLevel: number) => {
  if (scopeLevel <= 0) {
    return CAMERA_FOV
  }

  if (scopeLevel <= 1) {
    return lerp(CAMERA_FOV, CAMERA_SCOPE_FOV_LEVEL_1, scopeLevel)
  }

  return lerp(
    CAMERA_SCOPE_FOV_LEVEL_1,
    CAMERA_SCOPE_FOV_LEVEL_2,
    clamp(scopeLevel - 1, 0, 1),
  )
}

export const getCameraPose = (runtime: GameRuntime) => {
  const weaponRecoil = runtime.aim.recoil

  return {
    position: {
      x: CAMERA_BASE.x,
      y: CAMERA_BASE.y,
      z: CAMERA_BASE.z,
    },
    yaw: CAMERA_BASE_YAW + runtime.aim.yaw,
    pitch: runtime.aim.pitch + weaponRecoil,
    fov: runtime.settings.scopedView
      ? getScopedFov(runtime.scope.visualLevel)
      : CAMERA_FOV,
  }
}

export const updateRuntime = (runtime: GameRuntime, now: number) => {
  runtime.lastUpdateAt = now
  if (runtime.shotFeedback && now - runtime.shotFeedback.at > 1350) {
    runtime.shotFeedback = null
  }
  runtime.aim.recoil = lerp(runtime.aim.recoil, 0, 0.16)
  runtime.aim.inaccuracy = lerp(
    runtime.aim.inaccuracy,
    0,
    WEAPON_PROPERTIES[runtime.settings.weapon].accuracyRecovery,
  )
  runtime.scope.visualLevel = lerp(runtime.scope.visualLevel, runtime.scope.level, 0.22)

  if (
    runtime.phase === 'menu' ||
    runtime.phase === 'summary' ||
    runtime.phase === 'result'
  ) {
    return
  }

  if (!runtime.rep) {
    return
  }

  updateRepEnemies(runtime, now)

  if (runtime.phase === 'preround' && now >= runtime.rep.liveAt) {
    runtime.phase = 'active'
    runtime.currentMessage = {
      title: 'Rep Live',
      detail: isRoundStartBehavior(runtime.rep.plan.behavior)
        ? 'The Round Start sequence is live. Clear the crossing pack before the sequence ends.'
        : 'A live target can appear at any moment. Only a valid hit will stop the rep.',
      tone: 'neutral',
    }
  }

  if (runtime.phase === 'active') {
    let eligibleAlive = 0
    let visibleExposure = false
    let visibleThroughDoor = false

    for (const enemy of runtime.rep.enemies) {
      if (
        runtime.rep.deadIds.has(enemy.id) ||
        !runtime.rep.eligibleTargetIds.has(enemy.id)
      ) {
        continue
      }

      if (!enemy.exited) {
        eligibleAlive += 1
      }

      if (enemy.targetable) {
        if (enemy.throughDoor && runtime.rep.firstDoorEligibleAt[enemy.id] === undefined) {
          runtime.rep.firstDoorEligibleAt[enemy.id] = now
        }

        if (enemy.visibleToPlayer) {
          visibleExposure = true
          visibleThroughDoor ||= enemy.throughDoor && !enemy.openVisible

          if (runtime.rep.firstVisibleAt[enemy.id] === undefined) {
            runtime.rep.firstVisibleAt[enemy.id] = now
          }
        }
      }
    }

    if (!eligibleAlive) {
      resolveFailure(
        runtime,
        now,
        'The active target left the mid-door zone before you landed a valid hit.',
      )
    } else if (!visibleExposure) {
      runtime.currentMessage = {
        title: 'Hold The Lane',
        detail: 'Stay disciplined and hold the mid-door angle. Wait for a real exposure or read the wallbang timing yourself.',
        tone: 'neutral',
      }
    } else if (visibleThroughDoor) {
      runtime.currentMessage = {
        title: 'Wallhack Active',
        detail: 'You are seeing the target through the doors because Wallhack is enabled.',
        tone: 'neutral',
      }
    } else {
      runtime.currentMessage = {
        title: isRoundStartBehavior(runtime.rep.plan.behavior)
          ? 'Sequence Committed'
          : 'Target Committed',
        detail: isRoundStartBehavior(runtime.rep.plan.behavior)
          ? 'The crossing lane is open. Clear the remaining enemies before the sequence ends.'
          : 'The enemy is exposed in the opening. Land a clean hit to stop the rep.',
        tone: 'neutral',
      }
    }
  }

  if (runtime.phase === 'cooldown' && runtime.nextRepAt !== null && now >= runtime.nextRepAt) {
    if (
      runtime.sessionGoal !== null &&
      runtime.stats.repsCompleted >= runtime.sessionGoal
    ) {
      finalizeSession(runtime, now)
      return
    }

    queueNextRep(runtime, now)
  }
}

const randomSpread = (amount: number) => (Math.random() * 2 - 1) * amount

const getShotDirection = (
  runtime: GameRuntime,
  camera: ReturnType<typeof getCameraPose>,
  weapon: (typeof WEAPON_PROPERTIES)[keyof typeof WEAPON_PROPERTIES],
) => {
  let spread = weapon.spread + runtime.aim.inaccuracy

  if (runtime.scope.level === 0) {
    spread *= weapon.unscopedSpreadMultiplier
  } else if (runtime.scope.level === 1) {
    spread *= weapon.scopeOneSpreadMultiplier
  } else {
    spread *= weapon.scopeTwoSpreadMultiplier
  }

  return directionFromAngles(
    camera.yaw + randomSpread(spread),
    camera.pitch + randomSpread(spread * 0.78),
  )
}

interface WeaponHitResolution {
  damageDealt: number
  damaged: boolean
  scored: boolean
  killed: boolean
  feedbackTitle: string
  feedbackDetail: string | null
}

const getWeaponBodyShotResolution = (
  runtime: GameRuntime,
  weaponMode: WeaponMode,
  enemyId: string,
  damageDealt: number,
): WeaponHitResolution => {
  switch (weaponMode) {
    case 'awp':
      return {
        damageDealt,
        damaged: true,
        scored: true,
        killed: true,
        feedbackTitle: 'Hit',
        feedbackDetail: null,
      }
    case 'ssg08':
      return {
        damageDealt,
        damaged: true,
        scored: false,
        killed: false,
        feedbackTitle: 'Body Shot',
        feedbackDetail: `${damageDealt} damage dealt`,
      }
    case 'scar20': {
      if (!runtime.rep) {
        return {
          damageDealt,
          damaged: true,
          scored: false,
          killed: false,
          feedbackTitle: 'Body Shot',
          feedbackDetail: `${damageDealt} damage dealt`,
        }
      }

      const currentHealth =
        runtime.rep.enemyHealthById[enemyId] ?? WEAPON_PROPERTIES.scar20.maxHealth
      const nextHealth = Math.max(currentHealth - damageDealt, 0)
      runtime.rep.enemyHealthById[enemyId] = nextHealth

      return {
        damageDealt,
        damaged: true,
        scored: nextHealth <= 0,
        killed: nextHealth <= 0,
        feedbackTitle: nextHealth <= 0 ? 'Hit' : 'Body Shot',
        feedbackDetail:
          nextHealth <= 0 ? null : `${damageDealt} damage dealt`,
      }
    }
    default:
      return {
        damageDealt,
        damaged: true,
        scored: false,
        killed: false,
        feedbackTitle: 'Body Shot',
        feedbackDetail: `${damageDealt} damage dealt`,
      }
  }
}

export const fireShot = (runtime: GameRuntime, now: number): FireOutcome => {
  if (
    (runtime.phase !== 'active' && runtime.phase !== 'preround') ||
    !runtime.rep ||
    now < runtime.weaponCooldownUntil
  ) {
    return {
      fired: false,
      hit: false,
      scored: false,
      headshot: false,
      wallbang: false,
    }
  }

  const weapon = WEAPON_PROPERTIES[runtime.settings.weapon]
  const camera = getCameraPose(runtime)
  const direction = getShotDirection(runtime, camera, weapon)
  runtime.weaponCooldownUntil = now + weapon.cooldownMs
  runtime.rep.shotsFired += 1
  runtime.lifetime = recordLifetimeShot(runtime.lifetime, runtime.settings.weapon)
  if (runtime.settings.enableRecoil) {
    runtime.aim.recoil += weapon.recoilKick * Math.max(runtime.settings.recoilStrength, 0)
  }
  runtime.aim.inaccuracy = clamp(
    runtime.aim.inaccuracy + weapon.spread * 0.42,
    0,
    0.045,
  )

  const hit = raycastEnemyHit(
    camera.position,
    direction,
    runtime.rep.enemies
      .filter((enemy) => enemy.alive && !enemy.exited)
      .map((enemy) => ({ id: enemy.id, hitboxes: enemy.hitboxes })),
    weapon.penetration,
  )

  if (!hit) {
    const reward = evaluateShotReward({
      scored: false,
      damaged: false,
      headshot: false,
      wallbang: false,
      reactionTime: null,
      behavior: runtime.rep.plan.behavior,
      speed: runtime.rep.plan.speed,
      weapon: runtime.settings.weapon,
      doorVisibilityAssist: runtime.settings.doorVisibilityAssist,
    })
    const xpGained = runtime.accountName ? reward.xpGained : 0
    const xpLabel = runtime.accountName ? `+${xpGained} XP` : 'Login for XP'

    runtime.stats = recordMiss(runtime.stats)
    runtime.lifetime = recordLifetimeMiss(runtime.lifetime)
    runtime.accountXp += xpGained
    addAttemptXp(runtime, xpGained)
    runtime.rep.missesBeforeHit += 1
    setShotFeedback(
      runtime,
      now,
      reward.title,
      null,
      reward.tone,
      xpGained,
      xpLabel,
      false,
      false,
      false,
    )
    runtime.persistenceVersion += 1
    applyMissPunishment(runtime, now)
    return {
      fired: true,
      hit: false,
      scored: false,
      headshot: false,
      wallbang: false,
    }
  }

  const validTarget = runtime.rep.eligibleTargetIds.has(hit.enemyId)
  const headshot = hit.region === 'head'
  const reactionStartAt =
    validTarget
      ? getReactionStartAt(runtime, hit.enemyId, hit.wallbang)
      : undefined
  const reactionTime =
    reactionStartAt !== undefined && runtime.rep
      ? now - reactionStartAt + runtime.rep.penaltyMs
      : null

  if (!validTarget) {
    const reward = evaluateShotReward({
      scored: false,
      damaged: false,
      headshot: false,
      wallbang: false,
      reactionTime: null,
      behavior: runtime.rep.plan.behavior,
      speed: runtime.rep.plan.speed,
      weapon: runtime.settings.weapon,
      doorVisibilityAssist: runtime.settings.doorVisibilityAssist,
    })
    const xpGained = runtime.accountName ? reward.xpGained : 0
    const xpLabel = runtime.accountName ? `+${xpGained} XP` : 'Login for XP'

    runtime.stats = recordMiss(runtime.stats)
    runtime.lifetime = recordLifetimeMiss(runtime.lifetime)
    runtime.rep.missesBeforeHit += 1
    runtime.accountXp += xpGained
    addAttemptXp(runtime, xpGained)
    setShotFeedback(
      runtime,
      now,
      'Decoy Hit',
      'Primary target is still live',
      'warn',
      xpGained,
      xpLabel,
      false,
      false,
      false,
    )
    runtime.currentMessage = {
      title: 'Decoy Hit',
      detail:
        'A secondary target was hit, but only the primary live target counts in this rep.',
      tone: 'warn',
    }
    runtime.persistenceVersion += 1
    return {
      fired: true,
      hit: false,
      scored: false,
      headshot,
      wallbang: hit.wallbang,
    }
  }

  if (reactionTime === null) {
    const reward = evaluateShotReward({
      scored: false,
      damaged: false,
      headshot: false,
      wallbang: false,
      reactionTime: null,
      behavior: runtime.rep.plan.behavior,
      speed: runtime.rep.plan.speed,
      weapon: runtime.settings.weapon,
      doorVisibilityAssist: runtime.settings.doorVisibilityAssist,
    })
    const xpGained = runtime.accountName ? reward.xpGained : 0
    const xpLabel = runtime.accountName ? `+${xpGained} XP` : 'Login for XP'

    runtime.stats = recordMiss(runtime.stats)
    runtime.lifetime = recordLifetimeMiss(runtime.lifetime)
    runtime.rep.missesBeforeHit += 1
    runtime.accountXp += xpGained
    addAttemptXp(runtime, xpGained)
    setShotFeedback(
      runtime,
      now,
      'Too Early',
      'Damage landed before a valid reaction window',
      'warn',
      xpGained,
      xpLabel,
      false,
      false,
      false,
    )
    runtime.currentMessage = {
      title: 'Pre-fire Did Not Count',
      detail:
        'The shot connected before the rep had a valid visible or door-timing window, so the run stays live.',
      tone: 'warn',
    }
    runtime.persistenceVersion += 1
    return {
      fired: true,
      hit: true,
      scored: false,
      headshot,
      wallbang: hit.wallbang,
    }
  }

  const damageDealt = headshot ? weapon.headDamage : weapon.bodyDamage
  const resolution: WeaponHitResolution = headshot
    ? {
        damageDealt,
        damaged: true,
        scored: true,
        killed: true,
        feedbackTitle: 'Headshot',
        feedbackDetail: null,
      }
    : getWeaponBodyShotResolution(
        runtime,
        runtime.settings.weapon,
        hit.enemyId,
        damageDealt,
      )
  const feedbackDetail =
    resolution.feedbackDetail === null
      ? null
      : hit.wallbang && !resolution.scored
        ? `${resolution.feedbackDetail} through door`
        : resolution.feedbackDetail
  const reward = evaluateShotReward({
    scored: resolution.scored,
    damaged: resolution.damaged && !resolution.scored,
    headshot,
    wallbang: hit.wallbang && resolution.scored,
    reactionTime: resolution.scored ? reactionTime : null,
    behavior: runtime.rep.plan.behavior,
    speed: runtime.rep.plan.speed,
    weapon: runtime.settings.weapon,
    doorVisibilityAssist: runtime.settings.doorVisibilityAssist,
  })
  const xpGained = runtime.accountName ? reward.xpGained : 0
  const xpLabel = runtime.accountName ? `+${xpGained} XP` : 'Login for XP'

  runtime.accountXp += xpGained
  addAttemptXp(runtime, xpGained)
  setShotFeedback(
    runtime,
    now,
    reward.title,
    feedbackDetail,
    reward.tone,
    xpGained,
    xpLabel,
    headshot && resolution.scored,
    hit.wallbang && resolution.scored,
    resolution.scored,
  )

  if (!resolution.scored) {
    runtime.currentMessage = {
      title: resolution.feedbackTitle,
      detail:
        runtime.settings.weapon === 'ssg08'
          ? 'Scoped damage landed, but only a headshot converts the SSG-08.'
          : 'Damage landed. One more body shot or any headshot will finish with the SCAR-20.',
      tone: reward.tone,
    }
    runtime.persistenceVersion += 1
    return {
      fired: true,
      hit: true,
      scored: false,
      headshot,
      wallbang: hit.wallbang,
    }
  }

  if (runtime.rep) {
    runtime.rep.firstVisibleAt[hit.enemyId] = reactionStartAt
  }

  resolveSuccess(
    runtime,
    hit.enemyId,
    headshot,
    hit.wallbang,
    reactionTime,
    xpGained,
  )

  return {
    fired: true,
    hit: true,
    scored: true,
    headshot,
    wallbang: hit.wallbang,
  }
}

export const getSnapshot = (runtime: GameRuntime): GameSnapshot => {
  const activeEnemies =
    runtime.rep?.enemies.filter((enemy) =>
      runtime.rep?.eligibleTargetIds.has(enemy.id),
    ) ?? []

  const visible = activeEnemies.some((enemy) => enemy.visibleToPlayer)
  const door = activeEnemies.some((enemy) => enemy.targetable && enemy.throughDoor)
  const visibleThroughDoor = activeEnemies.some(
    (enemy) => enemy.visibleToPlayer && enemy.throughDoor && !enemy.openVisible,
  )
  const xp = runtime.accountName === null ? null : getXpProgress(runtime.accountXp)

  return {
    phase: runtime.phase,
    pointerLocked: runtime.pointerLocked,
    accountName: runtime.accountName,
    repNumber: runtime.currentRep,
    sessionGoal: runtime.sessionGoal,
    repsRemaining:
      runtime.sessionGoal === null
        ? null
        : Math.max(runtime.sessionGoal - runtime.currentRep, 0),
    currentBehavior: runtime.rep?.plan.behavior ?? null,
    currentSpeed: runtime.rep?.plan.speed ?? runtime.settings.selectedSpeed,
    designedWallbang: runtime.rep?.plan.designedWallbang ?? false,
    currentMessage: runtime.currentMessage,
    stats: runtime.stats,
    summary: runtime.summary,
    lastResult: runtime.lastResult,
    history: runtime.history,
    lifetime: runtime.lifetime,
    activeTargetVisible: visible,
    activeTargetDoor: door,
    activeTargetVisibleThroughDoor: visibleThroughDoor,
    shotFeedback: runtime.shotFeedback,
    xp,
    readyToFire:
      (runtime.phase === 'active' || runtime.phase === 'preround') &&
      runtime.lastUpdateAt >= runtime.weaponCooldownUntil,
    scopeLevel: runtime.scope.level,
    favoriteWeapon: getFavoriteWeapon(runtime.lifetime),
    averageShotTimeMs: getAverageShotTime(runtime.lifetime),
    persistenceVersion: runtime.persistenceVersion,
  }
}
