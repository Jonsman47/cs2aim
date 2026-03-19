import type {
  Aabb,
  BehaviorId,
  CrosshairColorPreset,
  GameMode,
  GameSettings,
  GraphicsQualityId,
  MissPunishment,
  NormalCrosshairSettings,
  PeekSelection,
  PeekSpeedId,
  ScopeLevel,
  SessionType,
  WeaponMode,
} from './types.ts'

export const STORAGE_KEY = 'midlane-reaction-lab'
export const AWP_COOLDOWN_MS = 560
export const SSG08_COOLDOWN_MS = 460
export const SCAR20_COOLDOWN_MS = 165

export const CAMERA_BASE = { x: -0.38, y: 1.62, z: 1.45 }
export const CAMERA_BASE_YAW = 0
export const CAMERA_FOV = Math.PI / 3.15
export const CAMERA_SCOPE_FOV_LEVEL_1 = Math.PI / 5.75
export const CAMERA_SCOPE_FOV_LEVEL_2 = Math.PI / 11.4
export const CAMERA_PITCH_LIMIT = 0.22

export const DOOR_PANELS: Aabb[] = [
  {
    min: { x: -2.45, y: 0, z: 45.58 },
    max: { x: -0.4, y: 3.15, z: 45.72 },
  },
  {
    min: { x: 0.4, y: 0, z: 45.58 },
    max: { x: 2.45, y: 3.15, z: 45.72 },
  },
]

export const DOOR_FRAME_OCCLUDERS: Aabb[] = [
  {
    min: { x: -3.08, y: 0, z: 45.3 },
    max: { x: -2.42, y: 3.75, z: 45.9 },
  },
  {
    min: { x: 2.42, y: 0, z: 45.3 },
    max: { x: 3.08, y: 3.75, z: 45.9 },
  },
  {
    min: { x: -3.08, y: 3.08, z: 45.3 },
    max: { x: 3.08, y: 3.72, z: 45.9 },
  },
]

export const SOLID_COVER: Aabb[] = [
  {
    min: { x: -12.8, y: 0, z: 44.95 },
    max: { x: -3.08, y: 4.9, z: 54.5 },
  },
  {
    min: { x: 3.08, y: 0, z: 44.95 },
    max: { x: 12.8, y: 4.9, z: 54.5 },
  },
]

export const LANE_FLOOR = [
  { x: -14.8, y: 0, z: 3 },
  { x: 14.8, y: 0, z: 3 },
  { x: 19.5, y: 0, z: 68 },
  { x: -19.5, y: 0, z: 68 },
]

export const REAR_WALL = [
  { x: -19, y: 0, z: 66 },
  { x: 19, y: 0, z: 66 },
  { x: 19, y: 9.5, z: 66 },
  { x: -19, y: 9.5, z: 66 },
]

export const VIEW_YAW_LIMIT = 0.72

export const MODE_LABELS: Record<GameMode, string> = {
  standard: 'Peek Practice',
  'door-cross': 'Mid-Door Cross',
  'round-start': 'Round Start',
  wallbang: 'Wallbang Timing',
  mixed: 'Mixed Rotation',
  accuracy: 'Accuracy Mode',
}

export const WEAPON_LABELS: Record<WeaponMode, string> = {
  awp: 'AWP',
  ssg08: 'SSG-08',
  scar20: 'SCAR-20',
}

export const WEAPON_SELECTIONS: WeaponMode[] = ['awp', 'ssg08', 'scar20']

export const UI_KEYBINDS = {
  startSelected: { code: 'Enter', label: 'Enter' },
  toggleSettings: { code: 'KeyS', label: 'S' },
  nextTry: { code: 'Space', label: 'Space' },
  restartSession: { code: 'KeyR', label: 'R' },
  backToMenu: { code: 'KeyL', label: 'L' },
  fullscreen: { code: 'KeyF', label: 'F' },
} as const

export const WEAPON_PICKER_DETAILS: Record<
  WeaponMode,
  {
    blurb: string
    finishRule: string
  }
