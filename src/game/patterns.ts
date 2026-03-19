import { formatBehaviorLabel } from './constants.ts'
import { clamp } from './math.ts'
import type {
  BehaviorId,
  EnemyPlan,
  EnemyRole,
  EnemyStance,
  GameSettings,
  MotionKeyframe,
  PeekSpeedId,
  RepPlan,
} from './types.ts'

type LanePatternBehavior = Exclude<BehaviorId, 'round-start'>

interface PatternDefinition {
  baseFrames: PatternFrame[]
  alternateBaseFrames?: PatternFrame[]
  alternateChance?: number
  laneDepthRange: [number, number]
  wallbangOpportunity: boolean
  preferDoor: boolean
  mixedWeight: number
  directional?: boolean
  practiceMirror?: 1 | -1
}

type PatternFrame = [
  at: number,
  x: number,
  zOffset: number,
  yOrStance?: number | EnemyStance,
  stance?: EnemyStance,
]

const weightedPick = <T,>(entries: Array<[T, number]>) => {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = Math.random() * total

  for (const [value, weight] of entries) {
    roll -= weight
    if (roll <= 0) {
      return value
    }
  }

  return entries[entries.length - 1][0]
}

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min)

const midpoint = (min: number, max: number) => (min + max) / 2

const MIXED_ROTATION_ORDER: BehaviorId[] = [
  'cross',
  'mid-hold-peek',
  'jumping-cross',
  'jiggle-peek',
  'double-jiggle-peek',
  'wide-swing',
  'delayed-wide-swing',
  'shoulder-bait',
  'stop-cross',
  'crouch-peek',
  'wallbang-timing-peek',
]

// Anchor Normal to a grounded CS2-style lane-cross pace, then scale the rest around it.
const CS2_NORMAL_BASELINE_TIME_SCALE = 1.46

const SPEED_TIME_SCALE: Record<PeekSpeedId, number> = {
  'very-slow': CS2_NORMAL_BASELINE_TIME_SCALE * 2.05,
  slow: CS2_NORMAL_BASELINE_TIME_SCALE * 1.44,
  normal: CS2_NORMAL_BASELINE_TIME_SCALE,
  fast: CS2_NORMAL_BASELINE_TIME_SCALE * 0.86,
  'very-fast': CS2_NORMAL_BASELINE_TIME_SCALE * 0.72,
  'super-fast': CS2_NORMAL_BASELINE_TIME_SCALE * 0.62,
}

