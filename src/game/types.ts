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

export type BadgeStyle = 'solid' | 'outline' | 'glow'
export type SeasonalTheme = 'off' | 'spring' | 'ember' | 'frost'
export type PreviewVariant = 'default' | 'scan' | 'ghost' | 'warm' | 'blueprint'

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
  id: string
  name: string
  password: string
  xp: number
  stats: AccountStats
  cooldowns: AccountSubmissionCooldowns
  badges: string[]
  featured: boolean
  suspended: boolean
  banned: boolean
  hiddenFromLeaderboard: boolean
  strictFeedbackCooldownMinutes: number | null
  nameColor: string | null
  adminNotes: string[]
}

export interface AnonymousProfile {
  profileId: string | null
  id: string
  xp: number
  stats: AccountStats
  alias: string | null
  hiddenFromLeaderboard: boolean
  adminNotes: string[]
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
  status: 'open' | 'reviewed' | 'fixed' | 'planned' | 'rejected' | 'added'
  pinned: boolean
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
  badges?: LeaderboardBadge[]
  nameColor?: string | null
  featured?: boolean
  pinned?: boolean
  admin?: boolean
  bot?: boolean
}

export interface LeaderboardSnapshot {
  id: LeaderboardCategory
  label: string
  entries: LeaderboardEntry[]
}

export interface LeaderboardBadge {
  id: string
  label: string
  color: string
  style: BadgeStyle
}

export interface BadgeDefinition {
  id: string
  name: string
  color: string
  style: BadgeStyle
}

export interface LeaderboardBot {
  id: string
  name: string
  xp: number
  stats: AccountStats
  locked: boolean
  featured: boolean
  hidden: boolean
  nameColor: string | null
  theme: string | null
}

export interface AdminAnnouncement {
  id: string
  text: string
  tone: MessageTone
  active: boolean
  expiresAt: number | null
}

export interface HomepageNotice {
  id: string
  text: string
  tone: MessageTone
  active: boolean
}

export interface ModeAdminConfig {
  enabled: boolean
  order: number
  popular: boolean
  highlightColor: string
  description: string
  previewVariant: PreviewVariant
  difficultyMultiplier: number
  experimental: boolean
}

export interface ModeShell {
  id: string
  label: string
  description: string
  previewVariant: PreviewVariant
  enabled: boolean
}

export interface WeaponAdminConfig {
  enabled: boolean
  cooldownMs: number
  xpBonusMultiplier: number
  featured: boolean
}

export interface SpeedAdminConfig {
  multiplier: number
  labelOverride: string | null
}

export interface AdminAuditEntry {
  id: string
  createdAt: number
  actor: string
  action: string
  detail: string
}

export interface AdminState {
  adminBadgeVisible: boolean
  leaderboardAutoRefreshSeconds: number
  announcementBannerText: string
  featuredMessage: string
  homepageNotices: HomepageNotice[]
  temporaryAnnouncements: AdminAnnouncement[]
  lobbyMessage: string
  featuredMode: PeekSelection | null
  featuredWeapon: WeaponMode | null
  seasonalTheme: SeasonalTheme
  buttonAccentColor: string
  specialUiHighlights: boolean
  madeByJonsmanStyle: 'default' | 'gradient' | 'glow'
  jonsmanThemeEnabled: boolean
  modeConfigs: Record<PeekSelection, ModeAdminConfig>
  modeShells: ModeShell[]
  weaponConfigs: Record<WeaponMode, WeaponAdminConfig>
  speedConfigs: Record<PeekSpeedId, SpeedAdminConfig>
  xpMultiplier: number
  maxXpPerShot: number
  levelBaseXp: number
  levelStepXp: number
  bonusXpEventMultiplier: number
  modeXpBonuses: Record<PeekSelection, number>
  weaponXpBonuses: Record<WeaponMode, number>
  headshotScoreBonus: number
  wallbangScoreBonus: number
  globalPeekDelayMinMs: number
  globalPeekDelayMaxMs: number
  roundStartMinEnemies: number
  roundStartMaxEnemies: number
  defaultWallhackEnabled: boolean
  defaultQualityPreset: GraphicsQualityId
  experimentalModesEnabled: boolean
  blockedWords: string[]
  spamProtectionEnabled: boolean
  leaderboardHighlightNames: string[]
  leaderboardPinnedNames: string[]
  badges: BadgeDefinition[]
  bots: LeaderboardBot[]
  fakeAnnouncementEnabled: boolean
  fakeAnnouncementText: string
  rainbowModeId: PeekSelection | null
  upsideDownPreviewId: PeekSelection | null
  confettiEnabled: boolean
  goofyEventTitle: string
  fakeGlobalChallenge: string
  footerTrollText: string
  jonsmanWasHereEnabled: boolean
  auditLog: AdminAuditEntry[]
  leaderboardRefreshNonce: number
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

export interface SessionBootstrapRequest {
  legacyAnonymousProfile?: AnonymousProfile | null
}

export interface SessionBootstrapResponse {
  authState: AuthState
  authMessage: string | null
}

export interface AuthMutationRequest {
  name: string
  password: string
  legacyAccount?: AuthAccount | null
}

export interface AuthMutationResponse {
  ok: boolean
  message: string
  authState: AuthState
}

export interface ProgressionSyncRequest {
  eventId: string
  xpDelta: number
  shotsDelta: number
  killsDelta: number
  headshotsDelta: number
  wallbangsDelta: number
  reactionTimes: number[]
  score: number | null
}

export interface ProgressionBatchSyncRequest {
  events: ProgressionSyncRequest[]
  reason?: string
}

export interface ProgressionSyncResponse {
  authState: AuthState
}

export interface ProgressionBatchSyncResponse {
  authState: AuthState
  acceptedEventIds: string[]
}

export interface CommunitySnapshotResponse {
  adminState: AdminState
  feedbackState: FeedbackState
}

export interface FeedbackMutationRequest {
  category: FeedbackCategory
  body: string
}

export interface FeedbackMutationResponse {
  ok: boolean
  message: string
  feedbackState: FeedbackState
  authState: AuthState
  remainingMs: number
}

export interface AdminAuthSyncRequest {
  authState: AuthState
}

export interface AdminFeedbackSyncRequest {
  feedbackState: FeedbackState
}

export interface AdminStateSyncRequest {
  adminState: AdminState
}
