import type { ShotFeedback } from '../game/types'

interface ShotFeedbackToastProps {
  feedback: ShotFeedback
}

export function ShotFeedbackToast({ feedback }: ShotFeedbackToastProps) {
  return (
    <div className={`shot-feedback-toast tone-${feedback.tone}`}>
      <strong>{feedback.title}</strong>
      {feedback.detail && <em>{feedback.detail}</em>}
      <span>{feedback.xpLabel}</span>
    </div>
  )
}