const PATTERN_LIBRARY: Record<LanePatternBehavior, PatternDefinition> = {
  cross: {
    baseFrames: [
      [0, -6.9, 0.1],
      [420, -3.6, 0.06],
      [920, -0.22, 0.02],
      [1440, 3.4, 0.05],
      [1820, 6.85, 0.1],
    ],
    laneDepthRange: [47.02, 47.22],
    wallbangOpportunity: true,
    preferDoor: true,
    mixedWeight: 1.2,
    directional: true,
  },
  'mid-hold-peek': {
    baseFrames: [
      [0, -0.94, 0],
      [170, -0.48, 0.01, 0.14],
      [360, -0.24, 0.02, 0.3],
      [1180, -0.24, 0.02, 0.3],
      [1430, -0.52, 0.01, 0.1],
      [1680, -0.94, 0],
    ],
    alternateBaseFrames: [
      [0, -0.92, 0, 0.02, 'crouch'],
      [170, -0.46, 0.01, 0.03, 'crouch'],
      [360, -0.2, 0.02, 0.04, 'crouch'],
      [1160, -0.2, 0.02, 0.04, 'crouch'],
      [1400, -0.5, 0.01, 0.02, 'crouch'],
      [1660, -0.92, 0, 0.02, 'crouch'],
    ],
    alternateChance: 0.46,
    laneDepthRange: [47.04, 47.13],
    wallbangOpportunity: false,
    preferDoor: true,
    mixedWeight: 0.9,
    directional: true,
  },
  'jumping-cross': {
    baseFrames: [
      [0, -6.7, 0.08],
      [260, -3.15, 0.04],
      [500, -0.8, 0.02, 0.82],
      [740, 1.55, 0.03, 0.46],
      [980, 4.65, 0.07, 0.06],
      [1220, 6.95, 0.1],
    ],
    laneDepthRange: [47.03, 47.18],
    wallbangOpportunity: false,
    preferDoor: true,
    mixedWeight: 0.9,
    directional: true,
  },
  'jiggle-peek': {
    baseFrames: [
      [0, -0.86, 0],
      [160, -0.24, 0.02],
      [340, -0.86, 0],
    ],
    laneDepthRange: [47.04, 47.16],
    wallbangOpportunity: false,
    preferDoor: true,
    mixedWeight: 1,
  },
  'double-jiggle-peek': {
    baseFrames: [
      [0, -0.86, 0],
      [150, -0.24, 0.02],
      [300, -0.86, 0],
      [500, -0.2, 0.02],
      [700, -0.86, 0],
    ],
    laneDepthRange: [47.04, 47.16],
    wallbangOpportunity: false,
    preferDoor: true,
    mixedWeight: 0.96,
  },
  'wide-swing': {
    baseFrames: [
      [0, -0.9, 0],
      [220, -0.22, 0.02],
      [500, 0.34, 0.02],
      [780, 1.08, 0.02],
    ],
    laneDepthRange: [47.04, 47.2],
    wallbangOpportunity: false,
    preferDoor: true,
    mixedWeight: 0.98,
    directional: true,
  },
  'delayed-wide-swing': {
    baseFrames: [
      [0, -0.9, 0],
      [420, -0.9, 0],
      [700, -0.24, 0.02],
      [980, 0.36, 0.02],
      [1280, 1.12, 0.02],
    ],
    laneDepthRange: [47.04, 47.2],
    wallbangOpportunity: false,
    preferDoor: true,
    mixedWeight: 0.82,
    directional: true,
  },
  'shoulder-bait': {
    baseFrames: [
      [0, -0.86, 0],
      [150, -0.5, 0.01],
      [300, -0.86, 0],
    ],
    laneDepthRange: [47.04, 47.16],
    wallbangOpportunity: false,
    preferDoor: true,
    mixedWeight: 0.88,
  },
  'stop-cross': {
    baseFrames: [
      [0, -6.9, 0.1],
      [520, -2.2, 0.04],
      [980, 0.08, 0.02],
      [1460, 0.08, 0.02],
      [1940, 3.28, 0.05],
      [2280, 6.8, 0.1],
    ],
    laneDepthRange: [47.02, 47.22],
    wallbangOpportunity: true,
    preferDoor: true,
    mixedWeight: 0.94,
    directional: true,
  },
  'crouch-peek': {
    baseFrames: [
      [0, -0.88, 0, 'crouch'],
      [180, -0.5, 0.01, 'crouch'],
      [420, -0.4, 0.01, 'crouch'],
      [650, -0.35, 0.01, 'crouch'],
      [900, -0.46, 0.01, 'crouch'],
      [1160, -0.88, 0, 'crouch'],
    ],
    laneDepthRange: [47.05, 47.09],
    wallbangOpportunity: false,
    preferDoor: true,
    mixedWeight: 0.76,
  },
  'wallbang-timing-peek': {
    baseFrames: [
      [0, -1.86, 0.01],
      [260, -1.32, 0.01],
      [620, -1.08, 0.01],
      [940, -1.42, 0.01],
      [1240, -1.88, 0.01],
    ],
    laneDepthRange: [46.26, 46.54],
    wallbangOpportunity: true,
    preferDoor: true,
    mixedWeight: 0.66,
  },
}

const createFrames = (
  baseFrames: PatternFrame[],
  mirror: 1 | -1,
  laneDepth: number,
  timeScale: number,
  startOffsetMs: number,
): MotionKeyframe[] =>
  baseFrames.map(([at, x, zOffset, yOrStance, stanceOverride]) => {
    const y = typeof yOrStance === 'number' ? yOrStance : 0
    const stance =
      (typeof yOrStance === 'string' ? yOrStance : stanceOverride) ?? 'stand'

    return {
      at: startOffsetMs + Math.round(at * timeScale),
      x: x * mirror,
      z: laneDepth + zOffset,
      y,
      stance,
    }
  })

const getResolvedFrames = (pattern: PatternDefinition) =>
  pattern.alternateBaseFrames &&
  Math.random() < (pattern.alternateChance ?? 0.5)
    ? pattern.alternateBaseFrames
    : pattern.baseFrames

const pickWeightedCrossDirection = (): 1 | -1 =>
  Math.random() < 0.95 ? -1 : 1