> = {
  awp: {
    blurb: 'Heavy sniper feel with the slowest follow-up and forgiving one-shot body damage.',
    finishRule: 'Body or headshot ends the rep.',
  },
  ssg08: {
    blurb: 'Faster and more precise than the AWP, but only a headshot converts the rep.',
    finishRule: 'Body shots tag for damage only. Headshots finish.',
  },
  scar20: {
    blurb: 'Semi-auto scope rifle built for fast follow-up shots and aggressive re-centering.',
    finishRule: 'Headshot kills instantly. Two body shots finish.',
  },
}

export const CROSSHAIR_COLOR_PRESETS: Record<CrosshairColorPreset, string> = {
  'classic-green': '#66ff7a',
  cyan: '#72f0c4',
  white: '#f4f7fb',
  yellow: '#ffd466',
  red: '#ff7a66',
  custom: '#72f0c4',
}

export const GRAPHICS_QUALITY_OPTIONS: GraphicsQualityId[] = [
  'very-high',
  'high',
  'medium',
  'low',
  'very-low',
]

export const GRAPHICS_QUALITY_LABELS: Record<GraphicsQualityId, string> = {
  'very-high': 'Very High',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  'very-low': 'Very Low',
}

export const GRAPHICS_QUALITY_DETAILS: Record<GraphicsQualityId, string> = {
  'very-high': 'Supersampled scene rendering with the fullest lighting, haze, and detail passes.',
  high: 'Sharper scene rendering with extra depth and environment polish.',
  medium: 'Current default look and performance balance. Medium matches the existing build.',
  low: 'Lighter visual detail and reduced render cost while keeping the same gameplay.',
  'very-low': 'Aggressively optimized scene rendering for weak hardware while preserving the same peeks and hit logic.',
}

export const NORMAL_CROSSHAIR_PRESETS = {
  'classic-tac-fps': {
    colorPreset: 'classic-green',
    color: CROSSHAIR_COLOR_PRESETS['classic-green'],
    showCenterDot: false,
    centerDotSize: 2,
    centerDotOpacity: 0.92,
    lineLength: 11,
    gap: 4,
    thickness: 2,
    opacity: 0.97,
    outline: true,
    outlineThickness: 1,
    dynamicMode: 'static',
    tStyle: false,
  },
  'tiny-dot': {
    colorPreset: 'white',
    color: CROSSHAIR_COLOR_PRESETS.white,
    showCenterDot: true,
    centerDotSize: 2,
    centerDotOpacity: 0.98,
    lineLength: 0,
    gap: 5,
    thickness: 1,
    opacity: 0.42,
    outline: true,
    outlineThickness: 1,
    dynamicMode: 'static',
    tStyle: false,
  },
  'precise-small-cross': {
    colorPreset: 'cyan',
    color: CROSSHAIR_COLOR_PRESETS.cyan,
    showCenterDot: true,
    centerDotSize: 1,
    centerDotOpacity: 0.9,
    lineLength: 8,
    gap: 3,
    thickness: 1,
    opacity: 0.94,
    outline: true,
    outlineThickness: 1,
    dynamicMode: 'static',
    tStyle: false,
  },
  'bold-training-cross': {
    colorPreset: 'yellow',
    color: CROSSHAIR_COLOR_PRESETS.yellow,
    showCenterDot: true,
    centerDotSize: 2,
    centerDotOpacity: 0.96,
    lineLength: 15,
    gap: 6,
    thickness: 3,
    opacity: 0.96,
    outline: true,
    outlineThickness: 2,
    dynamicMode: 'slight',
    tStyle: false,
  },
} satisfies Record<string, NormalCrosshairSettings>

export const NORMAL_CROSSHAIR_PRESET_LABELS: Record<
  keyof typeof NORMAL_CROSSHAIR_PRESETS,
  string
> = {
  'classic-tac-fps': 'Classic Tac FPS',
  'tiny-dot': 'Tiny Dot',
  'precise-small-cross': 'Precise Small Cross',
  'bold-training-cross': 'Bold Training Cross',
}

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  session: 'Session',
}

export const MISS_PUNISHMENT_LABELS: Record<MissPunishment, string> = {
  none: 'None',
  time: '+Time Penalty',
  fail: 'Fail Rep',
}

