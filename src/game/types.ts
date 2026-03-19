export type GamePhase =
  | 'menu'
  | 'preround'
  | 'active'
  | 'cooldown'
  | 'result'
  | 'summary'

export type GameMode =
  | 'standard'
  | 'door-cross'
  | 'round-start'
  | 'wallbang'
  | 'mixed'
  | 'accuracy'

export type SessionType = 'session'

export type WeaponMode = 'awp' | 'ssg08' | 'scar20'

export type CrosshairColorPreset =
  | 'classic-green'
  | 'cyan'
  | 'white'
  | 'yellow'
  | 'red'
  | 'custom'

export type CrosshairDynamicMode = 'static' | 'slight'

export type ScopedInnerCrosshairStyle = 'none' | 'cross' | 'dot'

export type MissPunishment = 'none' | 'time' | 'fail'

export type EnemyRole = 'primary' | 'secondary'

export type EnemyStance = 'stand' | 'crouch'

export type GraphicsQualityId =
  | 'very-high'
  | 'high'
  | 'medium'
  | 'low'
  | 'very-low'

export type BehaviorId =
  | 'cross'
  | 'mid-hold-peek'
  | 'jumping-cross'
  | 'jiggle-peek'
  | 'double-jiggle-peek'
  | 'wide-swing'
  | 'delayed-wide-swing'
  | 'shoulder-bait'
  | 'stop-cross'
  | 'crouch-peek'
  | 'round-start'
  | 'wallbang-timing-peek'

export type PeekSelection =
  | 'cross'
  | 'mid-hold-peek'
  | 'jumping-cross'
  | 'jiggle-peek'
  | 'double-jiggle-peek'
  | 'wide-swing'
  | 'delayed-wide-swing'
  | 'shoulder-bait'
  | 'stop-cross'
  | 'crouch-peek'
  | 'round-start'
  | 'wallbang-timing-peek'
  | 'mixed'

export type PeekSpeedId =
  | 'very-slow'
  | 'slow'
  | 'normal'
  | 'fast'
  | 'very-fast'
  | 'super-fast'

export type ScopeLevel = 0 | 1 | 2

export type HitRegion = 'head' | 'body'

export type MessageTone = 'neutral' | 'good' | 'warn' | 'bad' | 'bonus'

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface Aabb {
  min: Vector3
  max: Vector3
}

export interface NormalCrosshairSettings {
  colorPreset: CrosshairColorPreset
  color: string
  showCenterDot: boolean
  centerDotSize: number
  centerDotOpacity: number
  lineLength: number
  gap: number
  thickness: number
  opacity: number
  outline: boolean
  outlineThickness: number
  dynamicMode: CrosshairDynamicMode
  tStyle: boolean
}

export interface ScopedCrosshairSettings {
  lineThickness: number
  lineOpacity: number
  centerDot: boolean
  centerDotSize: number
  centerDotOpacity: number
  innerStyle: ScopedInnerCrosshairStyle
  innerSize: number
  innerGap: number
  innerOpacity: number
  borderOpacity: number
  overlayOpacity: number
}

export interface CrosshairSettings {
  normal: NormalCrosshairSettings
  scoped: ScopedCrosshairSettings
}

export interface DifficultySettings {
  enemySpeed: number
  peekDuration: number
  visibilityLevel: number
  delayRandomness: number
  fakeFrequency: number
  wallbangFrequency: number
  hitboxScale: number
  horizontalAimRange: number
  verticalAimEnabled: boolean
  missPunishment: MissPunishment
}

export interface GameSettings {
  mode: GameMode
  selectedPeek: PeekSelection
  selectedSpeed: PeekSpeedId
  sessionType: SessionType
  sessionLength: 10 | 25 | 50
  prePeekDelayMinMs: number
  prePeekDelayMaxMs: number
  weapon: WeaponMode
  mouseSensitivity: number
  scopeSensitivityMultiplier: number
  scopedView: boolean
  rawMode: boolean
  soundEnabled: boolean
  masterVolume: number
  darkTheme: boolean
  graphicsQuality: GraphicsQualityId
  doorVisibilityAssist: boolean
  showScoringBreakdown: boolean
  showHitLabels: boolean
  mixedModeRandomness: boolean
  allowDoubleActive: boolean
  enableRecoil: boolean
  recoilStrength: number
  shotCooldownMs: number
  crosshair: CrosshairSettings
  difficulty: DifficultySettings
}

export interface MotionKeyframe {
  at: number
  x: number
  z: number
  y: number
  stance: EnemyStance
}

export interface EnemyPlan {
  id: string
  role: EnemyRole
  behavior: BehaviorId
  wallbangOpportunity: boolean
  preferDoor: boolean
  despawnAt: number
  keyframes: MotionKeyframe[]
}

export interface RepPlan {
  id: number
  behavior: BehaviorId
  speed: PeekSpeedId
  enemies: EnemyPlan[]
  eligibleTargetIds: string[]
  preRoundDelayMs: number
  totalDurationMs: number
  designedWallbang: boolean
  doubleScenario: boolean
}

export interface EnemyHitboxes {
  head: Aabb
  body: Aabb
}

