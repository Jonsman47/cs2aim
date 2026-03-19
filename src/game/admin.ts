import {
  GRAPHICS_QUALITY_OPTIONS,
  PEEK_SELECTION_DETAILS,
  PEEK_SELECTIONS,
  POPULAR_PEEK_SELECTIONS,
  WEAPON_PROPERTIES,
  WEAPON_SELECTIONS,
} from './constants.js'
import type {
  AccountStats,
  AdminState,
  BadgeDefinition,
  GraphicsQualityId,
  HomepageNotice,
  LeaderboardBot,
  ModeAdminConfig,
  PeekSelection,
  PeekSpeedId,
  PreviewVariant,
  SpeedAdminConfig,
  WeaponAdminConfig,
  WeaponMode,
} from './types.js'

export const ADMIN_STORAGE_KEY = 'midlane-reaction-admin'
export const ADMIN_USERNAME = 'Jonsman'

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const createEmptyStats = (): AccountStats => ({
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

const createDefaultModeConfigs = (): Record<PeekSelection, ModeAdminConfig> =>
  Object.fromEntries(
    PEEK_SELECTIONS.map((peek, index) => [
      peek,
      {
        enabled: true,
        order: index,
        popular: POPULAR_PEEK_SELECTIONS.includes(peek),
        highlightColor: POPULAR_PEEK_SELECTIONS.includes(peek) ? '#6fd684' : '#89f4cd',
        description: PEEK_SELECTION_DETAILS[peek],
        previewVariant: 'default' as PreviewVariant,
        difficultyMultiplier: 1,
        experimental: false,
      },
    ]),
  ) as Record<PeekSelection, ModeAdminConfig>

const createDefaultWeaponConfigs = (): Record<WeaponMode, WeaponAdminConfig> =>
  Object.fromEntries(
    WEAPON_SELECTIONS.map((weapon) => [
      weapon,
      {
        enabled: true,
        cooldownMs: WEAPON_PROPERTIES[weapon].cooldownMs,
        xpBonusMultiplier: 1,
        featured: false,
      },
    ]),
  ) as Record<WeaponMode, WeaponAdminConfig>

const SPEED_IDS: PeekSpeedId[] = [
  'very-slow',
  'slow',
  'normal',
  'fast',
  'very-fast',
  'super-fast',
]

const createDefaultSpeedConfigs = (): Record<PeekSpeedId, SpeedAdminConfig> =>
  Object.fromEntries(
    SPEED_IDS.map((speed) => [
      speed,
      {
        multiplier: 1,
        labelOverride: null,
      },
    ]),
  ) as Record<PeekSpeedId, SpeedAdminConfig>

const createDefaultModeBonuses = () =>
  Object.fromEntries(PEEK_SELECTIONS.map((peek) => [peek, 1])) as Record<
    PeekSelection,
    number
  >

const createDefaultWeaponBonuses = () =>
  Object.fromEntries(WEAPON_SELECTIONS.map((weapon) => [weapon, 1])) as Record<
    WeaponMode,
    number
  >

const DEFAULT_BADGES: BadgeDefinition[] = [
  {
    id: 'admin',
    name: 'Admin',
    color: '#c15cff',
    style: 'glow',
  },
  {
    id: 'featured',
    name: 'Featured',
    color: '#6fd684',
    style: 'solid',
  },
  {
    id: 'certified-aimer',
    name: 'Certified Aimer',
    color: '#ffd466',
    style: 'glow',
  },
]

export const createDefaultAdminState = (): AdminState => ({
  adminBadgeVisible: true,
  leaderboardAutoRefreshSeconds: 30,
  announcementBannerText: '',
  featuredMessage: '',
  homepageNotices: [],
  temporaryAnnouncements: [],
  lobbyMessage: '',
  featuredMode: null,
  featuredWeapon: null,
  seasonalTheme: 'off',
  buttonAccentColor: '#72f0c4',
  specialUiHighlights: true,
  madeByJonsmanStyle: 'gradient',
  jonsmanThemeEnabled: true,
  modeConfigs: createDefaultModeConfigs(),
  modeShells: [],
  weaponConfigs: createDefaultWeaponConfigs(),
  speedConfigs: createDefaultSpeedConfigs(),
  xpMultiplier: 1,
  maxXpPerShot: 1000,
  levelBaseXp: 5000,
  levelStepXp: 1000,
  bonusXpEventMultiplier: 1,
  modeXpBonuses: createDefaultModeBonuses(),
  weaponXpBonuses: createDefaultWeaponBonuses(),
  headshotScoreBonus: 6,
  wallbangScoreBonus: 6,
  globalPeekDelayMinMs: 1000,
  globalPeekDelayMaxMs: 10000,
  roundStartMinEnemies: 2,
  roundStartMaxEnemies: 4,
  defaultWallhackEnabled: false,
  defaultQualityPreset: 'medium',
  experimentalModesEnabled: false,
  blockedWords: ['slur', 'hateword'],
  spamProtectionEnabled: true,
  leaderboardHighlightNames: [],
  leaderboardPinnedNames: [],
  badges: DEFAULT_BADGES,
  bots: [],
  fakeAnnouncementEnabled: false,
  fakeAnnouncementText: 'Totally real breaking news from Jonsman.',
  rainbowModeId: null,
  upsideDownPreviewId: null,
  confettiEnabled: false,
  goofyEventTitle: '',
  fakeGlobalChallenge: '',
  footerTrollText: '',
  jonsmanWasHereEnabled: false,
  auditLog: [],
  leaderboardRefreshNonce: 0,
})

const normalizeStats = (stats: Partial<AccountStats> | undefined): AccountStats => ({
  ...createEmptyStats(),
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

const normalizeBadge = (badge: Partial<BadgeDefinition> | undefined): BadgeDefinition => ({
  id: typeof badge?.id === 'string' && badge.id ? badge.id : createId('badge'),
  name: typeof badge?.name === 'string' && badge.name ? badge.name : 'Badge',
  color: typeof badge?.color === 'string' && badge.color ? badge.color : '#72f0c4',
  style:
    badge?.style === 'outline' || badge?.style === 'glow' || badge?.style === 'solid'
      ? badge.style
      : 'solid',
})

const normalizeBot = (bot: Partial<LeaderboardBot> | undefined): LeaderboardBot => ({
  id: typeof bot?.id === 'string' && bot.id ? bot.id : createId('bot'),
  name: typeof bot?.name === 'string' && bot.name ? bot.name : 'Bot',
  xp: Number(bot?.xp) || 0,
  stats: normalizeStats(bot?.stats),
  locked: Boolean(bot?.locked),
  featured: Boolean(bot?.featured),
  hidden: Boolean(bot?.hidden),
  nameColor: typeof bot?.nameColor === 'string' && bot.nameColor ? bot.nameColor : null,
  theme: typeof bot?.theme === 'string' && bot.theme ? bot.theme : null,
})

const normalizeModeConfigs = (
  modeConfigs: Partial<Record<PeekSelection, Partial<ModeAdminConfig>>> | undefined,
) => {
  const defaults = createDefaultModeConfigs()

  for (const peek of PEEK_SELECTIONS) {
    defaults[peek] = {
      ...defaults[peek],
      ...modeConfigs?.[peek],
      enabled: modeConfigs?.[peek]?.enabled ?? defaults[peek].enabled,
      popular: modeConfigs?.[peek]?.popular ?? defaults[peek].popular,
      highlightColor:
        typeof modeConfigs?.[peek]?.highlightColor === 'string' &&
        modeConfigs[peek]?.highlightColor
          ? modeConfigs[peek]?.highlightColor ?? defaults[peek].highlightColor
          : defaults[peek].highlightColor,
      description:
        typeof modeConfigs?.[peek]?.description === 'string' &&
        modeConfigs[peek]?.description
          ? modeConfigs[peek]?.description ?? defaults[peek].description
          : defaults[peek].description,
      previewVariant:
        modeConfigs?.[peek]?.previewVariant === 'scan' ||
        modeConfigs?.[peek]?.previewVariant === 'ghost' ||
        modeConfigs?.[peek]?.previewVariant === 'warm' ||
        modeConfigs?.[peek]?.previewVariant === 'blueprint'
          ? modeConfigs[peek]?.previewVariant ?? defaults[peek].previewVariant
          : defaults[peek].previewVariant,
      difficultyMultiplier: clamp(
        Number(modeConfigs?.[peek]?.difficultyMultiplier) || defaults[peek].difficultyMultiplier,
        0.45,
        2.5,
      ),
      order: Number(modeConfigs?.[peek]?.order) || defaults[peek].order,
      experimental: Boolean(modeConfigs?.[peek]?.experimental),
    }
  }

  return defaults
}

const normalizeWeaponConfigs = (
  weaponConfigs: Partial<Record<WeaponMode, Partial<WeaponAdminConfig>>> | undefined,
) => {
  const defaults = createDefaultWeaponConfigs()

  for (const weapon of WEAPON_SELECTIONS) {
    defaults[weapon] = {
      ...defaults[weapon],
      ...weaponConfigs?.[weapon],
      enabled: weaponConfigs?.[weapon]?.enabled ?? defaults[weapon].enabled,
      cooldownMs: clamp(
        Number(weaponConfigs?.[weapon]?.cooldownMs) || defaults[weapon].cooldownMs,
        40,
        1200,
      ),
      xpBonusMultiplier: clamp(
        Number(weaponConfigs?.[weapon]?.xpBonusMultiplier) || 1,
        0.25,
        4,
      ),
      featured: Boolean(weaponConfigs?.[weapon]?.featured),
    }
  }

  return defaults
}

const normalizeSpeedConfigs = (
  speedConfigs: Partial<Record<PeekSpeedId, Partial<SpeedAdminConfig>>> | undefined,
) => {
  const defaults = createDefaultSpeedConfigs()

  for (const speed of SPEED_IDS) {
    defaults[speed] = {
      multiplier: clamp(
        Number(speedConfigs?.[speed]?.multiplier) || defaults[speed].multiplier,
        0.5,
        2,
      ),
      labelOverride:
        typeof speedConfigs?.[speed]?.labelOverride === 'string' &&
        speedConfigs[speed]?.labelOverride
          ? speedConfigs[speed]?.labelOverride ?? null
          : null,
    }
  }

  return defaults
}

const normalizeModeBonuses = (
  bonuses: Partial<Record<PeekSelection, number>> | undefined,
) => {
  const defaults = createDefaultModeBonuses()

  for (const peek of PEEK_SELECTIONS) {
    defaults[peek] = clamp(Number(bonuses?.[peek]) || defaults[peek], 0.25, 4)
  }

  return defaults
}

const normalizeWeaponBonuses = (
  bonuses: Partial<Record<WeaponMode, number>> | undefined,
) => {
  const defaults = createDefaultWeaponBonuses()

  for (const weapon of WEAPON_SELECTIONS) {
    defaults[weapon] = clamp(Number(bonuses?.[weapon]) || defaults[weapon], 0.25, 4)
  }

  return defaults
}

export const normalizeAdminState = (
  state: Partial<AdminState> | undefined,
): AdminState => {
  const defaults = createDefaultAdminState()
  const defaultQualityPreset =
    typeof state?.defaultQualityPreset === 'string' &&
    GRAPHICS_QUALITY_OPTIONS.includes(state.defaultQualityPreset as GraphicsQualityId)
      ? (state.defaultQualityPreset as GraphicsQualityId)
      : defaults.defaultQualityPreset

  return {
    ...defaults,
    ...state,
    homepageNotices: Array.isArray(state?.homepageNotices)
      ? state.homepageNotices.map(
          (notice): HomepageNotice => ({
            id: typeof notice.id === 'string' && notice.id ? notice.id : createId('notice'),
            text: typeof notice.text === 'string' ? notice.text : '',
            tone: notice.tone ?? 'neutral',
            active: notice.active ?? true,
          }),
        )
      : defaults.homepageNotices,
    temporaryAnnouncements: Array.isArray(state?.temporaryAnnouncements)
      ? state.temporaryAnnouncements.map((announcement) => ({
          id:
            typeof announcement.id === 'string' && announcement.id
              ? announcement.id
              : createId('announcement'),
          text: typeof announcement.text === 'string' ? announcement.text : '',
          tone: announcement.tone ?? 'neutral',
          active: announcement.active ?? true,
          expiresAt:
            typeof announcement.expiresAt === 'number' ? announcement.expiresAt : null,
        }))
      : defaults.temporaryAnnouncements,
    badges: Array.isArray(state?.badges)
      ? state.badges.map((badge) => normalizeBadge(badge))
      : defaults.badges,
    bots: Array.isArray(state?.bots)
      ? state.bots.map((bot) => normalizeBot(bot))
      : defaults.bots,
    modeConfigs: normalizeModeConfigs(state?.modeConfigs),
    modeShells: Array.isArray(state?.modeShells)
      ? state.modeShells.map((shell) => ({
          id: typeof shell.id === 'string' && shell.id ? shell.id : createId('shell'),
          label: typeof shell.label === 'string' && shell.label ? shell.label : 'Mode Template',
          description:
            typeof shell.description === 'string' ? shell.description : 'Experimental shell.',
          previewVariant:
            shell.previewVariant === 'scan' ||
            shell.previewVariant === 'ghost' ||
            shell.previewVariant === 'warm' ||
            shell.previewVariant === 'blueprint'
              ? shell.previewVariant
              : 'default',
          enabled: shell.enabled ?? true,
        }))
      : defaults.modeShells,
    weaponConfigs: normalizeWeaponConfigs(state?.weaponConfigs),
    speedConfigs: normalizeSpeedConfigs(state?.speedConfigs),
    xpMultiplier: clamp(Number(state?.xpMultiplier) || defaults.xpMultiplier, 0.25, 4),
    maxXpPerShot: clamp(
      Number(state?.maxXpPerShot) || defaults.maxXpPerShot,
      50,
      10000,
    ),
    levelBaseXp: clamp(
      Number(state?.levelBaseXp) || defaults.levelBaseXp,
      500,
      50000,
    ),
    levelStepXp: clamp(
      Number(state?.levelStepXp) || defaults.levelStepXp,
      0,
      10000,
    ),
    bonusXpEventMultiplier: clamp(
      Number(state?.bonusXpEventMultiplier) || defaults.bonusXpEventMultiplier,
      0.25,
      5,
    ),
    modeXpBonuses: normalizeModeBonuses(state?.modeXpBonuses),
    weaponXpBonuses: normalizeWeaponBonuses(state?.weaponXpBonuses),
    headshotScoreBonus: clamp(
      Number(state?.headshotScoreBonus) || defaults.headshotScoreBonus,
      0,
      30,
    ),
    wallbangScoreBonus: clamp(
      Number(state?.wallbangScoreBonus) || defaults.wallbangScoreBonus,
      0,
      30,
    ),
    globalPeekDelayMinMs: clamp(
      Number(state?.globalPeekDelayMinMs) || defaults.globalPeekDelayMinMs,
      250,
      12000,
    ),
    globalPeekDelayMaxMs: clamp(
      Number(state?.globalPeekDelayMaxMs) || defaults.globalPeekDelayMaxMs,
      250,
      18000,
    ),
    roundStartMinEnemies: clamp(
      Number(state?.roundStartMinEnemies) || defaults.roundStartMinEnemies,
      1,
      6,
    ),
    roundStartMaxEnemies: clamp(
      Number(state?.roundStartMaxEnemies) || defaults.roundStartMaxEnemies,
      1,
      8,
    ),
    defaultWallhackEnabled:
      state?.defaultWallhackEnabled ?? defaults.defaultWallhackEnabled,
    defaultQualityPreset,
    experimentalModesEnabled:
      state?.experimentalModesEnabled ?? defaults.experimentalModesEnabled,
    blockedWords: Array.isArray(state?.blockedWords)
      ? state.blockedWords.filter(
          (word): word is string => typeof word === 'string' && word.trim().length > 0,
        )
      : defaults.blockedWords,
    spamProtectionEnabled:
      state?.spamProtectionEnabled ?? defaults.spamProtectionEnabled,
    leaderboardHighlightNames: Array.isArray(state?.leaderboardHighlightNames)
      ? state.leaderboardHighlightNames.filter(
          (name): name is string => typeof name === 'string' && name.trim().length > 0,
        )
      : defaults.leaderboardHighlightNames,
    leaderboardPinnedNames: Array.isArray(state?.leaderboardPinnedNames)
      ? state.leaderboardPinnedNames.filter(
          (name): name is string => typeof name === 'string' && name.trim().length > 0,
        )
      : defaults.leaderboardPinnedNames,
    announcementBannerText:
      typeof state?.announcementBannerText === 'string'
        ? state.announcementBannerText
        : defaults.announcementBannerText,
    featuredMessage:
      typeof state?.featuredMessage === 'string'
        ? state.featuredMessage
        : defaults.featuredMessage,
    lobbyMessage:
      typeof state?.lobbyMessage === 'string' ? state.lobbyMessage : defaults.lobbyMessage,
    featuredMode:
      typeof state?.featuredMode === 'string' &&
      PEEK_SELECTIONS.includes(state.featuredMode as PeekSelection)
        ? (state.featuredMode as PeekSelection)
        : defaults.featuredMode,
    featuredWeapon:
      typeof state?.featuredWeapon === 'string' &&
      WEAPON_SELECTIONS.includes(state.featuredWeapon as WeaponMode)
        ? (state.featuredWeapon as WeaponMode)
        : defaults.featuredWeapon,
    seasonalTheme:
      state?.seasonalTheme === 'spring' ||
      state?.seasonalTheme === 'ember' ||
      state?.seasonalTheme === 'frost'
        ? state.seasonalTheme
        : defaults.seasonalTheme,
    buttonAccentColor:
      typeof state?.buttonAccentColor === 'string' && state.buttonAccentColor
        ? state.buttonAccentColor
        : defaults.buttonAccentColor,
    specialUiHighlights:
      state?.specialUiHighlights ?? defaults.specialUiHighlights,
    madeByJonsmanStyle:
      state?.madeByJonsmanStyle === 'default' ||
      state?.madeByJonsmanStyle === 'glow'
        ? state.madeByJonsmanStyle
        : defaults.madeByJonsmanStyle,
    jonsmanThemeEnabled: state?.jonsmanThemeEnabled ?? defaults.jonsmanThemeEnabled,
    adminBadgeVisible: state?.adminBadgeVisible ?? defaults.adminBadgeVisible,
    leaderboardAutoRefreshSeconds: clamp(
      Number(state?.leaderboardAutoRefreshSeconds) || defaults.leaderboardAutoRefreshSeconds,
      5,
      300,
    ),
    fakeAnnouncementEnabled:
      state?.fakeAnnouncementEnabled ?? defaults.fakeAnnouncementEnabled,
    fakeAnnouncementText:
      typeof state?.fakeAnnouncementText === 'string'
        ? state.fakeAnnouncementText
        : defaults.fakeAnnouncementText,
    rainbowModeId:
      typeof state?.rainbowModeId === 'string' &&
      PEEK_SELECTIONS.includes(state.rainbowModeId as PeekSelection)
        ? (state.rainbowModeId as PeekSelection)
        : defaults.rainbowModeId,
    upsideDownPreviewId:
      typeof state?.upsideDownPreviewId === 'string' &&
      PEEK_SELECTIONS.includes(state.upsideDownPreviewId as PeekSelection)
        ? (state.upsideDownPreviewId as PeekSelection)
        : defaults.upsideDownPreviewId,
    confettiEnabled: state?.confettiEnabled ?? defaults.confettiEnabled,
    goofyEventTitle:
      typeof state?.goofyEventTitle === 'string'
        ? state.goofyEventTitle
        : defaults.goofyEventTitle,
    fakeGlobalChallenge:
      typeof state?.fakeGlobalChallenge === 'string'
        ? state.fakeGlobalChallenge
        : defaults.fakeGlobalChallenge,
    footerTrollText:
      typeof state?.footerTrollText === 'string'
        ? state.footerTrollText
        : defaults.footerTrollText,
    jonsmanWasHereEnabled:
      state?.jonsmanWasHereEnabled ?? defaults.jonsmanWasHereEnabled,
    auditLog: Array.isArray(state?.auditLog)
      ? state.auditLog
          .map((entry) => ({
            id: typeof entry.id === 'string' && entry.id ? entry.id : createId('audit'),
            createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
            actor: typeof entry.actor === 'string' ? entry.actor : ADMIN_USERNAME,
            action: typeof entry.action === 'string' ? entry.action : 'Admin action',
            detail: typeof entry.detail === 'string' ? entry.detail : '',
          }))
          .slice(0, 120)
      : defaults.auditLog,
    leaderboardRefreshNonce: Number(state?.leaderboardRefreshNonce) || 0,
  }
}

let runtimeAdminState = createDefaultAdminState()

const applyWeaponRuntimeConfig = (state: AdminState) => {
  for (const weapon of WEAPON_SELECTIONS) {
    WEAPON_PROPERTIES[weapon].cooldownMs = state.weaponConfigs[weapon].cooldownMs
  }
}

export const setAdminRuntimeState = (state: AdminState) => {
  runtimeAdminState = normalizeAdminState(state)
  applyWeaponRuntimeConfig(runtimeAdminState)
}

export const getAdminRuntimeState = () => runtimeAdminState

export const loadAdminState = (): AdminState => {
  if (typeof window === 'undefined') {
    return runtimeAdminState
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<AdminState>) : undefined
    const normalized = normalizeAdminState(parsed)
    setAdminRuntimeState(normalized)
    return normalized
  } catch {
    const fallback = createDefaultAdminState()
    setAdminRuntimeState(fallback)
    return fallback
  }
}

export const saveAdminState = (state: AdminState) => {
  const normalized = normalizeAdminState(state)
  setAdminRuntimeState(normalized)
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(normalized))
}

export const isAdminAccountName = (name: string | null | undefined) => name === ADMIN_USERNAME

export const getAvailableModeSelections = (state: AdminState) =>
  PEEK_SELECTIONS.filter((peek) => {
    const config = state.modeConfigs[peek]
    if (!config.enabled) {
      return false
    }

    return state.experimentalModesEnabled || !config.experimental
  }).sort((left, right) => state.modeConfigs[left].order - state.modeConfigs[right].order)

export const getAvailableWeaponSelections = (state: AdminState) =>
  WEAPON_SELECTIONS.filter((weapon) => state.weaponConfigs[weapon].enabled)

export const appendAuditEntry = (
  state: AdminState,
  actor: string,
  action: string,
  detail: string,
) => ({
  ...state,
  auditLog: [
    {
      id: createId('audit'),
      createdAt: Date.now(),
      actor,
      action,
      detail,
    },
    ...state.auditLog,
  ].slice(0, 120),
})

export const getSiteStorageOverview = () => {
  if (typeof window === 'undefined') {
    return []
  }

  return Object.keys(window.localStorage)
    .sort()
    .map((key) => ({
      key,
      bytes: window.localStorage.getItem(key)?.length ?? 0,
    }))
}

export const getActiveAnnouncements = (state: AdminState, now = Date.now()) =>
  state.temporaryAnnouncements.filter(
    (announcement) =>
      announcement.active &&
      announcement.text.trim().length > 0 &&
      (announcement.expiresAt === null || announcement.expiresAt > now),
  )

export const getActiveHomepageNotices = (state: AdminState) =>
  state.homepageNotices.filter((notice) => notice.active && notice.text.trim().length > 0)

export const getModePreviewVariantClass = (
  state: AdminState,
  peek: PeekSelection,
  previewVariant: PreviewVariant,
) => {
  if (state.upsideDownPreviewId === peek) {
    return 'is-upside-down'
  }

  if (state.rainbowModeId === peek) {
    return 'is-rainbow'
  }

  return previewVariant === 'default' ? '' : `preview-${previewVariant}`
}

export const getThemeClassNames = (state: AdminState) => ({
  seasonal: state.seasonalTheme === 'off' ? '' : `season-${state.seasonalTheme}`,
  jonsmanTheme: state.jonsmanThemeEnabled ? 'jonsman-theme-on' : 'jonsman-theme-off',
})