export const BEHAVIOR_LABELS: Record<BehaviorId, string> = {
  cross: 'Cross',
  'mid-hold-peek': 'Mid Hold Peek',
  'jumping-cross': 'Jumping Cross',
  'jiggle-peek': 'Jiggle Peek',
  'double-jiggle-peek': 'Double Jiggle Peek',
  'wide-swing': 'Wide Swing',
  'delayed-wide-swing': 'Delayed Wide Swing',
  'shoulder-bait': 'Shoulder Bait',
  'stop-cross': 'Stop Then Continue Cross',
  'crouch-peek': 'Crouch Peek',
  'round-start': 'Round Start',
  'wallbang-timing-peek': 'Wallbang Timing Peek',
}

export const POPULAR_PEEK_SELECTIONS: PeekSelection[] = [
  'cross',
  'jumping-cross',
  'crouch-peek',
  'round-start',
]

export const PEEK_SELECTIONS: PeekSelection[] = [
  ...POPULAR_PEEK_SELECTIONS,
  'mid-hold-peek',
  'jiggle-peek',
  'double-jiggle-peek',
  'wide-swing',
  'delayed-wide-swing',
  'shoulder-bait',
  'stop-cross',
  'wallbang-timing-peek',
  'mixed',
]

export const PEEK_SELECTION_LABELS: Record<PeekSelection, string> = {
  cross: 'Cross',
  'mid-hold-peek': 'Mid Hold Peek',
  'jumping-cross': 'Jumping Cross',
  'jiggle-peek': 'Jiggle Peek',
  'double-jiggle-peek': 'Double Jiggle Peek',
  'wide-swing': 'Wide Swing',
  'delayed-wide-swing': 'Delayed Wide Swing',
  'shoulder-bait': 'Shoulder Bait',
  'stop-cross': 'Stop Then Continue',
  'crouch-peek': 'Crouch Peek',
  'round-start': 'Round Start',
  'wallbang-timing-peek': 'Wallbang Timing',
  mixed: 'Mixed / Random',
}

export const PEEK_SELECTION_DETAILS: Record<PeekSelection, string> = {
  cross:
    'Full far-mid cross through the doors. Pair it with very slow through super-fast speed presets.',
  'mid-hold-peek':
    'Peeks into the visible opening, holds the angle for a beat, then backs out from either a higher or lower hold line.',
  'jumping-cross':
    'A risky jump-cross arc through the visible mid-door lane, built for airborne reaction reps.',
  'jiggle-peek': 'One clean jiggle rhythm around the door edge.',
  'double-jiggle-peek': 'Two quick jiggles with a second re-peek window.',
  'wide-swing': 'A committed swing that fully clears into the lane.',
  'delayed-wide-swing': 'Waits behind cover, then explodes into a wider swing.',
  'shoulder-bait': 'A small shoulder check meant to bait the shot.',
  'stop-cross': 'Starts the cross, short-stops, then continues through.',
  'crouch-peek': 'Low crouch exposure for a smaller read.',
  'round-start':
    'A 2 to 4 player round-start lane cross with staggered right-to-left movement, mixed jump-crosses, and rushing bodies.',
  'wallbang-timing-peek': 'Door timing reps that stay valid only through the penetrable mid-door area.',
  mixed:
    'Mixed rotation across the aligned peek library. Randomness can stay on or be switched to a fixed rotation.',
}

export const PEEK_SPEEDS: PeekSpeedId[] = [
  'very-slow',
  'slow',
  'normal',
  'fast',
  'very-fast',
  'super-fast',
]

export const PEEK_SPEED_LABELS: Record<PeekSpeedId, string> = {
  'very-slow': 'Very Slow',
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast',
  'very-fast': 'Very Fast',
  'super-fast': 'Super Fast',
}

export const PEEK_SPEED_DETAILS: Record<PeekSpeedId, string> = {
  'very-slow': 'Much slower than a normal CS2 peek for very readable beginner reps.',
  slow: 'Somewhat slower than normal CS2 movement for controlled angle holds.',
  normal: 'Grounded CS2-style movement pace and the new baseline for the speed ladder.',
  fast: 'A modest step above normal while still feeling believable and trainable.',
  'very-fast': 'Clearly faster than normal for sharper reaction reps.',
  'super-fast': 'The fastest playable tier, still above the rest without turning cartoonishly fast.',
}