export interface RecentResult {
  rep: number
  behavior: BehaviorId
  speed: PeekSpeedId
  reactionTime: number
  wallbang: boolean
  headshot: boolean
}

export interface ScoreBreakdownItem {
  label: string
  value: number
  detail: string
}

export interface SessionStats {
  hits: number
  misses: number
  failedReps: number
  wallbangHits: number
  headshots: number
  repsCompleted: number
  successes: number
  reactionTimes: number[]
  recentResults: RecentResult[]
  lastSuccessful: number | null
  best: number | null
  average: number | null
  median: number | null
  accuracy: number
}

export interface LifetimeStats {
  totalSessions: number
  totalHits: number
  totalMisses: number
  totalFailedReps: number
  totalWallbangHits: number
  totalHeadshots: number
  totalSuccesses: number
  cumulativeReactionMs: number
  allTimeBest: number | null
  weaponUsage: Record<WeaponMode, number>
  subSecondReactionMsTotal: number
  subSecondReactionCount: number
}

export interface XpProgress {
  totalXp: number
  level: number
  currentLevelXp: number
  nextLevelXp: number
  xpIntoLevel: number
  xpNeededForNextLevel: number
  progress: number
}

export interface PracticeMessage {
  title: string
  detail: string
  tone: MessageTone
}

export interface SessionHistoryEntry {
  id: string
  completedAt: number
  mode: GameMode
  weapon: WeaponMode
  sessionType: SessionType
  repsCompleted: number
  successes: number
  average: number | null
  best: number | null
  accuracy: number
  wallbangHits: number
  headshots: number
}

export interface SessionSummary {
  completedAt: number
  mode: GameMode
  weapon: WeaponMode
  sessionType: SessionType
  targetReps: number | null
  stats: SessionStats
}

export interface ShotFeedback {
  title: string
  detail: string | null
  tone: MessageTone
  at: number
  xpGained: number
  xpLabel: string
  scored: boolean
  wallbang: boolean
  headshot: boolean
}

export interface RoundResult {
  success: boolean
  reactionTime: number | null
  wallbang: boolean
  headshot: boolean
  weapon: WeaponMode
  behavior: BehaviorId
  speed: PeekSpeedId
  score: number
  xpGained: number
  shotsFired: number
  missesBeforeHit: number
  killCount: number
  totalTargets: number
  averageReactionTime: number | null
  accuracy: number
  headshotCount: number
  wallbangCount: number
  killReactionTimes: number[]
  doorVisibilityAssist: boolean
  breakdown: ScoreBreakdownItem[]
}

export interface PersistentState {
  settings: GameSettings
  history: SessionHistoryEntry[]
  lifetime: LifetimeStats
}

export interface AuthAccount {
  name: string
  password: string
  xp: number
  stats: AccountStats
  cooldowns: AccountSubmissionCooldowns
}

export interface AnonymousProfile {
  id: string
  xp: number
  stats: AccountStats
}

export interface AuthState {
  accounts: AuthAccount[]
  activeUserName: string | null
  anonymousProfile: AnonymousProfile
}

export interface AccountStats {
  shots: number
  kills: number
  headshots: number
  wallbangs: number
  cumulativeReactionMs: number
  qualifyingReactionMs: number
  qualifyingReactionCount: number
  fastestReactionMs: number | null
  bestScore: number
}

export interface AccountSubmissionCooldowns {
  bugReportAt: number | null
  featureRequestAt: number | null
}

export type FeedbackCategory = 'bug-report' | 'feature-request' | 'review'

export interface FeedbackPost {
  id: string
  category: FeedbackCategory
  body: string
  createdAt: number
  authorName: string
  accountName: string | null
}

export interface FeedbackState {
  posts: FeedbackPost[]
}

export type LeaderboardCategory =
  | 'level'
  | 'xp'
  | 'kills'
  | 'average-reaction'
  | 'headshots'
  | 'wallbangs'
  | 'best-score'
  | 'accuracy'
  | 'fastest-reaction'

export interface LeaderboardCategoryOption {
  id: LeaderboardCategory
  label: string
}

export interface LeaderboardEntry {
  name: string
  accountName: string | null
  value: string
  secondaryValue?: string
}

export interface GameSnapshot {
  phase: GamePhase
  pointerLocked: boolean
  repNumber: number
  sessionGoal: number | null
  repsRemaining: number | null
  currentBehavior: BehaviorId | null
  currentSpeed: PeekSpeedId
  designedWallbang: boolean
  currentMessage: PracticeMessage | null
  stats: SessionStats
  summary: SessionSummary | null
  lastResult: RoundResult | null
  history: SessionHistoryEntry[]
  lifetime: LifetimeStats
  accountName: string | null
  activeTargetVisible: boolean
  activeTargetDoor: boolean
  activeTargetVisibleThroughDoor: boolean
  shotFeedback: ShotFeedback | null
  xp: XpProgress | null
  readyToFire: boolean
  scopeLevel: ScopeLevel
  favoriteWeapon: WeaponMode
  averageShotTimeMs: number | null
  persistenceVersion: number
}
