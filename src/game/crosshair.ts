import { clamp, lerp } from './math'
import type {
  NormalCrosshairSettings,
  ScopedCrosshairSettings,
} from './types'

export interface CrosshairRenderState {
  normal: NormalCrosshairSettings
  scoped: ScopedCrosshairSettings
  scopeVisualLevel: number
  cooldownPulse: number
}

const OUTLINE_ALPHA = 0.84

export const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : normalized

  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export const getScopedOverlayRadius = (
  width: number,
  height: number,
  scopeVisualLevel: number,
) => {
  const minDimension = Math.min(width, height)
  if (scopeVisualLevel <= 1) {
    return lerp(minDimension * 0.48, minDimension * 0.4, scopeVisualLevel)
  }

  return lerp(
    minDimension * 0.4,
    minDimension * 0.31,
    clamp(scopeVisualLevel - 1, 0, 1),
  )
}

const snap = (value: number) => Math.round(value * 2) / 2

const getRoundedRectRadius = (width: number, height: number, radius: number) =>
  Math.max(0, Math.min(radius, width / 2, height / 2))

const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const fittedRadius = getRoundedRectRadius(width, height, radius)
  ctx.beginPath()
  ctx.moveTo(x + fittedRadius, y)
  ctx.arcTo(x + width, y, x + width, y + height, fittedRadius)
  ctx.arcTo(x + width, y + height, x, y + height, fittedRadius)
  ctx.arcTo(x, y + height, x, y, fittedRadius)
  ctx.arcTo(x, y, x + width, y, fittedRadius)
  ctx.closePath()
}

const fillRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
) => {
  if (width <= 0 || height <= 0) {
    return
  }

  ctx.fillStyle = color
  roundedRectPath(ctx, x, y, width, height, radius)
  ctx.fill()
}

const fillCircle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
) => {
  if (radius <= 0) {
    return
  }

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

const drawRoundedArm = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  outlineColor: string | null,
  outlineThickness: number,
) => {
  if (width <= 0 || height <= 0) {
    return
  }

  const radius = Math.min(height / 2 + 0.45, 3.2)
  if (outlineColor && outlineThickness > 0) {
    fillRoundedRect(
      ctx,
      x - outlineThickness,
      y - outlineThickness,
      width + outlineThickness * 2,
      height + outlineThickness * 2,
      radius + outlineThickness * 0.85,
      outlineColor,
    )
  }

  fillRoundedRect(ctx, x, y, width, height, radius, color)
}

const drawScopedInnerCross = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  settings: ScopedCrosshairSettings,
  color: string,
) => {
  const thickness = Math.max(1, settings.lineThickness * 0.9)
  const gap = Math.max(0, settings.innerGap)
  const size = Math.max(0, settings.innerSize)
  const topY = snap(centerY - gap - size)
  const bottomY = snap(centerY + gap)
  const leftX = snap(centerX - gap - size)
  const rightX = snap(centerX + gap)
  const horizontalY = snap(centerY - thickness / 2)
  const verticalX = snap(centerX - thickness / 2)

  drawRoundedArm(ctx, leftX, horizontalY, size, thickness, color, null, 0)
  drawRoundedArm(ctx, rightX, horizontalY, size, thickness, color, null, 0)
  drawRoundedArm(ctx, verticalX, topY, thickness, size, color, null, 0)
  drawRoundedArm(ctx, verticalX, bottomY, thickness, size, color, null, 0)
}

