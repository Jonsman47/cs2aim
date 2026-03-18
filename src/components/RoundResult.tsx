import { HotkeyHint } from './HotkeyHint.tsx'
import { UI_KEYBINDS, WEAPON_LABELS, formatBehaviorLabel } from '../game/constants.ts'
import type { RoundResult as RoundResultModel } from '../game/types.ts'

interface RoundResultProps {
  result: RoundResultModel
  nextLabel: string
  showHitLabels: boolean
  showScoringBreakdown: boolean
  onNext: () => void
  onRestart: () => void
  onMenu: () => void
}

const formatShotScore = (value: number) =>
  `${Math.max(0, Math.min(100, Math.round(value)))}`

export function RoundResult({
  result,
  nextLabel,
  showHitLabels,
  showScoringBreakdown,
  onNext,
  onRestart,
  onMenu,
}: RoundResultProps) {
  const showHitFlags = showHitLabels && (result.headshot || result.wallbang)

  return (
    <div className="round-result-overlay">
      <div className={`round-result-card ${result.success ? '' : 'is-failed'}`}>
        <p className="eyebrow">{result.success ? 'Successful Hit' : 'Rep Result'}</p>

        <div className="round-result-flags">
          {showHitFlags && result.headshot && (
            <span className="round-result-flag is-headshot">Headshot</span>
          )}
          {showHitFlags && result.wallbang && (
            <span className="round-result-flag is-wallbang">Wallbang</span>
          )}
          {!result.doorVisibilityAssist && (
            <span className="round-result-flag">No Assist</span>
          )}
        </div>

        {showHitLabels && result.headshot && (
          <p className="round-result-callout">HEADSHOT</p>
        )}

        {result.success && result.reactionTime !== null ? (
          <>
            <span className="round-result-label">Reaction Time</span>
            <strong className="round-result-time">
              {Math.round(result.reactionTime)} ms
            </strong>
          </>
        ) : (
          <strong className="round-result-time round-result-time-fail">
            No Valid Hit
          </strong>
        )}

        <div className="round-result-score">
          <span>Shot Score / 100</span>
          <strong>{formatShotScore(result.score)}</strong>
        </div>

        <div className="round-result-score round-result-score-xp">
          <span>{result.xpGained > 0 ? 'XP Gained' : 'Progression'}</span>
          <strong>{result.xpGained > 0 ? `+${result.xpGained} XP` : 'Login to bank XP'}</strong>
        </div>

        <p className="round-result-copy">
          {WEAPON_LABELS[result.weapon]} / {formatBehaviorLabel(result.behavior, result.speed)} /{' '}
          {result.shotsFired} shot{result.shotsFired === 1 ? '' : 's'} fired /{' '}
          {result.success
            ? result.missesBeforeHit === 0
              ? 'clean first-shot finish'
              : `${result.missesBeforeHit} miss${
                  result.missesBeforeHit === 1 ? '' : 'es'
                } before the hit`
            : 'rep ended without a valid finish'}
        </p>

        <p className="round-result-hint">
          Press <kbd>{UI_KEYBINDS.nextTry.label}</kbd> for next try
        </p>

        {showScoringBreakdown && (
          <div className="round-result-breakdown">
            {result.breakdown.map((item) => (
              <div key={item.label} className="round-breakdown-row">
                <div>
                  <span>{item.label}</span>
                  <strong>{item.detail}</strong>
                </div>
                <b>{item.value > 0 ? '+' : ''}{item.value}</b>
              </div>
            ))}
          </div>
        )}

        <div className="round-result-actions">
          <button className="primary-button" onClick={onNext}>
            {nextLabel} <HotkeyHint label={UI_KEYBINDS.nextTry.label} />
          </button>
          <button className="secondary-button" onClick={onMenu}>
            Back To Menu <HotkeyHint label={UI_KEYBINDS.backToMenu.label} />
          </button>
          <button className="ghost-button" onClick={onRestart}>
            Restart Session <HotkeyHint label={UI_KEYBINDS.restartSession.label} />
          </button>
        </div>
      </div>
    </div>
  )
}
