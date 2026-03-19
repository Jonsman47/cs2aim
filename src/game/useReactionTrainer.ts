import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createAudioBus } from './audio.js'
import {
  appendAuditEntry,
  createDefaultAdminState,
  getActiveAnnouncements,
  getActiveHomepageNotices,
  getAvailableModeSelections,
  getAvailableWeaponSelections,
  getModePreviewVariantClass,
  getSiteStorageOverview,
  getThemeClassNames,
  isAdminAccountName,
  loadAdminState,
  normalizeAdminState,
  saveAdminState,
  setAdminRuntimeState,
  ADMIN_USERNAME,
} from './admin.js'
import {
  createEmptyAnonymousProfile,
  createEmptyAccountStats,
  getActiveAccount,
  getProgressionProfile,
  loginAccount,
  loadAuthState,
  logoutAccount,
  registerAccount,
  saveAuthState,
  updateAccountProgress,
} from './auth.js'
import {
  DEFAULT_SETTINGS,
  PEEK_SELECTIONS,
  UI_KEYBINDS,
  WEAPON_SELECTIONS,
  withDerivedMode,
} from './constants.js'
import {
  loadFeedbackState,
  saveFeedbackState,
  submitFeedbackPost,
} from './feedback.js'
import {
  applySettings,
  cycleScopeLevel,
  createGameRuntime,
  fireShot,
  getSnapshot,
  resetToMenu,
  setAccountSession,
  setPointerLocked,
  skipToNextRep,
  startSession,
  updateAimFromAbsolute,
  updateAimFromDelta,
  updateRuntime,
} from './engine.js'
import { renderScene } from './renderer.js'
import { loadPersistentState, savePersistentState } from './storage.js'
import { createEmptyLifetimeStats } from './stats.js'
import { getLevelStartXp } from './xp.js'
import type {
  AccountStats,
  AdminState,
  AuthAccount,
  AuthState,
  FeedbackPost,
  FeedbackState,
  GameSettings,
  HomepageNotice,
  PeekSelection,
  WeaponMode,
} from './types.js'

const loadedState = loadPersistentState()
const loadedAuthState = loadAuthState()
const loadedCachedFeedbackState = loadFeedbackState()
const loadedCachedAdminState = loadAdminState()

const normalizeLookupName = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? ''

const findAccountIndexByName = (accounts: AuthAccount[], name: string) =>
  accounts.findIndex(
    (account) => normalizeLookupName(account.name) === normalizeLookupName(name),
  )

const hasMeaningfulStats = (stats: AccountStats) =>
  stats.shots > 0 ||
  stats.kills > 0 ||
  stats.headshots > 0 ||
  stats.wallbangs > 0 ||
  stats.cumulativeReactionMs > 0 ||
  stats.qualifyingReactionMs > 0 ||
  stats.qualifyingReactionCount > 0 ||
  stats.fastestReactionMs !== null ||
  stats.bestScore > 0

const mergeStats = (base: AccountStats, bonus: AccountStats): AccountStats => ({
  shots: base.shots + bonus.shots,
  kills: base.kills + bonus.kills,
  headshots: base.headshots + bonus.headshots,
  wallbangs: base.wallbangs + bonus.wallbangs,
  cumulativeReactionMs: base.cumulativeReactionMs + bonus.cumulativeReactionMs,
  qualifyingReactionMs: base.qualifyingReactionMs + bonus.qualifyingReactionMs,
  qualifyingReactionCount: base.qualifyingReactionCount + bonus.qualifyingReactionCount,
  fastestReactionMs:
    base.fastestReactionMs === null
      ? bonus.fastestReactionMs
      : bonus.fastestReactionMs === null
        ? base.fastestReactionMs
        : Math.min(base.fastestReactionMs, bonus.fastestReactionMs),
  bestScore: Math.max(base.bestScore, bonus.bestScore),
})

const clearReactionStats = (stats: AccountStats): AccountStats => ({
  ...stats,
  cumulativeReactionMs: 0,
  qualifyingReactionMs: 0,
  qualifyingReactionCount: 0,
  fastestReactionMs: null,
})

const createForcedRename = () =>
  `Renamed-${Math.floor(Math.random() * 900 + 100)}`

const createInitialRuntime = () => {
  const runtime = createGameRuntime(
    withDerivedMode(loadedState.settings),
    loadedState.history,
    loadedState.lifetime,
  )
  const initialProfile = getProgressionProfile(loadedAuthState)
  setAccountSession(
    runtime,
    initialProfile.displayName,
    initialProfile.xp,
  )
  return runtime
}

const getAudioVolume = (settings: GameSettings) =>
  settings.soundEnabled ? Math.max(0, Math.min(settings.masterVolume, 1)) : 0

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT')