export const SCOPE_LEVEL_LABELS: Record<ScopeLevel, string> = {
  0: 'Unscoped',
  1: 'Scope 1',
  2: 'Scope 2',
}

export const SESSION_LENGTH_OPTIONS = [10, 25, 50] as const

const DEFAULT_PEEK_SELECTION: PeekSelection = 'cross'
const DEFAULT_PEEK_SPEED: PeekSpeedId = 'normal'
const DEFAULT_NORMAL_CROSSHAIR = NORMAL_CROSSHAIR_PRESETS['classic-tac-fps']
const normalizeSessionType = (): SessionType => 'session'

const LEGACY_PEEK_MIGRATION: Record<
  string,
  { selectedPeek: PeekSelection; selectedSpeed?: PeekSpeedId }
> = {
  'fast-cross': { selectedPeek: 'cross', selectedSpeed: 'fast' },
  'slow-cross': { selectedPeek: 'cross', selectedSpeed: 'slow' },
  'door-hold': { selectedPeek: 'wallbang-timing-peek' },
  'partial-body': { selectedPeek: 'shoulder-bait', selectedSpeed: 'slow' },
  'fake-peek': { selectedPeek: 'shoulder-bait', selectedSpeed: 'normal' },
  're-peek': { selectedPeek: 'double-jiggle-peek', selectedSpeed: 'normal' },
}

const isPeekSelection = (value: unknown): value is PeekSelection =>
  typeof value === 'string' && PEEK_SELECTIONS.includes(value as PeekSelection)

const isPeekSpeed = (value: unknown): value is PeekSpeedId =>
  typeof value === 'string' && PEEK_SPEEDS.includes(value as PeekSpeedId)

export const normalizePeekChoice = (
  selectedPeek: unknown,
  selectedSpeed: unknown,
) => {
  const migrated =
    typeof selectedPeek === 'string'
      ? LEGACY_PEEK_MIGRATION[selectedPeek]
      : undefined

  return {
    selectedPeek:
      migrated?.selectedPeek ??
      (isPeekSelection(selectedPeek) ? selectedPeek : DEFAULT_PEEK_SELECTION),
    selectedSpeed:
      migrated?.selectedSpeed ??
      (isPeekSpeed(selectedSpeed) ? selectedSpeed : DEFAULT_PEEK_SPEED),
  }
}

export const formatBehaviorLabel = (
  behavior: BehaviorId,
  speed: PeekSpeedId,
) =>
  behavior === 'cross'
    ? `${PEEK_SPEED_LABELS[speed]} Cross`
    : `${BEHAVIOR_LABELS[behavior]} / ${PEEK_SPEED_LABELS[speed]}`

export const formatPeekSelectionLabel = (
  selectedPeek: PeekSelection,
  speed: PeekSpeedId,
) =>
  selectedPeek === 'mixed'
    ? `Mixed Rotation / ${PEEK_SPEED_LABELS[speed]}`
    : formatBehaviorLabel(selectedPeek, speed)

export const DEFAULT_SETTINGS: GameSettings = {
  mode: 'door-cross',
  selectedPeek: DEFAULT_PEEK_SELECTION,
  selectedSpeed: DEFAULT_PEEK_SPEED,
  sessionType: 'session',
  sessionLength: 25,
  prePeekDelayMinMs: 1000,
  prePeekDelayMaxMs: 10000,
  weapon: 'awp',
  mouseSensitivity: 1,
  scopeSensitivityMultiplier: 1,
  scopedView: true,
  rawMode: false,
  soundEnabled: true,
  masterVolume: 0.8,
  darkTheme: true,
  graphicsQuality: 'medium',
  doorVisibilityAssist: false,
  showScoringBreakdown: true,
  showHitLabels: true,
  mixedModeRandomness: true,
  allowDoubleActive: false,
  enableRecoil: true,
  recoilStrength: 1,
  shotCooldownMs: 0,
  crosshair: {
    normal: { ...DEFAULT_NORMAL_CROSSHAIR },
    scoped: {
      lineThickness: 1.4,
      lineOpacity: 0.9,
      centerDot: true,
      centerDotSize: 2,
      centerDotOpacity: 0.88,
      innerStyle: 'none',
      innerSize: 8,
      innerGap: 4,
      innerOpacity: 0.52,
      borderOpacity: 0.78,
      overlayOpacity: 0.78,
    },
  },
  difficulty: {
    enemySpeed: 1,
    peekDuration: 1,
    visibilityLevel: 0.68,
    delayRandomness: 0.72,
    fakeFrequency: 0.22,
    wallbangFrequency: 0.35,
    hitboxScale: 1,
    horizontalAimRange: 0.68,
    verticalAimEnabled: true,
    missPunishment: 'none',
  },
}

