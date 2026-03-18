import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  normalizeWeaponMode,
  withDerivedMode,
} from './constants.ts'
import { createEmptyLifetimeStats, createEmptyWeaponUsage } from './stats.ts'
import type { PersistentState } from './types.ts'

const clampHistory = (history: PersistentState['history']) =>
  history
    .slice(0, 12)
    .map((entry) => ({
      ...entry,
      weapon: normalizeWeaponMode(entry.weapon),
    }))

const mergeCrosshairSettings = (
  crosshair: Partial<PersistentState['settings']['crosshair']> | undefined,
) => {
  if (!crosshair) {
    return DEFAULT_SETTINGS.crosshair
  }

  if ('normal' in crosshair || 'scoped' in crosshair) {
    return {
      normal: {
        ...DEFAULT_SETTINGS.crosshair.normal,
        ...crosshair.normal,
      },
      scoped: {
        ...DEFAULT_SETTINGS.crosshair.scoped,
        ...crosshair.scoped,
      },
    }
  }

  const legacy = crosshair as Partial<{
    color: string
    gap: number
    thickness: number
    size: number
    style: string
  }>

  return {
    normal: {
      ...DEFAULT_SETTINGS.crosshair.normal,
      color: legacy.color ?? DEFAULT_SETTINGS.crosshair.normal.color,
      lineLength:
        legacy.size ?? DEFAULT_SETTINGS.crosshair.normal.lineLength,
      gap: legacy.gap ?? DEFAULT_SETTINGS.crosshair.normal.gap,
      thickness:
        legacy.thickness ?? DEFAULT_SETTINGS.crosshair.normal.thickness,
      showCenterDot: legacy.style === 'dot',
    },
    scoped: {
      ...DEFAULT_SETTINGS.crosshair.scoped,
    },
  }
}

export const loadPersistentState = (): PersistentState => {
  if (typeof window === 'undefined') {
    return {
      settings: DEFAULT_SETTINGS,
      history: [],
      lifetime: createEmptyLifetimeStats(),
    }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        settings: DEFAULT_SETTINGS,
        history: [],
        lifetime: createEmptyLifetimeStats(),
      }
    }

    const parsed = JSON.parse(raw) as Partial<PersistentState>

    return {
      settings: withDerivedMode({
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
        crosshair: mergeCrosshairSettings(parsed.settings?.crosshair),
        difficulty: {
          ...DEFAULT_SETTINGS.difficulty,
          ...parsed.settings?.difficulty,
        },
      }),
      history: Array.isArray(parsed.history) ? clampHistory(parsed.history) : [],
      lifetime: {
        ...createEmptyLifetimeStats(),
        ...parsed.lifetime,
        weaponUsage: {
          ...createEmptyWeaponUsage(),
          ...parsed.lifetime?.weaponUsage,
        },
      },
    }
  } catch {
    return {
      settings: DEFAULT_SETTINGS,
      history: [],
      lifetime: createEmptyLifetimeStats(),
    }
  }
}

export const savePersistentState = (state: PersistentState) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      settings: withDerivedMode(state.settings),
      history: clampHistory(state.history),
      lifetime: state.lifetime,
    }),
  )
}
