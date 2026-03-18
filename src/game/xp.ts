import { clamp } from './math.ts'
import type {
  BehaviorId,
  MessageTone,
  PeekSpeedId,
  WeaponMode,
  XpProgress,
} from './types.ts'

const LEVEL_ONE_REQUIREMENT = 5000
const LEVEL_REQUIREMENT_STEP = 1000
const MAX_XP_PER_SHOT = 1000

const BEHAVIOR_XP_WEIGHT: Record<BehaviorId, number> = {
  cross: 2,
  'mid-hold-peek': 4,
  'jumping-cross': 6,
  'jiggle-peek': 4,
  'double-jiggle-peek': 5,
  'wide-swing': 4,
  'delayed-wide-swing': 5,
  'shoulder-bait': 6,
  'stop-cross': 4,
  'crouch-peek': 6,
  'wallbang-timing-peek': 7,
}

const SPEED_XP_WEIGHT: Record<PeekSpeedId, number> = {
  'very-slow': 0,
  slow: 1,
  normal: 2,
  fast: 3,
  'very-fast': 4,
  'super-fast': 5,
}

const SHOT_XP = {
  miss: 12,
  bodyShot: 55,
  hit: 180,
  wallbang: 260,
  headshot: 320,
  headshotWallbang: 460,
}

interface ShotRewardInput {
  scored: boolean
  damaged: boolean
  headshot: boolean
  wallbang: boolean
  reactionTime: number | null
  behavior: BehaviorId
  speed: PeekSpeedId
  weapon: WeaponMode
  doorVisibilityAssist: boolean
}

export interface ShotReward {
  title: string
  tone: MessageTone
  xpGained: number
}

const getReactionXpBonus = (reactionTime: number | null) => {
  if (reactionTime === null) {
    return 0
  }

  return clamp(Math.round((850 - reactionTime) * 0.42), 0, 260)
}

const getDifficultyXpBonus = (
  behavior: BehaviorId,
  speed: PeekSpeedId,
  weapon: WeaponMode,
  doorVisibilityAssist: boolean,
) => {
  const weaponBonus = weapon === 'ssg08' ? 3 : weapon === 'scar20' ? 2 : 0

  return (
    BEHAVIOR_XP_WEIGHT[behavior] * 18 +
    SPEED_XP_WEIGHT[speed] * 14 +
    weaponBonus * 28 +
    (doorVisibilityAssist ? 0 : 60)
  )
}

const getComboXpBonus = (headshot: boolean, wallbang: boolean) => {
  if (headshot && wallbang) {
    return 160
  }

  if (headshot) {
    return 70
  }

  if (wallbang) {
    return 55
  }

  return 0
}

const getTitleAndTone = (
  scored: boolean,
  damaged: boolean,
  headshot: boolean,
  wallbang: boolean,
): Pick<ShotReward, 'title' | 'tone'> => {
  if (!scored && damaged) {
    return {
      title: 'Body Shot',
      tone: 'warn',
    }
  }

  if (!scored) {
    return {
      title: 'Missed Shot',
      tone: 'bad',
    }
  }

  if (headshot && wallbang) {
    return {
      title: 'Headshot Wallbang',
      tone: 'bonus',
    }
  }

  if (wallbang) {
    return {
      title: 'Wallbang',
      tone: 'bonus',
    }
  }

  if (headshot) {
    return {
      title: 'Headshot',
      tone: 'good',
    }
  }

  return {
    title: 'Hit',
    tone: 'good',
  }
}

export const evaluateShotReward = ({
  scored,
  damaged,
  headshot,
  wallbang,
  reactionTime,
  behavior,
  speed,
  weapon,
  doorVisibilityAssist,
}: ShotRewardInput): ShotReward => {
  const { title, tone } = getTitleAndTone(scored, damaged, headshot, wallbang)

  let xpGained = SHOT_XP.miss

  if (!scored && damaged) {
    xpGained = SHOT_XP.bodyShot
  } else if (headshot && wallbang) {
    xpGained = SHOT_XP.headshotWallbang
  } else if (headshot) {
    xpGained = SHOT_XP.headshot
  } else if (wallbang) {
    xpGained = SHOT_XP.wallbang
  } else if (scored) {
    xpGained = SHOT_XP.hit
  }

  if (scored) {
    xpGained += getReactionXpBonus(reactionTime)
    xpGained += getDifficultyXpBonus(behavior, speed, weapon, doorVisibilityAssist)
    xpGained += getComboXpBonus(headshot, wallbang)
  }

  return {
    title,
    tone,
    xpGained: clamp(Math.round(xpGained), 0, MAX_XP_PER_SHOT),
  }
}

export const getLevelStartXp = (level: number) => {
  if (level <= 1) {
    return 0
  }

  const completedLevels = level - 1

  return (
    completedLevels * LEVEL_ONE_REQUIREMENT +
    ((completedLevels - 1) * completedLevels * LEVEL_REQUIREMENT_STEP) / 2
  )
}

export const getXpProgress = (totalXp: number): XpProgress => {
  let level = 1

  while (totalXp >= getLevelStartXp(level + 1)) {
    level += 1
  }

  const currentLevelXp = getLevelStartXp(level)
  const nextLevelXp = getLevelStartXp(level + 1)
  const xpIntoLevel = totalXp - currentLevelXp
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp

  return {
    totalXp,
    level,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpNeededForNextLevel,
    progress:
      xpNeededForNextLevel > 0 ? xpIntoLevel / xpNeededForNextLevel : 1,
  }
}