export const WEAPON_PROPERTIES: Record<
  WeaponMode,
  {
    cooldownMs: number
    penetration: number
    recoilKick: number
    spread: number
    accuracyRecovery: number
    unscopedSpreadMultiplier: number
    scopeOneSpreadMultiplier: number
    scopeTwoSpreadMultiplier: number
    bodyDamage: number
    headDamage: number
    maxHealth: number
  }
> = {
  awp: {
    cooldownMs: AWP_COOLDOWN_MS,
    penetration: 0.28,
    recoilKick: 0.052,
    spread: 0.00078,
    accuracyRecovery: 0.22,
    unscopedSpreadMultiplier: 2.45,
    scopeOneSpreadMultiplier: 0.78,
    scopeTwoSpreadMultiplier: 0.56,
    bodyDamage: 115,
    headDamage: 400,
    maxHealth: 100,
  },
  ssg08: {
    cooldownMs: SSG08_COOLDOWN_MS,
    penetration: 0.22,
    recoilKick: 0.034,
    spread: 0.00048,
    accuracyRecovery: 0.3,
    unscopedSpreadMultiplier: 2.05,
    scopeOneSpreadMultiplier: 0.66,
    scopeTwoSpreadMultiplier: 0.42,
    bodyDamage: 72,
    headDamage: 160,
    maxHealth: 100,
  },
  scar20: {
    cooldownMs: SCAR20_COOLDOWN_MS,
    penetration: 0.18,
    recoilKick: 0.024,
    spread: 0.0011,
    accuracyRecovery: 0.18,
    unscopedSpreadMultiplier: 2.2,
    scopeOneSpreadMultiplier: 0.82,
    scopeTwoSpreadMultiplier: 0.62,
    bodyDamage: 55,
    headDamage: 130,
    maxHealth: 100,
  },
}

export const normalizeWeaponMode = (weapon: unknown): WeaponMode => {
  if (weapon === 'sniper' || weapon === 'awp') {
    return 'awp'
  }

  if (weapon === 'ssg08' || weapon === 'scar20') {
    return weapon
  }

  return 'awp'
}

const normalizeGraphicsQuality = (quality: unknown): GraphicsQualityId =>
  typeof quality === 'string' &&
  GRAPHICS_QUALITY_OPTIONS.includes(quality as GraphicsQualityId)
    ? (quality as GraphicsQualityId)
    : 'medium'

export const deriveModeFromSelectedPeek = (
  selectedPeek: PeekSelection,
): GameMode => {
  switch (selectedPeek) {
    case 'cross':
    case 'jumping-cross':
    case 'stop-cross':
      return 'door-cross'
    case 'round-start':
      return 'round-start'
    case 'wallbang-timing-peek':
      return 'wallbang'
    case 'mixed':
      return 'mixed'
    default:
      return 'standard'
  }
}

export const withDerivedMode = (settings: GameSettings): GameSettings => {
  const { selectedPeek, selectedSpeed } = normalizePeekChoice(
    settings.selectedPeek,
    settings.selectedSpeed,
  )

  return {
    ...settings,
    sessionType: normalizeSessionType(),
    weapon: normalizeWeaponMode(settings.weapon),
    graphicsQuality: normalizeGraphicsQuality(settings.graphicsQuality),
    selectedPeek,
    selectedSpeed,
    shotCooldownMs: settings.shotCooldownMs,
    mode: deriveModeFromSelectedPeek(selectedPeek),
  }
}
