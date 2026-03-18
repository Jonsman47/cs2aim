import './App.css'
import { HotkeyHint } from './components/HotkeyHint.tsx'
import { ShotFeedbackToast } from './components/ShotFeedbackToast.tsx'
import { Hud } from './components/Hud.tsx'
import { MainMenu } from './components/MainMenu.tsx'
import { RoundResult } from './components/RoundResult.tsx'
import { SessionSummary } from './components/SessionSummary.tsx'
import {
  MODE_LABELS,
  SCOPE_LEVEL_LABELS,
  UI_KEYBINDS,
  WEAPON_LABELS,
  formatBehaviorLabel,
  formatPeekSelectionLabel,
  withDerivedMode,
} from './game/constants.ts'
import { useReactionTrainer } from './game/useReactionTrainer.ts'
import type { GameSettings, PeekSelection, PeekSpeedId, WeaponMode } from './game/types.ts'

function App() {
  const {
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
  } = useReactionTrainer()

  const startWithSettings = (nextSettings?: GameSettings) => {
    beginSession(withDerivedMode(nextSettings ?? settings))
  }

  const applyPeekSelection = (selectedPeek: PeekSelection) => {
    updateSettings((current) =>
      withDerivedMode({
        ...current,
        selectedPeek,
      }),
    )
  }

  const applySpeedSelection = (selectedSpeed: PeekSpeedId) => {
    updateSettings((current) => ({
      ...current,
      selectedSpeed,
    }))
  }

  const applyWeaponSelection = (weapon: WeaponMode) => {
    updateSettings((current) => ({
      ...current,
      weapon,
    }))
  }

  const nextLabel =
    settings.selectedPeek === 'mixed'
      ? settings.mixedModeRandomness
        ? 'Next Random Peek'
        : 'Next Mixed Peek'
      : 'Repeat Same Peek'

  return (
    <div
      className={`app-shell ${settings.darkTheme ? 'theme-dark' : 'theme-light'} ${
        settings.rawMode ? 'raw-mode' : ''
      } ${snapshot.phase === 'menu' ? 'menu-open' : ''}`}
    >
      {!settings.rawMode && snapshot.phase !== 'menu' && (
        <aside className="sidebar">
          <Hud
            settings={settings}
            snapshot={snapshot}
            onStart={() => startWithSettings()}
            onReset={returnToMenu}
            onNext={advanceRep}
            nextLabel={nextLabel}
          />
        </aside>
      )}

      <main className="stage-shell">
        <div className="stage-frame">
          <canvas
            ref={canvasRef}
            className="game-canvas"
            onMouseMove={onStageMouseMove}
            onMouseDown={onStageMouseDown}
            onContextMenu={(event) => event.preventDefault()}
          />

          <div className="stage-header">
            <span>{MODE_LABELS[settings.mode]}</span>
            <span>
              {snapshot.currentBehavior
                ? formatBehaviorLabel(snapshot.currentBehavior, snapshot.currentSpeed)
                : formatPeekSelectionLabel(settings.selectedPeek, settings.selectedSpeed)}
            </span>
            <span>
              {WEAPON_LABELS[settings.weapon]} / {SCOPE_LEVEL_LABELS[snapshot.scopeLevel]}
            </span>
          </div>

          {snapshot.phase !== 'menu' && (
            <div className="stage-actions">
              <button className="ghost-button" onClick={returnToMenu}>
                Back To Menu <HotkeyHint label={UI_KEYBINDS.backToMenu.label} />
              </button>
            </div>
          )}

          {snapshot.currentMessage && snapshot.phase !== 'result' && (
            <div className={`practice-overlay tone-${snapshot.currentMessage.tone}`}>
              <strong>{snapshot.currentMessage.title}</strong>
              <span>{snapshot.currentMessage.detail}</span>
            </div>
          )}

          {snapshot.shotFeedback && <ShotFeedbackToast feedback={snapshot.shotFeedback} />}

          {snapshot.phase !== 'menu' && snapshot.phase !== 'result' && !snapshot.pointerLocked && (
            <div className="lock-notice">
              Click inside the viewport to lock aim. Right click cycles scope 1, scope 2, and
              unscoped. Press <kbd>Esc</kbd> to release the cursor.
            </div>
          )}

          {snapshot.phase === 'menu' && (
            <MainMenu
              settings={settings}
              lifetimeBest={snapshot.lifetime.allTimeBest}
              favoriteWeapon={snapshot.favoriteWeapon}
              averageShotTimeMs={snapshot.averageShotTimeMs}
              accountName={snapshot.accountName}
              xp={snapshot.xp}
              authMessage={authMessage}
              leaderboards={leaderboards}
              onSelectWeapon={applyWeaponSelection}
              onSelectPeek={applyPeekSelection}
              onSelectSpeed={applySpeedSelection}
              onSettingsChange={updateSettings}
              onStartSelected={() => startWithSettings()}
              onLogin={login}
              onRegister={register}
              onLogout={logout}
            />
          )}

          {snapshot.phase === 'summary' && snapshot.summary && (
            <SessionSummary
              summary={snapshot.summary}
              onRestart={() => startWithSettings()}
              onMenu={returnToMenu}
            />
          )}

          {snapshot.phase === 'result' && snapshot.lastResult && (
            <RoundResult
              result={snapshot.lastResult}
              nextLabel={nextLabel}
              showHitLabels={settings.showHitLabels}
              showScoringBreakdown={settings.showScoringBreakdown}
              onNext={advanceRep}
              onMenu={returnToMenu}
              onRestart={() => startWithSettings()}
            />
          )}

          {settings.rawMode && (
            <div className="raw-hud">
              <span>Last {snapshot.stats.lastSuccessful ? Math.round(snapshot.stats.lastSuccessful) : '--'} ms</span>
              <span>Best {snapshot.stats.best ? Math.round(snapshot.stats.best) : '--'} ms</span>
              <span>
                {snapshot.stats.hits}H / {snapshot.stats.misses}M / {snapshot.stats.failedReps}F
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