const buildEnemyPlan = (
  repId: number,
  role: EnemyRole,
  behavior: LanePatternBehavior,
  speed: PeekSpeedId,
  settings: GameSettings,
  mirror: 1 | -1,
  laneDepth: number,
  startOffsetMs = 0,
  idToken: string = role,
): EnemyPlan => {
  const pattern = PATTERN_LIBRARY[behavior]
  const timeScale = clamp(
    (settings.difficulty.peekDuration * SPEED_TIME_SCALE[speed]) /
      settings.difficulty.enemySpeed,
    0.58,
    2.8,
  )

  const frames = createFrames(
    getResolvedFrames(pattern),
    mirror,
    laneDepth,
    timeScale,
    startOffsetMs,
  )

  return {
    id: `${repId}-${idToken}`,
    role,
    behavior,
    wallbangOpportunity: pattern.wallbangOpportunity,
    preferDoor: pattern.preferDoor,
    despawnAt: frames[frames.length - 1].at + Math.round(180 * timeScale),
    keyframes: frames,
  }
}

const getMixedWeights = (settings: GameSettings) => {
  const baitBoost = settings.difficulty.fakeFrequency * 1.6
  const wallbangBoost = settings.difficulty.wallbangFrequency * 2.2

  return (Object.entries(PATTERN_LIBRARY) as Array<[LanePatternBehavior, PatternDefinition]>).map(
    ([behavior, definition]) => {
      let weight = definition.mixedWeight

      if (
        behavior === 'shoulder-bait' ||
        behavior === 'double-jiggle-peek' ||
        behavior === 'delayed-wide-swing'
      ) {
        weight += baitBoost
      }

      if (behavior === 'wallbang-timing-peek') {
        weight += wallbangBoost
      }

      return [behavior, weight] as [LanePatternBehavior, number]
    },
  )
}

const createSecondaryPlan = (
  repId: number,
  speed: PeekSpeedId,
  settings: GameSettings,
  mirror: 1 | -1,
): EnemyPlan => {
  const secondaryBehavior = weightedPick<LanePatternBehavior>([
    ['shoulder-bait', 1],
    ['jiggle-peek', 0.88],
    ['wide-swing', 0.62],
  ])
  const laneDepthRange = PATTERN_LIBRARY[secondaryBehavior].laneDepthRange

  return buildEnemyPlan(
    repId,
    'secondary',
    secondaryBehavior,
    speed,
    settings,
    (mirror * -1) as 1 | -1,
    randomBetween(laneDepthRange[0], laneDepthRange[1]),
    Math.round(randomBetween(150, 280)),
  )
}

const ROUND_START_LANE_DEPTHS = [47.05, 47.09, 47.14, 47.18] as const

const getPreRoundDelayMs = (settings: GameSettings) => {
  const prePeekDelayMinMs = Math.max(
    250,
    Math.min(settings.prePeekDelayMinMs, settings.prePeekDelayMaxMs),
  )
  const prePeekDelayMaxMs = Math.max(
    prePeekDelayMinMs,
    settings.prePeekDelayMaxMs,
  )

  return Math.round(randomBetween(prePeekDelayMinMs, prePeekDelayMaxMs))
}

const createRoundStartOffsets = (enemyCount: number) => {
  if (enemyCount <= 1) {
    return [0]
  }

  const desiredSpreadMs = randomBetween(1100, 1900)
  const gapWeights = Array.from({ length: enemyCount - 1 }, () =>
    randomBetween(0.82, 1.28),
  )
  const totalWeight = gapWeights.reduce((sum, weight) => sum + weight, 0)
  let elapsed = 0
  const offsets = [0]

  for (const weight of gapWeights) {
    elapsed += (desiredSpreadMs * weight) / totalWeight
    offsets.push(Math.round(elapsed))
  }

  return offsets
}

const pickRoundStartBehaviors = (enemyCount: number) => {
  const behaviors = Array.from({ length: enemyCount }, () => 'cross' as LanePatternBehavior)
  const jumpCount = enemyCount === 2 ? 1 : Math.min(enemyCount - 1, Math.random() < 0.42 ? 2 : 1)
  const pickedIndices = new Set<number>()

  while (pickedIndices.size < jumpCount) {
    pickedIndices.add(Math.floor(Math.random() * enemyCount))
  }

  for (const index of pickedIndices) {
    behaviors[index] = 'jumping-cross'
  }

  return behaviors
}

