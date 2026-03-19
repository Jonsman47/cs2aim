import type { ProgressionSyncRequest } from './types'

const PROGRESSION_QUEUE_STORAGE_KEY = 'midlane-reaction-progress-queue'
const MAX_QUEUED_EVENTS = 250

export interface QueuedProgressionEvent extends ProgressionSyncRequest {
  queuedAt: number
}

const normalizeQueuedEvent = (
  value: Partial<QueuedProgressionEvent> | null | undefined,
): QueuedProgressionEvent | null => {
  if (!value || typeof value.eventId !== 'string' || value.eventId.trim().length === 0) {
    return null
  }

  const reactionTimes = Array.isArray(value.reactionTimes)
    ? value.reactionTimes.filter(
        (reactionTime): reactionTime is number =>
          typeof reactionTime === 'number' &&
          Number.isFinite(reactionTime) &&
          reactionTime > 0 &&
          reactionTime <= 5000,
      )
    : []

  return {
    eventId: value.eventId.trim(),
    xpDelta: Math.max(0, Math.round(Number(value.xpDelta) || 0)),
    shotsDelta: Math.max(0, Math.round(Number(value.shotsDelta) || 0)),
    killsDelta: Math.max(0, Math.round(Number(value.killsDelta) || 0)),
    headshotsDelta: Math.max(0, Math.round(Number(value.headshotsDelta) || 0)),
    wallbangsDelta: Math.max(0, Math.round(Number(value.wallbangsDelta) || 0)),
    reactionTimes,
    score:
      typeof value.score === 'number' && Number.isFinite(value.score)
        ? Math.max(0, Math.min(100, Math.round(value.score)))
        : null,
    queuedAt: Math.max(0, Math.round(Number(value.queuedAt) || Date.now())),
  }
}

export const stripQueuedProgressionEvent = (
  event: QueuedProgressionEvent,
): ProgressionSyncRequest => ({
  eventId: event.eventId,
  xpDelta: event.xpDelta,
  shotsDelta: event.shotsDelta,
  killsDelta: event.killsDelta,
  headshotsDelta: event.headshotsDelta,
  wallbangsDelta: event.wallbangsDelta,
  reactionTimes: event.reactionTimes,
  score: event.score,
})

export const loadProgressionQueue = (): QueuedProgressionEvent[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(PROGRESSION_QUEUE_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((event) => normalizeQueuedEvent(event as Partial<QueuedProgressionEvent>))
      .filter((event): event is QueuedProgressionEvent => event !== null)
      .slice(-MAX_QUEUED_EVENTS)
  } catch {
    return []
  }
}

export const saveProgressionQueue = (queue: QueuedProgressionEvent[]) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    PROGRESSION_QUEUE_STORAGE_KEY,
    JSON.stringify(queue.slice(-MAX_QUEUED_EVENTS)),
  )
}