export const drawCrosshairOverlay = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: CrosshairRenderState,
) => {
  const centerX = snap(width / 2)
  const centerY = snap(height / 2)
  const scopeBlend = clamp(state.scopeVisualLevel / 2, 0, 1)

  ctx.save()
  ctx.imageSmoothingEnabled = true

  if (scopeBlend > 0.02) {
    const radius = getScopedOverlayRadius(width, height, state.scopeVisualLevel)
    const scopeLineColor = `rgba(247, 250, 252, ${state.scoped.lineOpacity})`
    const scopeBorderColor = `rgba(0, 0, 0, ${state.scoped.borderOpacity})`

    ctx.fillStyle = `rgba(0, 0, 0, ${
      state.scoped.overlayOpacity * (0.22 + scopeBlend * 0.78)
    })`
    ctx.beginPath()
    ctx.rect(0, 0, width, height)
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true)
    ctx.fill('evenodd')

    ctx.strokeStyle = scopeBorderColor
    ctx.lineWidth = Math.max(1.3, state.scoped.lineThickness * 1.15)
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = scopeLineColor
    ctx.lineWidth = Math.max(1, state.scoped.lineThickness)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(centerX - radius, centerY)
    ctx.lineTo(centerX + radius, centerY)
    ctx.moveTo(centerX, centerY - radius)
    ctx.lineTo(centerX, centerY + radius)
    ctx.stroke()

    if (state.scoped.centerDot) {
      fillCircle(
        ctx,
        centerX,
        centerY,
        Math.max(state.scoped.centerDotSize, 0.8),
        `rgba(247, 250, 252, ${state.scoped.centerDotOpacity})`,
      )
    }

    if (state.scoped.innerStyle === 'cross') {
      drawScopedInnerCross(
        ctx,
        centerX,
        centerY,
        state.scoped,
        `rgba(247, 250, 252, ${state.scoped.innerOpacity})`,
      )
    } else if (state.scoped.innerStyle === 'dot') {
      fillCircle(
        ctx,
        centerX,
        centerY,
        Math.max(state.scoped.innerSize * 0.24, 1),
        `rgba(247, 250, 252, ${state.scoped.innerOpacity})`,
      )
    }
  }

  const baseAlpha = clamp(1 - scopeBlend, 0, 1)
  const dynamicGap =
    state.normal.dynamicMode === 'slight'
      ? state.normal.gap + state.cooldownPulse * 2.4
      : state.normal.gap
  const thickness = Math.max(1, state.normal.thickness)
  const lineLength = Math.max(0, state.normal.lineLength)
  const gap = Math.max(0, dynamicGap)
  const outlineThickness = state.normal.outline
    ? Math.max(0, state.normal.outlineThickness)
    : 0
  const lineColor = hexToRgba(state.normal.color, state.normal.opacity * baseAlpha)
  const dotColor = hexToRgba(
    state.normal.color,
    state.normal.centerDotOpacity * baseAlpha,
  )
  const outlineColor =
    outlineThickness > 0 ? `rgba(0, 0, 0, ${OUTLINE_ALPHA * baseAlpha})` : null

  if (baseAlpha > 0.01 && lineLength > 0) {
    const horizontalY = snap(centerY - thickness / 2)
    const verticalX = snap(centerX - thickness / 2)
    const leftX = snap(centerX - gap - lineLength)
    const rightX = snap(centerX + gap)
    const topY = snap(centerY - gap - lineLength)
    const bottomY = snap(centerY + gap)

    drawRoundedArm(
      ctx,
      leftX,
      horizontalY,
      lineLength,
      thickness,
      lineColor,
      outlineColor,
      outlineThickness,
    )
    drawRoundedArm(
      ctx,
      rightX,
      horizontalY,
      lineLength,
      thickness,
      lineColor,
      outlineColor,
      outlineThickness,
    )

    if (!state.normal.tStyle) {
      drawRoundedArm(
        ctx,
        verticalX,
        topY,
        thickness,
        lineLength,
        lineColor,
        outlineColor,
        outlineThickness,
      )
    }

    drawRoundedArm(
      ctx,
      verticalX,
      bottomY,
      thickness,
      lineLength,
      lineColor,
      outlineColor,
      outlineThickness,
    )
  }

  if (baseAlpha > 0.01 && state.normal.showCenterDot) {
    if (outlineColor && outlineThickness > 0) {
      fillCircle(
        ctx,
        centerX,
        centerY,
        state.normal.centerDotSize + outlineThickness,
        outlineColor,
      )
    }

    fillCircle(
      ctx,
      centerX,
      centerY,
      Math.max(state.normal.centerDotSize, 0.75),
      dotColor,
    )
  }

  ctx.restore()
}
