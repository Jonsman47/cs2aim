import { useEffect, useRef } from 'react'
import { drawCrosshairOverlay } from '../game/crosshair.ts'
import type {
  NormalCrosshairSettings,
  ScopedCrosshairSettings,
} from '../game/types.ts'

interface CrosshairPreviewProps {
  variant: 'normal' | 'scoped'
  normal: NormalCrosshairSettings
  scoped: ScopedCrosshairSettings
}

const PREVIEW_WIDTH = 320
const PREVIEW_HEIGHT = 180

const paintPreview = (
  canvas: HTMLCanvasElement | null,
  normal: NormalCrosshairSettings,
  scoped: ScopedCrosshairSettings,
  scopeVisualLevel: number,
) => {
  if (!canvas) {
    return
  }

  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.floor(PREVIEW_WIDTH * ratio)
  canvas.height = Math.floor(PREVIEW_HEIGHT * ratio)
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)

  const gradient = context.createLinearGradient(0, 0, 0, PREVIEW_HEIGHT)
  gradient.addColorStop(0, '#081116')
  gradient.addColorStop(1, '#060b10')
  context.fillStyle = gradient
  context.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)

  context.fillStyle = 'rgba(255,255,255,0.025)'
  context.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)

  drawCrosshairOverlay(context, PREVIEW_WIDTH, PREVIEW_HEIGHT, {
    normal,
    scoped,
    scopeVisualLevel,
    cooldownPulse: 0,
  })
}

function PreviewCanvas({
  label,
  normal,
  scoped,
  scopeVisualLevel,
}: {
  label: string
  normal: NormalCrosshairSettings
  scoped: ScopedCrosshairSettings
  scopeVisualLevel: number
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    paintPreview(canvasRef.current, normal, scoped, scopeVisualLevel)
  }, [normal, scoped, scopeVisualLevel])

  return (
    <div className="crosshair-preview-pane">
      <p className="eyebrow">{label}</p>
      <canvas
        ref={canvasRef}
        className="crosshair-preview-canvas"
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
      />
    </div>
  )
}

export function CrosshairPreview({ variant, normal, scoped }: CrosshairPreviewProps) {
  if (variant === 'normal') {
    return (
      <div className="crosshair-preview-card">
        <PreviewCanvas
          label="Normal Preview"
          normal={normal}
          scoped={scoped}
          scopeVisualLevel={0}
        />
      </div>
    )
  }

  return (
    <div className="crosshair-preview-card">
      <div className="crosshair-preview-grid">
        <PreviewCanvas
          label="Scope 1 Preview"
          normal={normal}
          scoped={scoped}
          scopeVisualLevel={1}
        />
        <PreviewCanvas
          label="Scope 2 Preview"
          normal={normal}
          scoped={scoped}
          scopeVisualLevel={2}
        />
      </div>
    </div>
  )
}
