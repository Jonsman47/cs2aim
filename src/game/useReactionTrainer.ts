import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createAudioBus } from './audio.ts'
import {
  LEADERBOARD_CATEGORIES,
  getActiveAccount,
  getLeaderboardEntries,
  loadAuthState,
  loginAccount,
  logoutAccount,
  registerAccount,
  saveAuthState,
  updateAccountProgress,
} from './auth.ts'
import { UI_KEYBINDS, withDerivedMode } from './constants.ts'
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
} from './engine.ts'
import { renderScene } from './renderer.ts'
import { loadPersistentState, savePersistentState } from './storage.ts'
import type { AuthState, GameSettings } from './types.ts'

const loadedState = loadPersistentState()
const loadedAuthState = loadAuthState()

const createInitialRuntime = () => {
  const runtime = createGameRuntime(
    withDerivedMode(loadedState.settings),
    loadedState.history,
    loadedState.lifetime,
  )
  const initialAccount = getActiveAccount(loadedAuthState)
  setAccountSession(
    runtime,
    initialAccount?.name ?? null,
    initialAccount?.xp ?? 0,
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
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState(() => getSnapshot(runtimeRef.current))
  const lastProgressSnapshotRef = useRef(getSnapshot(runtimeRef.current))

  const leaderboards = LEADERBOARD_CATEGORIES.map((category) => ({
    ...category,
    entries: getLeaderboardEntries(authState, category.id),
  }))

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
    const activeAccount = getActiveAccount(authState)
    setAccountSession(
      runtimeRef.current,
      activeAccount?.name ?? null,
      activeAccount?.xp ?? 0,
    )
    lastProgressSnapshotRef.current = getSnapshot(runtimeRef.current)
    syncSnapshot()
  }, [authState])

  useEffect(() => {
    const runtime = runtimeRef.current
    const currentSnapshot = getSnapshot(runtime)
    const previousSnapshot = lastProgressSnapshotRef.current
    lastProgressSnapshotRef.current = currentSnapshot

    if (!runtime.accountName) {
      return
    }

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
    const reactionTime =
      killsDelta > 0
        ? currentSnapshot.lastResult?.reactionTime ?? currentSnapshot.stats.lastSuccessful
        : null
    const score = killsDelta > 0 ? currentSnapshot.lastResult?.score ?? null : null

    setAuthState((current) =>
      updateAccountProgress(current, runtime.accountName, {
        xp: runtime.accountXp,
        shotsDelta,
        killsDelta,
        headshotsDelta,
        wallbangsDelta,
        reactionTime,
        score,
      }),
    )
  }, [snapshot.persistenceVersion])

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
    const activeAccount = getActiveAccount(nextState)
    setAuthState(nextState)
    setAccountSession(
      runtimeRef.current,
      activeAccount?.name ?? null,
      activeAccount?.xp ?? 0,
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
    applyAuthUpdate(logoutAccount(authState), 'Logged out. XP progression is paused.')
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

  return {
    canvasRef,
    settings,
    snapshot,
    authMessage,
    leaderboards,
    updateSettings,
    beginSession,
    returnToMenu,
    advanceRep,
    onStageMouseMove,
    onStageMouseDown,
    login,
    register,
    logout,
  }
}
