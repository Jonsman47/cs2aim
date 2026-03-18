import { HotkeyHint } from './HotkeyHint.tsx'
import {
  MODE_LABELS,
  SESSION_TYPE_LABELS,
  UI_KEYBINDS,
  WEAPON_LABELS,
  formatBehaviorLabel,
} from '../game/constants.ts'
import type { SessionSummary } from '../game/types.ts'

interface SessionSummaryProps {
  summary: SessionSummary
  onRestart: () => void
  onMenu: () => void
}

const formatReaction = (value: number | null) =>
  value === null ? '--' : `${Math.round(value)} ms`

export function SessionSummary({ summary, onRestart, onMenu }: SessionSummaryProps) {
  return (
    <div className="summary-overlay">
      <div className="summary-card">
        <p className="eyebrow">Session Summary</p>
        <h2>
          {MODE_LABELS[summary.mode]} / {WEAPON_LABELS[summary.weapon]}
        </h2>
        <p className="summary-copy">
          {SESSION_TYPE_LABELS[summary.sessionType]} complete on{' '}
          {new Date(summary.completedAt).toLocaleString()}.
        </p>

        <div className="metric-grid">
          <div className="metric-card">
            <span>Last</span>
            <strong>{formatReaction(summary.stats.lastSuccessful)}</strong>
          </div>
          <div className="metric-card">
            <span>Best</span>
            <strong>{formatReaction(summary.stats.best)}</strong>
          </div>
          <div className="metric-card">
            <span>Average</span>
            <strong>{formatReaction(summary.stats.average)}</strong>
          </div>
          <div className="metric-card">
            <span>Median</span>
            <strong>{formatReaction(summary.stats.median)}</strong>
          </div>
          <div className="metric-card">
            <span>Hits</span>
            <strong>{summary.stats.hits}</strong>
          </div>
          <div className="metric-card">
            <span>Misses</span>
            <strong>{summary.stats.misses}</strong>
          </div>
          <div className="metric-card">
            <span>Failed reps</span>
            <strong>{summary.stats.failedReps}</strong>
          </div>
          <div className="metric-card">
            <span>Accuracy</span>
            <strong>{summary.stats.accuracy.toFixed(1)}%</strong>
          </div>
        </div>

        <div className="recent-list">
          <div className="subheading-row">
            <span>Recent valid reactions</span>
            <span>{summary.stats.recentResults.length}</span>
          </div>
          {summary.stats.recentResults.slice(0, 8).map((result) => (
            <div key={`${result.rep}-${result.reactionTime}`} className="reaction-row">
              <span>
                Rep {result.rep} {formatBehaviorLabel(result.behavior, result.speed)}
              </span>
              <div
                className="reaction-bar"
                style={{
                  width: `${Math.min(result.reactionTime / 5.2, 100)}%`,
                }}
              />
              <strong>{Math.round(result.reactionTime)} ms</strong>
            </div>
          ))}
        </div>

        <div className="summary-actions">
          <button className="primary-button" onClick={onRestart}>
            Run It Again <HotkeyHint label={UI_KEYBINDS.restartSession.label} />
          </button>
          <button className="ghost-button" onClick={onMenu}>
            Back To Menu <HotkeyHint label={UI_KEYBINDS.backToMenu.label} />
          </button>
        </div>
      </div>
    </div>
  )
}
