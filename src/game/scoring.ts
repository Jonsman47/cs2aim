import { BEHAVIOR_LABELS, PEEK_SPEED_LABELS, WEAPON_LABELS } from './constants.ts'
import { clamp } from './math.ts'
import type {
  BehaviorId,
  PeekSpeedId,
  ScoreBreakdownItem,
  WeaponMode,
} from './types.ts'

interface ScoreInput {
  success: boolean
  reactionTime: number | null
  headshot: boolean
  wallbang: boolean
  behavior: BehaviorId
  speed: PeekSpeedId
  weapon: WeaponMode
  missesBeforeHit: number
  shotsFired: number
  doorVisibilityAssist: boolean
}

const BEHAVIOR_DIFFICULTY: Record<BehaviorId, number> = {
  cross: 4,
  'mid-hold-peek': 7,
  'jumping-cross': 10,
  'jiggle-peek': 6,
  'double-jiggle-peek': 8,
  'wide-swing': 7,
  'delayed-wide-swing': 8,
  'shoulder-bait': 9,
  'stop-cross': 6,
  'crouch-peek': 9,
  'round-start': 10,
  'wallbang-timing-peek': 11,
}

const SPEED_DIFFICULTY: Record<PeekSpeedId, number> = {
  'very-slow': 0,
  slow: 2,
  normal: 4,
  fast: 6,
  'very-fast': 8,
  'super-fast': 10,
}

const WEAPON_DIFFICULTY: Record<WeaponMode, number> = {
  awp: 0,
  ssg08: 4,
  scar20: 2,
}

const getReactionQuality = (reactionTime: number | null) => {
  if (reactionTime === null) {
    return 0
  }

  return clamp(
    Math.round(48 * (1 - (reactionTime - 140) / 720)),
    0,
    48,
  )
}

const getPrecisionScore = (
  success: boolean,
  missesBeforeHit: number,
  shotsFired: number,
) => {
  if (success) {
    const extraShots = Math.max(shotsFired - 1, 0)
    return clamp(22 - missesBeforeHit * 8 - extraShots * 5, 0, 22)
  }

  return clamp(6 - Math.max(shotsFired - 1, 0) * 2 - missesBeforeHit * 3, 0, 6)
}

const getDifficultyScore = (
  success: boolean,
  behavior: BehaviorId,
  speed: PeekSpeedId,
  weapon: WeaponMode,
  doorVisibilityAssist: boolean,
) => {
  const raw =
    BEHAVIOR_DIFFICULTY[behavior] +
    SPEED_DIFFICULTY[speed] +
    WEAPON_DIFFICULTY[weapon] +
    (doorVisibilityAssist ? 0 : 4)

  const capped = clamp(raw, 0, 20)
  return success ? Math.round((capped / 20) * 18) : Math.round((capped / 20) * 6)
}

const getSpecialScore = (
  success: boolean,
  headshot: boolean,
  wallbang: boolean,
  doorVisibilityAssist: boolean,
) => {
  if (!success) {
    return 0
  }

  return (headshot ? 6 : 0) + (wallbang ? (doorVisibilityAssist ? 4 : 6) : 0)
}

export const evaluateAttemptScore = ({
  success,
  reactionTime,
  headshot,
  wallbang,
  behavior,
  speed,
  weapon,
  missesBeforeHit,
  shotsFired,
  doorVisibilityAssist,
}: ScoreInput) => {
  const reactionQuality = getReactionQuality(reactionTime)
  const precision = getPrecisionScore(success, missesBeforeHit, shotsFired)
  const difficulty = getDifficultyScore(
    success,
    behavior,
    speed,
    weapon,
    doorVisibilityAssist,
  )
  const special = getSpecialScore(
    success,
    headshot,
    wallbang,
    doorVisibilityAssist,
  )
  const total = clamp(reactionQuality + precision + difficulty + special, 0, 100)

  const breakdown: ScoreBreakdownItem[] = [
    {
      label: 'Reaction quality',
      value: reactionQuality,
      detail:
        reactionTime === null
          ? 'No reaction time because the rep did not end on a valid hit.'
          : `${Math.round(reactionTime)} ms on the clock.`,
    },
    {
      label: 'Precision',
      value: precision,
      detail:
        success
          ? missesBeforeHit === 0
            ? 'Clean first-shot conversion.'
            : `${missesBeforeHit} wasted shot${missesBeforeHit === 1 ? '' : 's'} before the hit.`
          : shotsFired === 0
            ? 'No shot connected before the rep ended.'
            : `${shotsFired} shot${shotsFired === 1 ? '' : 's'} fired with no valid finish.`,
    },
    {
      label: 'Difficulty bonus',
      value: difficulty,
      detail: `${WEAPON_LABELS[weapon]}, ${BEHAVIOR_LABELS[behavior]}, ${PEEK_SPEED_LABELS[speed]}${
        doorVisibilityAssist ? '' : ', assist off'
      }.`,
    },
    {
      label: 'Special bonuses',
      value: special,
      detail:
        headshot || wallbang
          ? [headshot ? 'Headshot' : null, wallbang ? 'Wallbang' : null]
              .filter(Boolean)
              .join(' + ')
          : 'No extra bonuses on this rep.',
    },
  ]

  return {
    total,
    breakdown,
  }
}