const createRoundStartPlan = (
  repId: number,
  settings: GameSettings,
): RepPlan => {
  const enemyCount = Math.floor(randomBetween(2, 5))
  const speed = settings.selectedSpeed
  const offsets = createRoundStartOffsets(enemyCount)
  const behaviors = pickRoundStartBehaviors(enemyCount)
  const depthRotation = Math.floor(Math.random() * ROUND_START_LANE_DEPTHS.length)

  const enemies = offsets.map((startOffsetMs, index) =>
    buildEnemyPlan(
      repId,
      index === 0 ? 'primary' : 'secondary',
      behaviors[index],
      speed,
      settings,
      -1,
      ROUND_START_LANE_DEPTHS[(index + depthRotation) % ROUND_START_LANE_DEPTHS.length] +
        randomBetween(-0.012, 0.012),
      startOffsetMs,
      index === 0 ? 'primary' : `secondary-${index}`,
    ),
  )

  return {
    id: repId,
    behavior: 'round-start',
    speed,
    enemies,
    eligibleTargetIds: enemies.map((enemy) => enemy.id),
    preRoundDelayMs: getPreRoundDelayMs(settings),
    totalDurationMs: Math.max(...enemies.map((enemy) => enemy.despawnAt)) + 80,
    designedWallbang: enemies.some((enemy) => enemy.wallbangOpportunity),
    doubleScenario: false,
  }
}

const getSelectedBehavior = (
  repId: number,
  settings: GameSettings,
) => {
  if (settings.selectedPeek !== 'mixed') {
    return settings.selectedPeek
  }

  if (settings.mixedModeRandomness) {
    return weightedPick(getMixedWeights(settings))
  }

  return MIXED_ROTATION_ORDER[(repId - 1) % MIXED_ROTATION_ORDER.length]
}

const getMirror = (
  repId: number,
  selectedPeek: GameSettings['selectedPeek'],
  settings: GameSettings,
  pattern: PatternDefinition,
): 1 | -1 => {
  if (pattern.directional) {
    return pickWeightedCrossDirection()
  }

  if (selectedPeek !== 'mixed') {
    return pattern.practiceMirror ?? 1
  }

  if (settings.mixedModeRandomness) {
    return Math.random() < 0.5 ? 1 : -1
  }

  return pattern.practiceMirror ?? (repId % 2 === 0 ? -1 : 1)
}

const getLaneDepth = (
  selectedPeek: GameSettings['selectedPeek'],
  settings: GameSettings,
  range: [number, number],
) =>
  selectedPeek === 'mixed' && settings.mixedModeRandomness
    ? randomBetween(range[0], range[1])
    : midpoint(range[0], range[1])

export const createRepPlan = (
  repId: number,
  settings: GameSettings,
): RepPlan => {
  const behavior = getSelectedBehavior(repId, settings)
  if (behavior === 'round-start') {
    return createRoundStartPlan(repId, settings)
  }

  const speed = settings.selectedSpeed
  const pattern = PATTERN_LIBRARY[behavior]
  const mirror = getMirror(repId, settings.selectedPeek, settings, pattern)
  const laneDepth = getLaneDepth(
    settings.selectedPeek,
    settings,
    pattern.laneDepthRange,
  )

  const primary = buildEnemyPlan(
    repId,
    'primary',
    behavior,
    speed,
    settings,
    mirror as 1 | -1,
    laneDepth,
  )

  const doubleScenario =
    settings.selectedPeek === 'mixed' &&
    settings.mixedModeRandomness &&
    settings.allowDoubleActive &&
    Math.random() < 0.08
  const enemies = doubleScenario
    ? [primary, createSecondaryPlan(repId, speed, settings, mirror as 1 | -1)]
    : [primary]

  return {
    id: repId,
    behavior,
    speed,
    enemies,
    eligibleTargetIds:
      doubleScenario && settings.allowDoubleActive
        ? enemies.map((enemy) => enemy.id)
        : [primary.id],
    preRoundDelayMs: getPreRoundDelayMs(settings),
    totalDurationMs: Math.max(...enemies.map((enemy) => enemy.despawnAt)) + 80,
    designedWallbang: enemies.some((enemy) => enemy.wallbangOpportunity),
    doubleScenario,
  }
}

export const getBehaviorDescription = (
  behavior: BehaviorId,
  speed: PeekSpeedId,
) => formatBehaviorLabel(behavior, speed)