export const useReactionTrainer = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioRef = useRef<ReturnType<typeof createAudioBus> | null>(null)
  const runtimeRef = useRef<ReturnType<typeof createGameRuntime>>(null as never)
  if (!runtimeRef.current) {
    runtimeRef.current = createInitialRuntime()
  }
  const [settings, setSettings] = useState<GameSettings>(
    withDerivedMode(loadedState.settings),
  )
  const [authState, setAuthState] = useState<AuthState>(loadedAuthState)
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(loadedCachedFeedbackState)
  const [adminState, setAdminState] = useState<AdminState>(loadedCachedAdminState)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [adminStatus, setAdminStatus] = useState<{
    tone: 'good' | 'warn'
    message: string
  } | null>(null)
  const [feedbackStatus, setFeedbackStatus] = useState<{
    bugReport: { tone: 'good' | 'warn'; message: string } | null
    featureRequest: { tone: 'good' | 'warn'; message: string } | null
    review: { tone: 'good' | 'warn'; message: string } | null
  }>({
    bugReport: null,
    featureRequest: null,
    review: null,
  })
  const [snapshot, setSnapshot] = useState(() => getSnapshot(runtimeRef.current))
  const lastProgressSnapshotRef = useRef(getSnapshot(runtimeRef.current))
  const activeAccount = getActiveAccount(authState)
  const progressionProfile = getProgressionProfile(authState)
  const isAdmin = isAdminAccountName(activeAccount?.name ?? null)

  const syncSnapshot = () => {
    startTransition(() => {
      setSnapshot(getSnapshot(runtimeRef.current))
    })
  }

  useEffect(() => {
    applySettings(runtimeRef.current, withDerivedMode(settings))
  }, [settings])

  useEffect(() => {
    savePersistentState({
      settings,
      history: runtimeRef.current.history,
      lifetime: runtimeRef.current.lifetime,
    })
  }, [settings, snapshot.persistenceVersion])

  useEffect(() => {
    saveAuthState(authState)
  }, [authState])

  useEffect(() => {
    saveFeedbackState(feedbackState)
  }, [feedbackState])

  useEffect(() => {
    saveAdminState(adminState)
  }, [adminState])

  useEffect(() => {
    const nextProfile = getProgressionProfile(authState)
    setAccountSession(
      runtimeRef.current,
      nextProfile.displayName,
      nextProfile.xp,
    )
    lastProgressSnapshotRef.current = getSnapshot(runtimeRef.current)
    syncSnapshot()
  }, [authState])

  useEffect(() => {
    const nextSettings = ensureAllowedSettings(settings, adminState)
    if (
      nextSettings.selectedPeek !== settings.selectedPeek ||
      nextSettings.weapon !== settings.weapon
    ) {
      setSettings(nextSettings)
      applySettings(runtimeRef.current, nextSettings)
      persistRuntimeState(nextSettings)
    }
  }, [adminState, settings])

  useEffect(() => {
    const runtime = runtimeRef.current
    const currentSnapshot = getSnapshot(runtime)
    const previousSnapshot = lastProgressSnapshotRef.current
    lastProgressSnapshotRef.current = currentSnapshot

    const shotsDelta =
      Math.max(currentSnapshot.stats.hits - previousSnapshot.stats.hits, 0) +
      Math.max(currentSnapshot.stats.misses - previousSnapshot.stats.misses, 0)
    const killsDelta = Math.max(currentSnapshot.stats.hits - previousSnapshot.stats.hits, 0)
    const headshotsDelta = Math.max(
      currentSnapshot.stats.headshots - previousSnapshot.stats.headshots,
      0,
    )
    const wallbangsDelta = Math.max(
      currentSnapshot.stats.wallbangHits - previousSnapshot.stats.wallbangHits,
      0,
    )
    const reactionTimes =
      killsDelta > 0
        ? currentSnapshot.lastResult?.killReactionTimes?.length
          ? currentSnapshot.lastResult.killReactionTimes
          : currentSnapshot.lastResult?.reactionTime !== null &&
              currentSnapshot.lastResult?.reactionTime !== undefined
            ? [currentSnapshot.lastResult.reactionTime]
            : currentSnapshot.stats.lastSuccessful !== null
              ? [currentSnapshot.stats.lastSuccessful]
              : []
        : []
    const reactionTime =
      reactionTimes.length > 0 ? reactionTimes[reactionTimes.length - 1] : null
    const score = killsDelta > 0 ? currentSnapshot.lastResult?.score ?? null : null
    const hasMeaningfulProgressChange =
      runtime.accountXp > progressionProfile.xp ||
      shotsDelta > 0 ||
      killsDelta > 0 ||
      headshotsDelta > 0 ||
      wallbangsDelta > 0 ||
      reactionTimes.length > 0 ||
      score !== null

    if (!hasMeaningfulProgressChange) {
      return
    }

    setAuthState((current) =>
      updateAccountProgress(current, getActiveAccount(current)?.name ?? null, {
        xp: runtime.accountXp,
        shotsDelta,
        killsDelta,
        headshotsDelta,
        wallbangsDelta,
        reactionTime,
        reactionTimes,
        score,
      }),
    )
  }, [
    progressionProfile.xp,
    snapshot.persistenceVersion,
  ])

  useEffect(() => {
    if (
      (snapshot.phase === 'summary' || snapshot.phase === 'menu') &&
      document.pointerLockElement === canvasRef.current
    ) {
      void document.exitPointerLock()
    }
  }, [snapshot.phase])

  useEffect(() => {
    let frame = 0
    let lastUiSync = 0
    let lastHiddenTick = 0

    const loop = (now: number) => {
      const tabHidden = document.visibilityState === 'hidden'
      if (tabHidden && now - lastHiddenTick < 120) {
        frame = window.requestAnimationFrame(loop)
        return
      }

      lastHiddenTick = now
      updateRuntime(runtimeRef.current, now)

      const canvas = canvasRef.current
      if (canvas && !tabHidden) {
        renderScene(canvas, runtimeRef.current, now)
      }

      const uiSyncInterval =
        runtimeRef.current.phase === 'active' || runtimeRef.current.phase === 'preround'
          ? 64
          : 96

      if (now - lastUiSync > uiSyncInterval) {
        lastUiSync = now
        syncSnapshot()
      }

      frame = window.requestAnimationFrame(loop)
    }

    frame = window.requestAnimationFrame(loop)
    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [])

  const onPointerLockChange = useEffectEvent(() => {
    setPointerLocked(runtimeRef.current, document.pointerLockElement === canvasRef.current)
    syncSnapshot()
  })

  useEffect(() => {
    document.addEventListener('pointerlockchange', onPointerLockChange)
    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange)
    }
  }, [])

  const onLockedMouseMove = useEffectEvent((event: MouseEvent) => {
    if (document.pointerLockElement !== canvasRef.current) {
      return
    }

    updateAimFromDelta(runtimeRef.current, event.movementX, event.movementY)
  })

  useEffect(() => {
    document.addEventListener('mousemove', onLockedMouseMove)
    return () => {
      document.removeEventListener('mousemove', onLockedMouseMove)
    }
  }, [])

  const updateSettings = (updater: (current: GameSettings) => GameSettings) => {
    setSettings((current) => {
      const next = withDerivedMode(updater(current))
      applySettings(runtimeRef.current, next)
      return next
    })
  }

  const ensureAudio = () => {
    audioRef.current ??= createAudioBus()
    return audioRef.current
  }

  const beginSession = (nextSettings?: GameSettings) => {
    const appliedSettings = withDerivedMode(nextSettings ?? settings)
    if (nextSettings) {
      setSettings(appliedSettings)
      applySettings(runtimeRef.current, appliedSettings)
    }
    startSession(runtimeRef.current, performance.now())
    runtimeRef.current.currentMessage = {
      title: 'Session Started',
      detail: `Session live. Complete ${appliedSettings.sessionLength} reps for a full summary.`,
      tone: 'neutral',
    }
    lastProgressSnapshotRef.current = getSnapshot(runtimeRef.current)
    syncSnapshot()
  }

  const returnToMenu = () => {
    if (document.pointerLockElement === canvasRef.current) {
      void document.exitPointerLock()
    }
    resetToMenu(runtimeRef.current)
    lastProgressSnapshotRef.current = getSnapshot(runtimeRef.current)
    syncSnapshot()
  }

  const advanceRep = () => {
    skipToNextRep(runtimeRef.current, performance.now())
    lastProgressSnapshotRef.current = getSnapshot(runtimeRef.current)
    syncSnapshot()
  }

  const restartSession = () => {
    beginSession()
  }

  const applyAuthUpdate = (nextState: AuthState, message: string | null) => {
    const nextProfile = getProgressionProfile(nextState)
    setAuthState(nextState)
    setAccountSession(
      runtimeRef.current,
      nextProfile.displayName,
      nextProfile.xp,
    )
    setAuthMessage(message)
    syncSnapshot()
  }

  const login = (name: string, password: string) => {
    const result = loginAccount(authState, name, password)
    applyAuthUpdate(result.state, result.message)
  }

  const register = (name: string, password: string) => {
    const result = registerAccount(authState, name, password)
    applyAuthUpdate(result.state, result.message)
  }

  const logout = () => {
    applyAuthUpdate(logoutAccount(authState), 'Logged out. Progress stays on this browser.')
  }

  interface AdminMutation {
    message: string
    tone?: 'good' | 'warn'
    auditAction: string
    auditDetail?: string
    authState?: AuthState
    feedbackState?: FeedbackState
    adminState?: AdminState
    settings?: GameSettings
    history?: typeof loadedState.history
    lifetime?: typeof loadedState.lifetime
  }

  const persistRuntimeState = (nextSettings: GameSettings) => {
    savePersistentState({
      settings: withDerivedMode(nextSettings),
      history: runtimeRef.current.history,
      lifetime: runtimeRef.current.lifetime,
    })
  }

  const ensureAllowedSettings = (
    currentSettings: GameSettings,
    nextAdminState: AdminState,
  ) => {
    const availablePeeks = getAvailableModeSelections(nextAdminState)
    const availableWeapons = getAvailableWeaponSelections(nextAdminState)

    return withDerivedMode({
      ...currentSettings,
      selectedPeek:
        availablePeeks.includes(currentSettings.selectedPeek)
          ? currentSettings.selectedPeek
          : availablePeeks[0] ?? 'cross',
      weapon: availableWeapons.includes(currentSettings.weapon)
        ? currentSettings.weapon
        : availableWeapons[0] ?? 'awp',
    })
  }

  const applyAdminMutation = (mutation: AdminMutation) => {
    if (!isAdmin) {
      setAdminStatus({
        tone: 'warn',
        message: 'Admin access denied. Jonsman must be logged in.',
      })
      return false
    }

    let nextAdminState = mutation.adminState ?? adminState
    nextAdminState = appendAuditEntry(
      normalizeAdminState(nextAdminState),
      ADMIN_USERNAME,
      mutation.auditAction,
      mutation.auditDetail ?? mutation.message,
    )
    const nextAuthState = mutation.authState ?? authState
    const nextFeedbackState = mutation.feedbackState ?? feedbackState
    setAdminRuntimeState(nextAdminState)
    setAdminState(nextAdminState)

    if (mutation.authState) {
      setAuthState(nextAuthState)
    }

    if (mutation.feedbackState) {
      setFeedbackState(nextFeedbackState)
    }

    if (mutation.history) {
      runtimeRef.current.history = mutation.history
    }

    if (mutation.lifetime) {
      runtimeRef.current.lifetime = mutation.lifetime
    }

    const nextSettings = ensureAllowedSettings(
      mutation.settings ?? settings,
      nextAdminState,
    )
    const settingsChanged =
      mutation.settings !== undefined ||
      nextSettings.selectedPeek !== settings.selectedPeek ||
      nextSettings.weapon !== settings.weapon

    if (settingsChanged) {
      setSettings(nextSettings)
      applySettings(runtimeRef.current, nextSettings)
    }

    if (mutation.history || mutation.lifetime || settingsChanged) {
      runtimeRef.current.persistenceVersion += 1
      persistRuntimeState(nextSettings)
    }

    setAdminStatus({
      tone: mutation.tone ?? 'good',
      message: mutation.message,
    })
    syncSnapshot()
    return true
  }

  const runUserAdminAction = (action: { type: string; [key: string]: unknown }) => {
    const userName = `${action.userName ?? ''}`.trim()
    const accountIndex = userName ? findAccountIndexByName(authState.accounts, userName) : -1
    const account = accountIndex >= 0 ? authState.accounts[accountIndex] : null

    switch (action.type) {
      case 'rename': {
        if (!account) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'User not found.',
            auditAction: 'User rename failed',
          })
        }

        const nextName = `${action.value ?? ''}`.trim()
        if (!nextName) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Enter a new username first.',
            auditAction: 'User rename failed',
          })
        }

        const duplicateIndex = findAccountIndexByName(authState.accounts, nextName)
        if (duplicateIndex >= 0 && duplicateIndex !== accountIndex) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'That username is already taken.',
            auditAction: 'User rename failed',
          })
        }

        const nextAccounts = [...authState.accounts]
        nextAccounts[accountIndex] = {
          ...account,
          name: nextName,
        }
        const nextAuthState: AuthState = {
          ...authState,
          accounts: nextAccounts,
          activeUserName:
            authState.activeUserName === account.name ? nextName : authState.activeUserName,
        }
        const nextFeedbackState: FeedbackState = {
          ...feedbackState,
          posts: feedbackState.posts.map((post) =>
            post.accountName === account.name
              ? {
                  ...post,
                  accountName: nextName,
                  authorName: nextName,
                }
              : post,
          ),
        }
        return applyAdminMutation({
          message: `${account.name} renamed to ${nextName}.`,
          auditAction: 'Renamed user',
          auditDetail: `${account.name} -> ${nextName}`,
          authState: nextAuthState,
          feedbackState: nextFeedbackState,
        })
      }
      case 'force-rename': {
        return runUserAdminAction({
          type: 'rename',
          userName,
          value: createForcedRename(),
        })
      }
      case 'reset-xp':
      case 'add-xp':
      case 'remove-xp':
      case 'set-level': {
        if (!account) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'User not found.',
            auditAction: 'XP action failed',
          })
        }

        const nextAccounts = [...authState.accounts]
        let nextXp = account.xp

        if (action.type === 'reset-xp') {
          nextXp = 0
        } else if (action.type === 'set-level') {
          nextXp = getLevelStartXp(Math.max(1, Number(action.value) || 1))
        } else if (action.type === 'add-xp') {
          nextXp += Math.max(0, Number(action.value) || 0)
        } else {
          nextXp = Math.max(0, nextXp - Math.max(0, Number(action.value) || 0))
        }

        nextAccounts[accountIndex] = {
          ...account,
          xp: nextXp,
        }

        return applyAdminMutation({
          message: `${account.name} now has ${nextXp.toLocaleString()} XP.`,
          auditAction: 'Adjusted user XP',
          auditDetail: `${account.name} -> ${nextXp} XP`,
          authState: {
            ...authState,
            accounts: nextAccounts,
          },
        })
      }
      case 'reset-stats': {
        if (!account) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'User not found.',
            auditAction: 'Reset user stats failed',
          })
        }

        const nextAccounts = [...authState.accounts]
        nextAccounts[accountIndex] = {
          ...account,
          stats: createEmptyAccountStats(),
        }

        return applyAdminMutation({
          message: `${account.name}'s stats were reset.`,
          auditAction: 'Reset user stats',
          authState: {
            ...authState,
            accounts: nextAccounts,
          },
        })
      }
      case 'suspend':
      case 'ban': {
        if (!account) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'User not found.',
            auditAction: 'User toggle failed',
          })
        }

        const nextAccounts = [...authState.accounts]
        nextAccounts[accountIndex] = {
          ...account,
          suspended:
            action.type === 'suspend' ? Boolean(action.value) : account.suspended,
          banned: action.type === 'ban' ? Boolean(action.value) : account.banned,
        }

        return applyAdminMutation({
          message: `${account.name} updated.`,
          auditAction: 'Updated user flags',
          auditDetail: `${account.name} / ${action.type}`,
          authState: {
            ...authState,
            accounts: nextAccounts,
          },
        })
      }
      case 'add-note': {
        if (!account) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'User not found.',
            auditAction: 'Add admin note failed',
          })
        }

        const note = `${action.value ?? ''}`.trim()
        if (!note) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Write a note first.',
            auditAction: 'Add admin note failed',
          })
        }

        const nextAccounts = [...authState.accounts]
        nextAccounts[accountIndex] = {
          ...account,
          adminNotes: [note, ...account.adminNotes].slice(0, 16),
        }

        return applyAdminMutation({
          message: `Admin note saved for ${account.name}.`,
          auditAction: 'Added admin note',
          auditDetail: account.name,
          authState: {
            ...authState,
            accounts: nextAccounts,
          },
        })
      }
      case 'set-rate-limit': {
        if (!account) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'User not found.',
            auditAction: 'User moderation update failed',
          })
        }

        const nextAccounts = [...authState.accounts]
        nextAccounts[accountIndex] = {
          ...account,
          strictFeedbackCooldownMinutes:
            Math.max(0, Number(action.value) || 0) || null,
        }

        return applyAdminMutation({
          message: `${account.name} moderation settings updated.`,
          auditAction: 'Updated user moderation settings',
          auditDetail: `${account.name} / ${action.type}`,
          authState: {
            ...authState,
            accounts: nextAccounts,
          },
        })
      }
      case 'delete-account': {
        if (!account) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'User not found.',
            auditAction: 'Delete user failed',
          })
        }

        const nextAuthState: AuthState = {
          ...authState,
          accounts: authState.accounts.filter((candidate) => candidate.name !== account.name),
          activeUserName:
            authState.activeUserName === account.name ? null : authState.activeUserName,
        }
        const nextFeedbackState: FeedbackState = {
          ...feedbackState,
          posts: feedbackState.posts.map((post) =>
            post.accountName === account.name
              ? {
                  ...post,
                  accountName: null,
                  authorName: 'Deleted User',
                }
              : post,
          ),
        }

        return applyAdminMutation({
          message: `${account.name} was deleted.`,
          auditAction: 'Deleted user account',
          auditDetail: account.name,
          authState: nextAuthState,
          feedbackState: nextFeedbackState,
        })
      }
      case 'rename-anonymous': {
        const alias = `${action.value ?? ''}`.trim() || null
        return applyAdminMutation({
          message: alias
            ? `Anonymous profile renamed to ${alias}.`
            : 'Anonymous profile name reset.',
          auditAction: 'Updated anonymous alias',
          authState: {
            ...authState,
            anonymousProfile: {
              ...authState.anonymousProfile,
              alias,
            },
          },
        })
      }
      case 'merge-anonymous': {
        if (!account) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Target account not found.',
            auditAction: 'Merge anonymous failed',
          })
        }

        if (!hasMeaningfulStats(authState.anonymousProfile.stats) && authState.anonymousProfile.xp <= 0) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'No anonymous progression is available to merge.',
            auditAction: 'Merge anonymous failed',
          })
        }

        const nextAccounts = [...authState.accounts]
        nextAccounts[accountIndex] = {
          ...account,
          xp: account.xp + authState.anonymousProfile.xp,
          stats: mergeStats(account.stats, authState.anonymousProfile.stats),
        }

        return applyAdminMutation({
          message: `Anonymous progression merged into ${account.name}.`,
          auditAction: 'Merged anonymous progression',
          auditDetail: account.name,
          authState: {
            ...authState,
            accounts: nextAccounts,
            anonymousProfile: createEmptyAnonymousProfile(),
          },
        })
      }
      default:
        return applyAdminMutation({
          tone: 'warn',
          message: 'Unknown user admin action.',
          auditAction: 'Unknown user admin action',
        })
    }
  }

  const runProgressionAdminAction = (action: { type: string; [key: string]: unknown }) => {
    switch (action.type) {
      case 'set-xp-config':
        return applyAdminMutation({
          message: 'XP progression config updated.',
          auditAction: 'Updated XP configuration',
          adminState: {
            ...adminState,
            xpMultiplier:
              action.xpMultiplier === undefined
                ? adminState.xpMultiplier
                : Math.max(0.25, Number(action.xpMultiplier) || adminState.xpMultiplier),
            maxXpPerShot:
              action.maxXpPerShot === undefined
                ? adminState.maxXpPerShot
                : Math.max(50, Number(action.maxXpPerShot) || adminState.maxXpPerShot),
            levelBaseXp:
              action.levelBaseXp === undefined
                ? adminState.levelBaseXp
                : Math.max(500, Number(action.levelBaseXp) || adminState.levelBaseXp),
            levelStepXp:
              action.levelStepXp === undefined
                ? adminState.levelStepXp
                : Math.max(0, Number(action.levelStepXp) || adminState.levelStepXp),
            bonusXpEventMultiplier:
              action.bonusXpEventMultiplier === undefined
                ? adminState.bonusXpEventMultiplier
                : Math.max(
                    0.25,
                    Number(action.bonusXpEventMultiplier) || adminState.bonusXpEventMultiplier,
                  ),
          },
        })
      case 'set-mode-xp-bonus': {
        const peek = `${action.peek ?? ''}` as PeekSelection
        if (!PEEK_SELECTIONS.includes(peek)) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Mode not found.',
            auditAction: 'Set mode XP bonus failed',
          })
        }

        return applyAdminMutation({
          message: `${peek} XP bonus updated.`,
          auditAction: 'Updated mode XP bonus',
          adminState: {
            ...adminState,
            modeXpBonuses: {
              ...adminState.modeXpBonuses,
              [peek]: Math.max(0.25, Number(action.value) || 1),
            },
          },
        })
      }
      case 'set-weapon-xp-bonus': {
        const weapon = `${action.weapon ?? ''}` as WeaponMode
        if (!WEAPON_SELECTIONS.includes(weapon)) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Weapon not found.',
            auditAction: 'Set weapon XP bonus failed',
          })
        }

        return applyAdminMutation({
          message: `${weapon.toUpperCase()} XP bonus updated.`,
          auditAction: 'Updated weapon XP bonus',
          adminState: {
            ...adminState,
            weaponXpBonuses: {
              ...adminState.weaponXpBonuses,
              [weapon]: Math.max(0.25, Number(action.value) || 1),
            },
          },
        })
      }
      case 'grant-global-xp': {
        const amount = Math.max(0, Number(action.value) || 0)
        const nextAuthState: AuthState = {
          ...authState,
          accounts: authState.accounts.map((account) => ({
            ...account,
            xp: account.xp + amount,
          })),
          anonymousProfile: {
            ...authState.anonymousProfile,
            xp: authState.anonymousProfile.xp + amount,
          },
        }

        return applyAdminMutation({
          message: `${amount.toLocaleString()} XP granted to all real players.`,
          auditAction: 'Granted global XP',
          authState: nextAuthState,
        })
      }
      case 'reset-all-progression': {
        const nextAuthState: AuthState = {
          ...authState,
          accounts: authState.accounts.map((account) => ({
            ...account,
            xp: 0,
            stats: createEmptyAccountStats(),
          })),
          anonymousProfile: {
            ...authState.anonymousProfile,
            xp: 0,
            stats: createEmptyAccountStats(),
          },
        }

        return applyAdminMutation({
          message: 'All progression was reset.',
          auditAction: 'Reset all progression',
          authState: nextAuthState,
        })
      }
      case 'reset-reaction-stats': {
        const nextAuthState: AuthState = {
          ...authState,
          accounts: authState.accounts.map((account) => ({
            ...account,
            stats: clearReactionStats(account.stats),
          })),
          anonymousProfile: {
            ...authState.anonymousProfile,
            stats: clearReactionStats(authState.anonymousProfile.stats),
          },
        }

        return applyAdminMutation({
          message: 'Reaction-time stats were reset.',
          auditAction: 'Reset reaction stats',
          authState: nextAuthState,
        })
      }
      default:
        return applyAdminMutation({
          tone: 'warn',
          message: 'Unknown progression admin action.',
          auditAction: 'Unknown progression admin action',
        })
    }
  }

  const runModeAdminAction = (action: { type: string; [key: string]: unknown }) => {
    switch (action.type) {
      case 'update-mode': {
        const peek = `${action.peek ?? ''}` as PeekSelection
        if (!PEEK_SELECTIONS.includes(peek)) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Mode not found.',
            auditAction: 'Update mode failed',
          })
        }

        return applyAdminMutation({
          message: `${peek} updated.`,
          auditAction: 'Updated mode config',
          adminState: {
            ...adminState,
            modeConfigs: {
              ...adminState.modeConfigs,
              [peek]: {
                ...adminState.modeConfigs[peek],
                enabled:
                  action.enabled === undefined
                    ? adminState.modeConfigs[peek].enabled
                    : Boolean(action.enabled),
                popular:
                  action.popular === undefined
                    ? adminState.modeConfigs[peek].popular
                    : Boolean(action.popular),
                highlightColor:
                  action.highlightColor === undefined
                    ? adminState.modeConfigs[peek].highlightColor
                    : `${action.highlightColor ?? ''}`.trim() ||
                      adminState.modeConfigs[peek].highlightColor,
                description:
                  action.description === undefined
                    ? adminState.modeConfigs[peek].description
                    : `${action.description ?? ''}`.trim() ||
                      adminState.modeConfigs[peek].description,
                previewVariant:
                  action.previewVariant === undefined
                    ? adminState.modeConfigs[peek].previewVariant
                    : action.previewVariant === 'scan' ||
                        action.previewVariant === 'ghost' ||
                        action.previewVariant === 'warm' ||
                        action.previewVariant === 'blueprint'
                      ? action.previewVariant
                      : 'default',
                difficultyMultiplier:
                  action.difficultyMultiplier === undefined
                    ? adminState.modeConfigs[peek].difficultyMultiplier
                    : Math.max(
                        0.45,
                        Number(action.difficultyMultiplier) ||
                          adminState.modeConfigs[peek].difficultyMultiplier,
                      ),
                experimental:
                  action.experimental === undefined
                    ? adminState.modeConfigs[peek].experimental
                    : Boolean(action.experimental),
                order:
                  action.order === undefined
                    ? adminState.modeConfigs[peek].order
                    : Number(action.order) || adminState.modeConfigs[peek].order,
              },
            },
          },
        })
      }
      case 'move-mode': {
        const peek = `${action.peek ?? ''}` as PeekSelection
        if (!PEEK_SELECTIONS.includes(peek)) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Mode not found.',
            auditAction: 'Move mode failed',
          })
        }

        const direction = action.value === 'up' ? -1 : 1
        const ordered = [...PEEK_SELECTIONS].sort(
          (left, right) => adminState.modeConfigs[left].order - adminState.modeConfigs[right].order,
        )
        const index = ordered.indexOf(peek)
        const targetIndex = Math.min(Math.max(index + direction, 0), ordered.length - 1)
        const swapPeek = ordered[targetIndex]
        if (!swapPeek || swapPeek === peek) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Mode is already at the edge of the list.',
            auditAction: 'Move mode ignored',
          })
        }

        const nextModeConfigs = {
          ...adminState.modeConfigs,
          [peek]: {
            ...adminState.modeConfigs[peek],
            order: adminState.modeConfigs[swapPeek].order,
          },
          [swapPeek]: {
            ...adminState.modeConfigs[swapPeek],
            order: adminState.modeConfigs[peek].order,
          },
        }

        return applyAdminMutation({
          message: `${peek} moved ${direction < 0 ? 'up' : 'down'}.`,
          auditAction: 'Reordered modes',
          adminState: {
            ...adminState,
            modeConfigs: nextModeConfigs,
          },
        })
      }
      case 'create-shell': {
        const label = `${action.label ?? ''}`.trim()
        if (!label) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Mode shell label is required.',
            auditAction: 'Create mode shell failed',
          })
        }

        return applyAdminMutation({
          message: `${label} shell created.`,
          auditAction: 'Created mode shell',
          adminState: {
            ...adminState,
            modeShells: [
              {
                id: `shell-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                label,
                description:
                  `${action.description ?? ''}`.trim() || 'Experimental mode shell.',
                previewVariant:
                  action.previewVariant === 'scan' ||
                  action.previewVariant === 'ghost' ||
                  action.previewVariant === 'warm' ||
                  action.previewVariant === 'blueprint'
                    ? action.previewVariant
                    : 'default',
                enabled: true,
              },
              ...adminState.modeShells,
            ],
          },
        })
      }
      case 'remove-shell':
        return applyAdminMutation({
          message: 'Mode shell removed.',
          auditAction: 'Removed mode shell',
          adminState: {
            ...adminState,
            modeShells: adminState.modeShells.filter(
              (shell) => shell.id !== `${action.id ?? ''}`,
            ),
          },
        })
      case 'set-global-delays':
        return applyAdminMutation({
          message: 'Global peek delays updated.',
          auditAction: 'Updated global peek delays',
          adminState: {
            ...adminState,
            globalPeekDelayMinMs: Math.max(250, Number(action.min) || adminState.globalPeekDelayMinMs),
            globalPeekDelayMaxMs: Math.max(
              Math.max(250, Number(action.min) || adminState.globalPeekDelayMinMs),
              Number(action.max) || adminState.globalPeekDelayMaxMs,
            ),
          },
        })
      case 'set-speed-multiplier': {
        const speed = `${action.speed ?? ''}` as keyof AdminState['speedConfigs']
        if (!(speed in adminState.speedConfigs)) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Speed preset not found.',
            auditAction: 'Set speed multiplier failed',
          })
        }

        return applyAdminMutation({
          message: `${speed} multiplier updated.`,
          auditAction: 'Updated speed multiplier',
          adminState: {
            ...adminState,
            speedConfigs: {
              ...adminState.speedConfigs,
              [speed]: {
                ...adminState.speedConfigs[speed],
                multiplier: Math.max(0.5, Number(action.value) || 1),
              },
            },
          },
        })
      }
      case 'set-weapon-cooldown':
      case 'set-weapon-enabled': {
        const weapon = `${action.weapon ?? ''}` as WeaponMode
        if (!WEAPON_SELECTIONS.includes(weapon)) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Weapon not found.',
            auditAction: 'Weapon admin update failed',
          })
        }

        return applyAdminMutation({
          message: `${weapon.toUpperCase()} admin settings updated.`,
          auditAction: 'Updated weapon admin config',
          adminState: {
            ...adminState,
            weaponConfigs: {
              ...adminState.weaponConfigs,
              [weapon]: {
                ...adminState.weaponConfigs[weapon],
                cooldownMs:
                  action.type === 'set-weapon-cooldown'
                    ? Math.max(40, Number(action.value) || adminState.weaponConfigs[weapon].cooldownMs)
                    : adminState.weaponConfigs[weapon].cooldownMs,
                enabled:
                  action.type === 'set-weapon-enabled'
                    ? Boolean(action.value)
                    : adminState.weaponConfigs[weapon].enabled,
              },
            },
          },
        })
      }
      case 'set-default-wallhack':
      case 'set-default-quality':
      case 'set-experimental-modes':
      case 'set-round-start-limits':
        return applyAdminMutation({
          message: 'Gameplay defaults updated.',
          auditAction: 'Updated gameplay defaults',
          adminState: {
            ...adminState,
            defaultWallhackEnabled:
              action.type === 'set-default-wallhack'
                ? Boolean(action.value)
                : adminState.defaultWallhackEnabled,
            defaultQualityPreset:
              action.type === 'set-default-quality'
                ? (`${action.value ?? adminState.defaultQualityPreset}` as GameSettings['graphicsQuality'])
                : adminState.defaultQualityPreset,
            experimentalModesEnabled:
              action.type === 'set-experimental-modes'
                ? Boolean(action.value)
                : adminState.experimentalModesEnabled,
            roundStartMinEnemies:
              action.type === 'set-round-start-limits'
                ? Math.max(1, Number(action.min) || adminState.roundStartMinEnemies)
                : adminState.roundStartMinEnemies,
            roundStartMaxEnemies:
              action.type === 'set-round-start-limits'
                ? Math.max(
                    Math.max(1, Number(action.min) || adminState.roundStartMinEnemies),
                    Number(action.max) || adminState.roundStartMaxEnemies,
                  )
                : adminState.roundStartMaxEnemies,
          },
        })
      default:
        return applyAdminMutation({
          tone: 'warn',
          message: 'Unknown mode admin action.',
          auditAction: 'Unknown mode admin action',
        })
    }
  }

  const runVisualAdminAction = (action: { type: string; [key: string]: unknown }) => {
    switch (action.type) {
      case 'set-banner':
      case 'set-featured-message':
      case 'set-button-accent':
      case 'set-made-by-style':
      case 'toggle-jonsman-theme':
      case 'toggle-special-highlights':
      case 'set-seasonal-theme':
      case 'set-fake-announcement':
      case 'set-rainbow-mode':
      case 'set-upside-down-preview':
      case 'toggle-confetti':
      case 'set-goofy-event':
      case 'set-fake-challenge':
      case 'set-footer-troll':
      case 'toggle-jonsman-was-here':
        return applyAdminMutation({
          message: 'Visual admin settings updated.',
          auditAction: 'Updated visual admin settings',
          adminState: {
            ...adminState,
            announcementBannerText:
              action.type === 'set-banner'
                ? `${action.value ?? ''}`
                : adminState.announcementBannerText,
            featuredMessage:
              action.type === 'set-featured-message'
                ? `${action.value ?? ''}`
                : adminState.featuredMessage,
            buttonAccentColor:
              action.type === 'set-button-accent'
                ? `${action.value ?? adminState.buttonAccentColor}`
                : adminState.buttonAccentColor,
            madeByJonsmanStyle:
              action.type === 'set-made-by-style'
                ? (`${action.value ?? adminState.madeByJonsmanStyle}` as AdminState['madeByJonsmanStyle'])
                : adminState.madeByJonsmanStyle,
            jonsmanThemeEnabled:
              action.type === 'toggle-jonsman-theme'
                ? Boolean(action.value)
                : adminState.jonsmanThemeEnabled,
            specialUiHighlights:
              action.type === 'toggle-special-highlights'
                ? Boolean(action.value)
                : adminState.specialUiHighlights,
            seasonalTheme:
              action.type === 'set-seasonal-theme'
                ? (`${action.value ?? adminState.seasonalTheme}` as AdminState['seasonalTheme'])
                : adminState.seasonalTheme,
            fakeAnnouncementEnabled:
              action.type === 'set-fake-announcement'
                ? Boolean(action.enabled)
                : adminState.fakeAnnouncementEnabled,
            fakeAnnouncementText:
              action.type === 'set-fake-announcement'
                ? `${action.value ?? adminState.fakeAnnouncementText}`
                : adminState.fakeAnnouncementText,
            rainbowModeId:
              action.type === 'set-rainbow-mode'
                ? ((action.value as PeekSelection | null) ?? null)
                : adminState.rainbowModeId,
            upsideDownPreviewId:
              action.type === 'set-upside-down-preview'
                ? ((action.value as PeekSelection | null) ?? null)
                : adminState.upsideDownPreviewId,
            confettiEnabled:
              action.type === 'toggle-confetti'
                ? Boolean(action.value)
                : adminState.confettiEnabled,
            goofyEventTitle:
              action.type === 'set-goofy-event'
                ? `${action.value ?? ''}`
                : adminState.goofyEventTitle,
            fakeGlobalChallenge:
              action.type === 'set-fake-challenge'
                ? `${action.value ?? ''}`
                : adminState.fakeGlobalChallenge,
            footerTrollText:
              action.type === 'set-footer-troll'
                ? `${action.value ?? ''}`
                : adminState.footerTrollText,
            jonsmanWasHereEnabled:
              action.type === 'toggle-jonsman-was-here'
                ? Boolean(action.value)
                : adminState.jonsmanWasHereEnabled,
          },
        })
      case 'add-notice': {
        const text = `${action.value ?? ''}`.trim()
        if (!text) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Notice text is required.',
            auditAction: 'Add notice failed',
          })
        }

        return applyAdminMutation({
          message: 'Homepage notice added.',
          auditAction: 'Added homepage notice',
          adminState: {
            ...adminState,
            homepageNotices: [
              {
                id: `notice-${Date.now()}`,
                text,
                tone: (action.tone as HomepageNotice['tone']) ?? 'neutral',
                active: true,
              },
              ...adminState.homepageNotices,
            ],
          },
        })
      }
      case 'remove-notice':
      case 'toggle-notice':
        return applyAdminMutation({
          message:
            action.type === 'remove-notice'
              ? 'Homepage notice removed.'
              : 'Homepage notice toggled.',
          auditAction:
            action.type === 'remove-notice'
              ? 'Removed homepage notice'
              : 'Toggled homepage notice',
          adminState: {
            ...adminState,
            homepageNotices:
              action.type === 'remove-notice'
                ? adminState.homepageNotices.filter(
                    (notice) => notice.id !== `${action.id ?? ''}`,
                  )
                : adminState.homepageNotices.map((notice) =>
                    notice.id === `${action.id ?? ''}`
                      ? { ...notice, active: !notice.active }
                      : notice,
                  ),
          },
        })
      default:
        return applyAdminMutation({
          tone: 'warn',
          message: 'Unknown visual admin action.',
          auditAction: 'Unknown visual admin action',
        })
    }
  }

  const runReportAdminAction = (action: { type: string; [key: string]: unknown }) => {
    if (action.type === 'set-blocked-words') {
      const blockedWords = `${action.value ?? ''}`
        .split(/[\n,]+/)
        .map((word) => word.trim().toLowerCase())
        .filter((word, index, list) => word.length > 0 && list.indexOf(word) === index)

      return applyAdminMutation({
        message: 'Blocked words updated.',
        auditAction: 'Updated blocked words',
        adminState: {
          ...adminState,
          blockedWords,
        },
      })
    }

    if (action.type === 'toggle-spam-protection') {
      return applyAdminMutation({
        message: `Spam protection ${action.value ? 'enabled' : 'disabled'}.`,
        auditAction: 'Updated spam protection',
        adminState: {
          ...adminState,
          spamProtectionEnabled: Boolean(action.value),
        },
      })
    }

    const postId = `${action.postId ?? ''}`.trim()
    if (!postId) {
      return applyAdminMutation({
        tone: 'warn',
        message: 'Select a report first.',
        auditAction: 'Report moderation failed',
      })
    }

    switch (action.type) {
      case 'delete':
        return applyAdminMutation({
          message: 'Post deleted.',
          auditAction: 'Deleted feedback post',
          feedbackState: {
            ...feedbackState,
            posts: feedbackState.posts.filter((post) => post.id !== postId),
          },
        })
      case 'pin':
      case 'set-status':
        return applyAdminMutation({
          message: 'Feedback post updated.',
          auditAction: 'Updated feedback post',
          feedbackState: {
            ...feedbackState,
            posts: feedbackState.posts.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    pinned:
                      action.type === 'pin' ? Boolean(action.value) : post.pinned,
                    status:
                      action.type === 'set-status'
                        ? (action.value as FeedbackPost['status'])
                        : post.status,
                  }
                : post,
            ),
          },
        })
      default:
        return applyAdminMutation({
          tone: 'warn',
          message: 'Unknown report admin action.',
          auditAction: 'Unknown report admin action',
        })
    }
  }

  const runEventAdminAction = (action: { type: string; [key: string]: unknown }) => {
    switch (action.type) {
      case 'add-announcement': {
        const text = `${action.value ?? ''}`.trim()
        if (!text) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Announcement text is required.',
            auditAction: 'Add announcement failed',
          })
        }

        const expiresHours = Math.max(0, Number(action.expiresHours) || 0)
        return applyAdminMutation({
          message: 'Announcement created.',
          auditAction: 'Created announcement',
          adminState: {
            ...adminState,
            temporaryAnnouncements: [
              {
                id: `announcement-${Date.now()}`,
                text,
                tone: (action.tone as HomepageNotice['tone']) ?? 'neutral',
                active: true,
                expiresAt: expiresHours > 0 ? Date.now() + expiresHours * 60 * 60 * 1000 : null,
              },
              ...adminState.temporaryAnnouncements,
            ],
          },
        })
      }
      case 'remove-announcement':
      case 'toggle-announcement':
        return applyAdminMutation({
          message:
            action.type === 'remove-announcement'
              ? 'Announcement removed.'
              : 'Announcement updated.',
          auditAction:
            action.type === 'remove-announcement'
              ? 'Removed announcement'
              : 'Updated announcement',
          adminState: {
            ...adminState,
            temporaryAnnouncements:
              action.type === 'remove-announcement'
                ? adminState.temporaryAnnouncements.filter(
                    (announcement) => announcement.id !== `${action.id ?? ''}`,
                  )
                : adminState.temporaryAnnouncements.map((announcement) =>
                    announcement.id === `${action.id ?? ''}`
                      ? { ...announcement, active: !announcement.active }
                      : announcement,
                  ),
          },
        })
      case 'set-lobby-message':
      case 'set-featured-mode':
      case 'set-featured-weapon':
      case 'start-bonus-event':
      case 'stop-bonus-event':
        return applyAdminMutation({
          message: 'Event settings updated.',
          auditAction: 'Updated event settings',
          adminState: {
            ...adminState,
            lobbyMessage:
              action.type === 'set-lobby-message'
                ? `${action.value ?? ''}`
                : adminState.lobbyMessage,
            featuredMode:
              action.type === 'set-featured-mode'
                ? ((action.value as PeekSelection | null) ?? null)
                : adminState.featuredMode,
            featuredWeapon:
              action.type === 'set-featured-weapon'
                ? ((action.value as WeaponMode | null) ?? null)
                : adminState.featuredWeapon,
            bonusXpEventMultiplier:
              action.type === 'start-bonus-event'
                ? Math.max(1.1, Number(action.value) || 1.5)
                : action.type === 'stop-bonus-event'
                  ? 1
                  : adminState.bonusXpEventMultiplier,
          },
        })
      default:
        return applyAdminMutation({
          tone: 'warn',
          message: 'Unknown event admin action.',
          auditAction: 'Unknown event admin action',
        })
    }
  }

  const runSystemAdminAction = (action: { type: string; [key: string]: unknown }) => {
    switch (action.type) {
      case 'reset-site-settings': {
        const nextSettings = withDerivedMode({
          ...DEFAULT_SETTINGS,
          doorVisibilityAssist: adminState.defaultWallhackEnabled,
          graphicsQuality: adminState.defaultQualityPreset,
        })

        return applyAdminMutation({
          message: 'Site settings reset to admin defaults.',
          auditAction: 'Reset site settings',
          settings: nextSettings,
        })
      }
      case 'reset-site-config':
        return applyAdminMutation({
          message: 'Admin site config reset.',
          auditAction: 'Reset admin site config',
          adminState: createDefaultAdminState(),
        })
      case 'clear-cache': {
        const nextHistory: typeof loadedState.history = []
        const nextLifetime = createEmptyLifetimeStats()
        return applyAdminMutation({
          message: 'Cached local gameplay data cleared.',
          auditAction: 'Cleared cached local data',
          history: nextHistory,
          lifetime: nextLifetime,
        })
      }
      case 'force-save':
        persistRuntimeState(settings)
        saveAuthState(authState)
        saveFeedbackState(feedbackState)
        saveAdminState(adminState)
        setAdminStatus({
          tone: 'good',
          message: 'All admin-related data was force-saved.',
        })
        return true
      case 'import-config': {
        const json = `${action.value ?? ''}`.trim()
        if (!json) {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Paste a site config JSON payload first.',
            auditAction: 'Import config failed',
          })
        }

        try {
          const parsed = JSON.parse(json) as Partial<AdminState>
          return applyAdminMutation({
            message: 'Site config imported.',
            auditAction: 'Imported site config',
            adminState: normalizeAdminState(parsed),
          })
        } catch {
          return applyAdminMutation({
            tone: 'warn',
            message: 'Site config JSON could not be parsed.',
            auditAction: 'Import config failed',
          })
        }
      }
      default:
        return applyAdminMutation({
          tone: 'warn',
          message: 'Unknown system admin action.',
          auditAction: 'Unknown system admin action',
        })
    }
  }

  const submitBugReport = async (body: string) => {
    const result = submitFeedbackPost({
      feedbackState,
      authState,
      category: 'bug-report',
      body,
    })
    setFeedbackState(result.feedbackState)
    setAuthState(result.authState)
    setFeedbackStatus((current) => ({
      ...current,
      bugReport: {
        tone: result.ok ? 'good' : 'warn',
        message: result.message,
      },
    }))
    return result.ok
  }

  const submitFeatureRequest = async (body: string) => {
    const result = submitFeedbackPost({
      feedbackState,
      authState,
      category: 'feature-request',
      body,
    })
    setFeedbackState(result.feedbackState)
    setAuthState(result.authState)
    setFeedbackStatus((current) => ({
      ...current,
      featureRequest: {
        tone: result.ok ? 'good' : 'warn',
        message: result.message,
      },
    }))
    return result.ok
  }

  const submitReview = async (body: string) => {
    const result = submitFeedbackPost({
      feedbackState,
      authState,
      category: 'review',
      body,
    })
    setFeedbackState(result.feedbackState)
    setAuthState(result.authState)
    setFeedbackStatus((current) => ({
      ...current,
      review: {
        tone: result.ok ? 'good' : 'warn',
        message: result.message,
      },
    }))
    return result.ok
  }

  const onStageMouseMove = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (document.pointerLockElement === canvasRef.current) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1
    updateAimFromAbsolute(runtimeRef.current, normalizedX, normalizedY)
  }

  const onStageMouseDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()

    if (event.button === 2) {
      cycleScopeLevel(runtimeRef.current)
      syncSnapshot()
      return
    }

    if (event.button !== 0) {
      return
    }

    if (
      runtimeRef.current.phase !== 'menu' &&
      document.pointerLockElement !== canvasRef.current
    ) {
      void event.currentTarget.requestPointerLock()
    }

    const outcome = fireShot(runtimeRef.current, performance.now())
    if (!outcome.fired) {
      syncSnapshot()
      return
    }

    const volume = getAudioVolume(runtimeRef.current.settings)
    if (volume > 0) {
      const audio = ensureAudio()
      audio.fire(runtimeRef.current.settings.weapon, volume)
      if (outcome.hit) {
        audio.hit(outcome.headshot, outcome.wallbang, volume)
      } else {
        audio.miss(volume)
      }
    }

    syncSnapshot()
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) {
      return
    }

    if (
      event.code === UI_KEYBINDS.nextTry.code &&
      runtimeRef.current.phase === 'result'
    ) {
      event.preventDefault()
      advanceRep()
      return
    }

    if (
      event.code === UI_KEYBINDS.restartSession.code &&
      runtimeRef.current.phase !== 'menu'
    ) {
      event.preventDefault()
      restartSession()
      return
    }

    if (
      event.code === UI_KEYBINDS.backToMenu.code &&
      runtimeRef.current.phase !== 'menu'
    ) {
      event.preventDefault()
      returnToMenu()
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const availableModeSelections = getAvailableModeSelections(adminState)
  const modeOptions = availableModeSelections.map((peek) => ({
    id: peek,
    description: adminState.modeConfigs[peek].description,
    popular: adminState.modeConfigs[peek].popular,
    highlightColor: adminState.modeConfigs[peek].highlightColor,
    previewVariantClass: getModePreviewVariantClass(
      adminState,
      peek,
      adminState.modeConfigs[peek].previewVariant,
    ),
    featured: adminState.featuredMode === peek,
    experimental: adminState.modeConfigs[peek].experimental,
  }))
  const weaponOptions = getAvailableWeaponSelections(adminState).map((weapon) => ({
    id: weapon,
    featured: adminState.featuredWeapon === weapon || adminState.weaponConfigs[weapon].featured,
  }))
  const activeAnnouncements = getActiveAnnouncements(adminState)
  const activeHomepageNotices = getActiveHomepageNotices(adminState)
  const themeClasses = getThemeClassNames(adminState)
  const storageOverview = getSiteStorageOverview()
  const allStatsSources = [
    ...authState.accounts.map((account) => account.stats),
    ...(authState.anonymousProfile.xp > 0 || hasMeaningfulStats(authState.anonymousProfile.stats)
      ? [authState.anonymousProfile.stats]
      : []),
  ]
  const totalShots = allStatsSources.reduce((sum, stats) => sum + stats.shots, 0)
  const totalKills = allStatsSources.reduce((sum, stats) => sum + stats.kills, 0)
  const totalHeadshots = allStatsSources.reduce((sum, stats) => sum + stats.headshots, 0)
  const totalWallbangs = allStatsSources.reduce((sum, stats) => sum + stats.wallbangs, 0)
  const totalQualifyingMs = allStatsSources.reduce(
    (sum, stats) => sum + stats.qualifyingReactionMs,
    0,
  )
  const totalQualifyingCount = allStatsSources.reduce(
    (sum, stats) => sum + stats.qualifyingReactionCount,
    0,
  )
  const modeCounts = snapshot.history.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.mode] = (counts[entry.mode] ?? 0) + 1
    return counts
  }, {})
  const mostPlayedMode =
    Object.entries(modeCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'None yet'
  const mostUsedWeapon =
    Object.entries(snapshot.lifetime.weaponUsage).sort((left, right) => right[1] - left[1])[0]?.[0] ??
    'awp'
  const adminPanelData = isAdmin
    ? {
        status: adminStatus,
        adminState,
        accounts: authState.accounts,
        anonymousProfile: authState.anonymousProfile,
        reports: feedbackState.posts,
        history: snapshot.history,
        lifetime: snapshot.lifetime,
        storageOverview,
        exports: {
          siteConfig: JSON.stringify(adminState, null, 2),
          settings: JSON.stringify(settings, null, 2),
        },
        dashboard: {
          totalPlayers:
            authState.accounts.length +
            (authState.anonymousProfile.xp > 0 ||
            hasMeaningfulStats(authState.anonymousProfile.stats)
              ? 1
              : 0),
          totalRegisteredAccounts: authState.accounts.length,
          totalAnonymousPlayers:
            authState.anonymousProfile.xp > 0 ||
            hasMeaningfulStats(authState.anonymousProfile.stats)
              ? 1
              : 0,
          totalShots,
          totalKills,
          totalHeadshots,
          totalWallbangs,
          averageReactionMs:
            totalQualifyingCount > 0 ? totalQualifyingMs / totalQualifyingCount : null,
          mostUsedWeapon,
          mostPlayedMode,
          latestBugReports: feedbackState.posts
            .filter((post) => post.category === 'bug-report')
            .slice(0, 5),
          latestFeatureRequests: feedbackState.posts
            .filter((post) => post.category === 'feature-request')
            .slice(0, 5),
          siteActivitySummary: `${snapshot.history.length} local sessions, ${feedbackState.posts.length} total posts, browser-only save.`,
        },
        actions: {
          runUserAdminAction,
          runProgressionAdminAction,
          runModeAdminAction,
          runVisualAdminAction,
          runReportAdminAction,
          runEventAdminAction,
          runSystemAdminAction,
          clearStatus: () => setAdminStatus(null),
        },
      }
    : null

  return {
    canvasRef,
    settings,
    snapshot,
    authMessage,
    loggedInAccountName: progressionProfile.loggedInAccountName,
    isAdmin,
    adminBadgeVisible: adminState.adminBadgeVisible,
    adminPanel: adminPanelData,
    modeOptions,
    modeShells: adminState.modeShells,
    weaponOptions,
    announcements: activeAnnouncements,
    bannerText:
      adminState.fakeAnnouncementEnabled && adminState.fakeAnnouncementText.trim()
        ? adminState.fakeAnnouncementText
        : adminState.announcementBannerText,
    featuredMessage: adminState.featuredMessage,
    homepageNotices: activeHomepageNotices,
    lobbyMessage: adminState.lobbyMessage,
    specialTheme: {
      seasonalClass: themeClasses.seasonal,
      jonsmanThemeClass: themeClasses.jonsmanTheme,
      accentColor: adminState.buttonAccentColor,
      footerText: adminState.footerTrollText.trim() || 'Made by Jonsman',
      footerStyle: adminState.madeByJonsmanStyle,
      confettiEnabled: adminState.confettiEnabled,
      specialUiHighlights: adminState.specialUiHighlights,
      goofyEventTitle: adminState.goofyEventTitle,
      fakeGlobalChallenge: adminState.fakeGlobalChallenge,
      jonsmanWasHereEnabled: adminState.jonsmanWasHereEnabled,
    },
    feedbackPosts: feedbackState.posts,
    feedbackStatus,
    feedbackAccess: {
      isLoggedIn: activeAccount !== null,
      bugReportLastSubmittedAt: activeAccount?.cooldowns.bugReportAt ?? null,
      featureRequestLastSubmittedAt: activeAccount?.cooldowns.featureRequestAt ?? null,
    },
    updateSettings,
    beginSession,
    returnToMenu,
    advanceRep,
    onStageMouseMove,
    onStageMouseDown,
    login,
    register,
    logout,
    submitBugReport,
    submitFeatureRequest,
    submitReview,
  }
}
