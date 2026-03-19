import { HotkeyHint } from './HotkeyHint.js'
import {
  MODE_LABELS,
  PEEK_SPEED_LABELS,
  SCOPE_LEVEL_LABELS,
  SESSION_TYPE_LABELS,
  UI_KEYBINDS,
  WEAPON_LABELS,
  formatBehaviorLabel,
  formatPeekSelectionLabel,
} from '../game/constants.js'
import type { GameSettings, GameSnapshot } from '../game/types.js'

interface HudProps {
  settings: GameSettings
  snapshot: GameSnapshot
  onStart: () => void
  onReset: () => void
  onNext: () => void
  nextLabel: string
}

const formatReaction = (value: number | null) =>
  value === null ? '--' : `${Math.round(value)} ms`

const formatLevelProgress = (xp: NonNullable<GameSnapshot['xp']>) =>
  `${xp.xpIntoLevel.toLocaleString()} XP / ${xp.xpNeededForNextLevel.toLocaleString()} XP`

export function Hud({
  settings,
  snapshot,
  onStart,
  onReset,
  onNext,
  nextLabel,
}: HudProps) {
  const lifetimeAverage =
    snapshot.lifetime.totalSuccesses > 0
      ? snapshot.lifetime.cumulativeReactionMs / snapshot.lifetime.totalSuccesses
      : null
  const summaryStats = [
    { label: 'Hits', value: `${snapshot.stats.hits}` },
    { label: 'Misses', value: `${snapshot.stats.misses}` },
    { label: 'Failed Reps', value: `${snapshot.stats.failedReps}` },
    { label: 'Accuracy', value: `${snapshot.stats.accuracy.toFixed(1)}%` },
    { label: 'Wallbangs', value: `${snapshot.stats.wallbangHits}` },
    { label: 'Headshots', value: `${snapshot.stats.headshots}` },
  ]

  return (
    <div className="hud-stack">
      <section className="panel controls-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Live Block</p>
            <h2>
              {formatPeekSelectionLabel(settings.selectedPeek, settings.selectedSpeed)} /{' '}
              {WEAPON_LABELS[settings.weapon]}
            </h2>
          </div>
          <span className={`status-pill phase-${snapshot.phase}`}>
            {snapshot.phase === 'active'
              ? 'Live'
              : snapshot.phase === 'preround'
                ? 'Stand By'
                : snapshot.phase === 'result'
                  ? 'Result'
                : snapshot.phase === 'cooldown'
                  ? 'Cooldown'
                  : snapshot.phase === 'summary'
                    ? 'Summary'
                    : 'Menu'}
          </span>
        </div>

        <div className="control-row">
          <button className="primary-button" onClick={onStart}>
            Restart Session <HotkeyHint label={UI_KEYBINDS.restartSession.label} />
          </button>
          <button className="secondary-button" onClick={onNext}>
            {nextLabel}{' '}
            {snapshot.phase === 'result' && <HotkeyHint label={UI_KEYBINDS.nextTry.label} />}
          </button>
          <button className="ghost-button" onClick={onReset}>
            Back To Menu <HotkeyHint label={UI_KEYBINDS.backToMenu.label} />
          </button>
        </div>

        {snapshot.accountName && snapshot.xp ? (
          <div className="level-strip">
            <div className="level-strip-copy">
              <span>{snapshot.accountName}</span>
              <strong>Level {snapshot.xp.level}</strong>
              <b className="level-strip-progress">{formatLevelProgress(snapshot.xp)}</b>
            </div>
            <div className="level-strip-bar">
              <div
                className="level-strip-fill"
                style={{ width: `${Math.max(snapshot.xp.progress, 0.02) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="level-strip level-strip-logged-out">
            <div className="level-strip-copy">
              <span>Progression Locked</span>
              <strong>Open Settings &gt; Account to bank XP and levels.</strong>
            </div>
          </div>
        )}

        <div className="compact-grid">
          <div>
            <span>Session</span>
            <strong>{SESSION_TYPE_LABELS[settings.sessionType]}</strong>
          </div>
          <div>
            <span>Rep</span>
            <strong>
              {snapshot.repNumber || 0}
              {snapshot.sessionGoal ? ` / ${snapshot.sessionGoal}` : ''}
            </strong>
          </div>
          <div>
            <span>Average Shot Time</span>
            <strong>{formatReaction(snapshot.averageShotTimeMs)}</strong>
          </div>
          <div>
            <span>Behavior</span>
            <strong>
              {snapshot.currentBehavior
                ? formatBehaviorLabel(snapshot.currentBehavior, snapshot.currentSpeed)
                : formatPeekSelectionLabel(settings.selectedPeek, settings.selectedSpeed)}
            </strong>
          </div>
          <div>
            <span>Speed</span>
            <strong>{PEEK_SPEED_LABELS[snapshot.currentSpeed]}</strong>
          </div>
          <div>
            <span>Wallhack</span>
            <strong>{settings.doorVisibilityAssist ? 'On' : 'Off'}</strong>
          </div>
          <div>
            <span>Scope</span>
            <strong>{SCOPE_LEVEL_LABELS[snapshot.scopeLevel]}</strong>
          </div>
          <div>
            <span>Target state</span>
            <strong>
              {snapshot.activeTargetVisibleThroughDoor
                ? 'Visible Through Door'
                : snapshot.activeTargetVisible
                  ? 'Visible'
                  : snapshot.activeTargetDoor
                    ? 'Door Timing Hidden'
                    : 'Hidden'}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel stats-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Session Stats</p>
            <h2>Reaction Log</h2>
          </div>
        </div>

        <div className="hud-stat-hero-grid">
          <div className="hud-stat-hero-card">
            <span>Last Reaction</span>
            <strong>{formatReaction(snapshot.stats.lastSuccessful)}</strong>
          </div>
          <div className="hud-stat-hero-card">
            <span>Best Reaction</span>
            <strong>{formatReaction(snapshot.stats.best)}</strong>
          </div>
          <div className="hud-stat-hero-card">
            <span>Average</span>
            <strong>{formatReaction(snapshot.stats.average)}</strong>
          </div>
          <div className="hud-stat-hero-card">
            <span>Median</span>
            <strong>{formatReaction(snapshot.stats.median)}</strong>
          </div>
        </div>

        <div className="hud-stat-detail-grid">
          {summaryStats.map((item) => (
            <div key={item.label} className="hud-stat-detail-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="recent-list">
          <div className="subheading-row">
            <span>Recent valid hits</span>
            <span>{snapshot.stats.recentResults.length}</span>
          </div>
          {snapshot.stats.recentResults.length === 0 ? (
            <p className="empty-copy">
              No successful reps logged yet. Misses and failed reps stay out of
              the reaction list.
            </p>
          ) : (
            snapshot.stats.recentResults.slice(0, 8).map((result) => (
              <div key={`${result.rep}-${result.reactionTime}`} className="reaction-row hud-reaction-row">
                <span className="hud-reaction-copy">
                  R{result.rep} / {formatBehaviorLabel(result.behavior, result.speed)}
                </span>
                <div className="hud-reaction-bar-shell">
                  <div
                    className="reaction-bar"
                    style={{
                      width: `${Math.min(result.reactionTime / 5.2, 100)}%`,
                    }}
                  />
                </div>
                <strong>{Math.round(result.reactionTime)} ms</strong>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel history-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Local Save</p>
            <h2>History</h2>
          </div>
        </div>

        <div className="compact-grid compact-grid-history">
          <div>
            <span>Lifetime best</span>
            <strong>{formatReaction(snapshot.lifetime.allTimeBest)}</strong>
          </div>
          <div>
            <span>Lifetime avg</span>
            <strong>{formatReaction(lifetimeAverage)}</strong>
          </div>
          <div>
            <span>Sessions</span>
            <strong>{snapshot.lifetime.totalSessions}</strong>
          </div>
          <div>
            <span>Total hits</span>
            <strong>{snapshot.lifetime.totalHits}</strong>
          </div>
        </div>

        <div className="history-list">
          {snapshot.history.length === 0 ? (
            <p className="empty-copy">
              Finished session summaries will appear here after each completed block.
            </p>
          ) : (
            snapshot.history.slice(0, 6).map((entry) => (
              <div key={entry.id} className="history-row">
                <div>
                  <strong>{MODE_LABELS[entry.mode]}</strong>
                  <span>
                    {new Date(entry.completedAt).toLocaleDateString()} /{' '}
                    {WEAPON_LABELS[entry.weapon]}
                  </span>
                </div>
                <div>
                  <strong>{entry.accuracy.toFixed(1)}%</strong>
                  <span>{formatReaction(entry.best)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
