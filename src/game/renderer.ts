import { DOOR_PANELS, LANE_FLOOR, REAR_WALL, SOLID_COVER } from './constants'
import { drawCrosshairOverlay } from './crosshair'
import { getCameraPose, type GameRuntime, type RuntimeEnemyState } from './engine'
import { clamp, projectAabbBounds, projectPoint, smoothstep } from './math'

interface CanvasMetrics {
  width: number
  height: number
  ratio: number
  lastCheckAt: number
}

interface SceneBuffer {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  width: number
  height: number
  ratio: number
}

interface QualityProfile {
  renderScale: number
  floorStep: number
  floorLineStrength: number
  doorSlatCount: number
  vignetteStrength: number
  atmosphereStrength: number
  shadowStrength: number
  assistGlowStrength: number
  weaponDetailStrength: number
}

const canvasMetricsCache = new WeakMap<HTMLCanvasElement, CanvasMetrics>()
const contextCache = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>()
const sceneBufferCache = new WeakMap<HTMLCanvasElement, SceneBuffer>()

const QUALITY_PROFILES: Record<GameRuntime['settings']['graphicsQuality'], QualityProfile> = {
  'very-high': {
    renderScale: 1.15,
    floorStep: 2.2,
    floorLineStrength: 1.2,
    doorSlatCount: 9,
    vignetteStrength: 1.1,
    atmosphereStrength: 0.26,
    shadowStrength: 1.18,
    assistGlowStrength: 0.18,
    weaponDetailStrength: 1,
  },
  high: {
    renderScale: 1.06,
    floorStep: 2.8,
    floorLineStrength: 1.08,
    doorSlatCount: 7,
    vignetteStrength: 1.04,
    atmosphereStrength: 0.15,
    shadowStrength: 1.08,
    assistGlowStrength: 0.1,
    weaponDetailStrength: 0.62,
  },
  medium: {
    renderScale: 1,
    floorStep: 3.2,
    floorLineStrength: 1,
    doorSlatCount: 6,
    vignetteStrength: 1,
    atmosphereStrength: 0,
    shadowStrength: 1,
    assistGlowStrength: 0,
    weaponDetailStrength: 0,
  },
  low: {
    renderScale: 0.82,
    floorStep: 4.4,
    floorLineStrength: 0.78,
    doorSlatCount: 4,
    vignetteStrength: 0.88,
    atmosphereStrength: 0,
    shadowStrength: 0.72,
    assistGlowStrength: 0,
    weaponDetailStrength: 0,
  },
  'very-low': {
    renderScale: 0.64,
    floorStep: 6.2,
    floorLineStrength: 0.56,
    doorSlatCount: 3,
    vignetteStrength: 0.72,
    atmosphereStrength: 0,
    shadowStrength: 0.46,
    assistGlowStrength: 0,
    weaponDetailStrength: 0,
  },
}

const resizeCanvas = (canvas: HTMLCanvasElement, now: number) => {
  const cached = canvasMetricsCache.get(canvas)
  if (cached && now - cached.lastCheckAt < 180) {
    return cached
  }

  const rect = canvas.getBoundingClientRect()
  const ratio = window.devicePixelRatio || 1
  const width = Math.max(1, Math.floor(rect.width * ratio))
  const height = Math.max(1, Math.floor(rect.height * ratio))

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const nextMetrics = {
    width: rect.width,
    height: rect.height,
    ratio,
    lastCheckAt: now,
  }

  canvasMetricsCache.set(canvas, nextMetrics)
  return nextMetrics
}

const getCachedContext = (canvas: HTMLCanvasElement) => {
  const cached = contextCache.get(canvas)
  if (cached) {
    return cached
  }

  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  contextCache.set(canvas, context)
  return context
}

const getSceneBuffer = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  ratio: number,
) => {
  let cached = sceneBufferCache.get(canvas)
  if (!cached) {
    const sceneCanvas = document.createElement('canvas')
    const sceneContext = sceneCanvas.getContext('2d')
    if (!sceneContext) {
      return null
    }

    cached = {
      canvas: sceneCanvas,
      context: sceneContext,
      width: 0,
      height: 0,
      ratio,
    }
    sceneBufferCache.set(canvas, cached)
  }

  const pixelWidth = Math.max(1, Math.round(width * ratio))
  const pixelHeight = Math.max(1, Math.round(height * ratio))
  if (
    cached.canvas.width !== pixelWidth ||
    cached.canvas.height !== pixelHeight ||
    cached.ratio !== ratio
  ) {
    cached.canvas.width = pixelWidth
    cached.canvas.height = pixelHeight
    cached.width = width
    cached.height = height
    cached.ratio = ratio
  } else {
    cached.width = width
    cached.height = height
  }

  return cached
}

const drawProjectedPolygon = (
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number; z: number }>,
  camera: ReturnType<typeof getCameraPose>,
  width: number,
  height: number,
  fill: string,
  stroke?: string,
) => {
  const projected = points
    .map((point) => projectPoint(point, camera, width, height))
    .filter((point) => point.visible)

  if (projected.length < 3) {
    return
  }

  ctx.beginPath()
  ctx.moveTo(projected[0].x, projected[0].y)
  for (const point of projected.slice(1)) {
    ctx.lineTo(point.x, point.y)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()

  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

const drawBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  darkTheme: boolean,
  quality: QualityProfile,
) => {
  const sky = ctx.createLinearGradient(0, 0, 0, height)
  if (darkTheme) {
    sky.addColorStop(0, '#050c12')
    sky.addColorStop(0.42, '#101920')
    sky.addColorStop(0.72, '#251f19')
    sky.addColorStop(1, '#0c0a09')
  } else {
    sky.addColorStop(0, '#b8ccd4')
    sky.addColorStop(0.48, '#dec392')
    sky.addColorStop(0.72, '#caa874')
    sky.addColorStop(1, '#745437')
  }
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  const vignette = ctx.createRadialGradient(
    width / 2,
    height * 0.44,
    width * 0.14,
    width / 2,
    height * 0.58,
    width * 0.7,
  )
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(
    1,
    darkTheme
      ? `rgba(0,0,0,${0.46 * quality.vignetteStrength})`
      : `rgba(57,31,11,${0.2 * quality.vignetteStrength})`,
  )
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)

  if (quality.atmosphereStrength > 0) {
    const topGlow = ctx.createRadialGradient(
      width * 0.5,
      height * 0.3,
      width * 0.06,
      width * 0.5,
      height * 0.45,
      width * 0.52,
    )
    topGlow.addColorStop(
      0,
      darkTheme
        ? `rgba(129, 182, 255, ${quality.atmosphereStrength * 0.2})`
        : `rgba(255, 231, 186, ${quality.atmosphereStrength * 0.22})`,
    )
    topGlow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = topGlow
    ctx.fillRect(0, 0, width, height)
  }
}

const drawAtmosphere = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  darkTheme: boolean,
  quality: QualityProfile,
) => {
  if (quality.atmosphereStrength <= 0) {
    return
  }

  const haze = ctx.createLinearGradient(0, height * 0.24, 0, height)
  haze.addColorStop(
    0,
    darkTheme
      ? `rgba(125, 174, 255, ${quality.atmosphereStrength * 0.12})`
      : `rgba(255, 229, 173, ${quality.atmosphereStrength * 0.14})`,
  )
  haze.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = haze
  ctx.fillRect(0, height * 0.18, width, height * 0.52)

  for (const offset of [0.2, 0.5, 0.78]) {
    const beam = ctx.createLinearGradient(
      width * offset - width * 0.05,
      0,
      width * offset + width * 0.05,
      height,
    )
    beam.addColorStop(0, 'rgba(0,0,0,0)')
    beam.addColorStop(
      0.5,
      darkTheme
        ? `rgba(255, 229, 173, ${quality.atmosphereStrength * 0.045})`
        : `rgba(255, 250, 236, ${quality.atmosphereStrength * 0.065})`,
    )
    beam.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = beam
    ctx.fillRect(width * offset - width * 0.08, 0, width * 0.16, height)
  }
}

const drawFloorAndWalls = (
  ctx: CanvasRenderingContext2D,
  camera: ReturnType<typeof getCameraPose>,
  width: number,
  height: number,
  darkTheme: boolean,
  quality: QualityProfile,
) => {
  drawProjectedPolygon(
    ctx,
    LANE_FLOOR,
    camera,
    width,
    height,
    darkTheme ? '#21180f' : '#caa16d',
  )

  for (let depth = 8; depth <= 64; depth += quality.floorStep) {
    const left = projectPoint({ x: -12.8, y: 0.01, z: depth }, camera, width, height)
    const right = projectPoint({ x: 12.8, y: 0.01, z: depth }, camera, width, height)
    if (!left.visible || !right.visible) {
      continue
    }
    const alpha = (0.04 + smoothstep(66, 10, depth) * 0.14) * quality.floorLineStrength
    ctx.strokeStyle = darkTheme
      ? `rgba(255, 222, 160, ${alpha})`
      : `rgba(89, 56, 20, ${alpha})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(left.x, left.y)
    ctx.lineTo(right.x, right.y)
    ctx.stroke()
  }

  drawProjectedPolygon(
    ctx,
    REAR_WALL,
    camera,
    width,
    height,
    darkTheme ? '#25343d' : '#ccb48a',
  )

  const leftWall = [
    { x: -16.5, y: 0, z: 5 },
    { x: -8.8, y: 0, z: 5 },
    { x: -6.9, y: 4.9, z: 28 },
    { x: -10.1, y: 6, z: 66 },
    { x: -18.2, y: 6.1, z: 66 },
  ]

  const rightWall = [
    { x: 16.5, y: 0, z: 5 },
    { x: 8.8, y: 0, z: 5 },
    { x: 6.9, y: 4.9, z: 28 },
    { x: 10.1, y: 6, z: 66 },
    { x: 18.2, y: 6.1, z: 66 },
  ]

  const leftParapet = [
    { x: -9.8, y: 0, z: 3.5 },
    { x: -7.7, y: 0, z: 3.5 },
    { x: -5.9, y: 1.4, z: 18 },
    { x: -7.6, y: 1.4, z: 18 },
  ]

  const rightParapet = [
    { x: 9.8, y: 0, z: 3.5 },
    { x: 7.7, y: 0, z: 3.5 },
    { x: 5.9, y: 1.4, z: 18 },
    { x: 7.6, y: 1.4, z: 18 },
  ]

  drawProjectedPolygon(
    ctx,
    leftWall,
    camera,
    width,
    height,
    darkTheme ? '#172028' : '#b38c61',
  )
  drawProjectedPolygon(
    ctx,
    rightWall,
    camera,
    width,
    height,
    darkTheme ? '#172028' : '#b38c61',
  )
  drawProjectedPolygon(
    ctx,
    leftParapet,
    camera,
    width,
    height,
    darkTheme ? '#514333' : '#c49b66',
  )
  drawProjectedPolygon(
    ctx,
    rightParapet,
    camera,
    width,
    height,
    darkTheme ? '#514333' : '#c49b66',
  )

  for (const x of [-8.6, -4.4, 0, 4.4, 8.6]) {
    const near = projectPoint({ x, y: 0.02, z: 7 }, camera, width, height)
    const far = projectPoint({ x: x * 1.2, y: 0.02, z: 63 }, camera, width, height)
    if (!near.visible || !far.visible) {
      continue
    }
    ctx.strokeStyle = darkTheme
      ? `rgba(255, 224, 178, ${0.08 * quality.floorLineStrength})`
      : `rgba(91, 57, 21, ${0.12 * quality.floorLineStrength})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(near.x, near.y)
    ctx.lineTo(far.x, far.y)
    ctx.stroke()
  }
}

const drawCover = (
  ctx: CanvasRenderingContext2D,
  camera: ReturnType<typeof getCameraPose>,
  width: number,
  height: number,
  darkTheme: boolean,
) => {
  for (const cover of SOLID_COVER) {
    const front = [
      { x: cover.min.x, y: cover.min.y, z: cover.min.z },
      { x: cover.max.x, y: cover.min.y, z: cover.min.z },
      { x: cover.max.x, y: cover.max.y, z: cover.min.z },
      { x: cover.min.x, y: cover.max.y, z: cover.min.z },
    ]

    const top = [
      { x: cover.min.x, y: cover.max.y, z: cover.min.z },
      { x: cover.max.x, y: cover.max.y, z: cover.min.z },
      { x: cover.max.x, y: cover.max.y, z: cover.max.z },
      { x: cover.min.x, y: cover.max.y, z: cover.max.z },
    ]

    drawProjectedPolygon(
      ctx,
      front,
      camera,
      width,
      height,
      darkTheme ? '#171b20' : '#816743',
      darkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(70,42,19,0.12)',
    )
    drawProjectedPolygon(
      ctx,
      top,
      camera,
      width,
      height,
      darkTheme ? '#252d34' : '#a78457',
    )
  }
}

const getCoverClip = (
  enemy: RuntimeEnemyState,
  camera: ReturnType<typeof getCameraPose>,
  width: number,
  height: number,
) => {
  const body = enemy.hitboxes.body
  let minX = body.min.x
  let maxX = body.max.x

  if (
    enemy.position.x < 0 &&
    enemy.position.z > SOLID_COVER[0].min.z &&
    enemy.position.z < SOLID_COVER[0].max.z
  ) {
    minX = Math.max(minX, SOLID_COVER[0].max.x)
  }

  if (
    enemy.position.x > 0 &&
    enemy.position.z > SOLID_COVER[1].min.z &&
    enemy.position.z < SOLID_COVER[1].max.z
  ) {
    maxX = Math.min(maxX, SOLID_COVER[1].min.x)
  }

  const left = projectPoint(
    { x: minX, y: (body.min.y + body.max.y) / 2, z: enemy.position.z },
    camera,
    width,
    height,
  )
  const right = projectPoint(
    { x: maxX, y: (body.min.y + body.max.y) / 2, z: enemy.position.z },
    camera,
    width,
    height,
  )

  if (!left.visible || !right.visible || left.x >= right.x) {
    return null
  }

  return {
    minX: left.x,
    maxX: right.x,
  }
}

const drawEnemy = (
  ctx: CanvasRenderingContext2D,
  camera: ReturnType<typeof getCameraPose>,
  enemy: RuntimeEnemyState,
  runtime: GameRuntime,
  width: number,
  height: number,
  quality: QualityProfile,
) => {
  if (!enemy.alive || enemy.exited) {
    return
  }

  if (enemy.visibleFraction <= 0.01) {
    return
  }

  const bodyBounds = projectAabbBounds(enemy.hitboxes.body, camera, width, height)
  const headBounds = projectAabbBounds(enemy.hitboxes.head, camera, width, height)
  if (!bodyBounds.visible || !headBounds.visible) {
    return
  }

  const clip = getCoverClip(enemy, camera, width, height)
  if (!clip) {
    return
  }

  const alphaBase =
    enemy.visibleFraction * (0.65 + runtime.settings.difficulty.visibilityLevel * 0.52)
  const assistVisible =
    runtime.settings.doorVisibilityAssist && enemy.throughDoor && !enemy.openVisible
  const alpha = clamp(
    assistVisible
      ? alphaBase * (0.58 + runtime.settings.difficulty.visibilityLevel * 0.26)
      : alphaBase * 0.92 + 0.06,
    0,
    assistVisible ? 0.92 : 0.98,
  )
  if (alpha <= 0.02) {
    return
  }
  const bodyColor = assistVisible
    ? enemy.role === 'primary'
      ? `rgba(72, 88, 116, ${alpha})`
      : `rgba(88, 104, 136, ${alpha * 0.94})`
    : enemy.role === 'primary'
      ? `rgba(28, 30, 35, ${alpha})`
      : `rgba(38, 40, 46, ${alpha * 0.96})`
  const headColor = assistVisible
    ? bodyColor
    : enemy.role === 'primary'
      ? `rgba(20, 22, 27, ${alpha})`
      : `rgba(28, 30, 35, ${alpha * 0.96})`
  const outline = assistVisible
    ? enemy.role === 'primary'
      ? `rgba(208, 223, 242, ${alpha * 0.82})`
      : `rgba(216, 229, 245, ${alpha * 0.64})`
    : null
  const shadow = projectPoint(
    { x: enemy.position.x, y: 0.02, z: enemy.position.z },
    camera,
    width,
    height,
  )

  if (shadow.visible) {
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.28 * quality.shadowStrength})`
    ctx.beginPath()
    ctx.ellipse(
      shadow.x,
      shadow.y + 4,
      Math.max((bodyBounds.maxX - bodyBounds.minX) * 0.26, 6),
      Math.max((bodyBounds.maxX - bodyBounds.minX) * 0.09, 3),
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(
    clip.minX - 2,
    headBounds.minY - 10,
    clip.maxX - clip.minX + 4,
    bodyBounds.maxY - headBounds.minY + 18,
  )
  ctx.clip()

  const bodyWidth = bodyBounds.maxX - bodyBounds.minX
  const bodyHeight = bodyBounds.maxY - bodyBounds.minY
  const headWidth = headBounds.maxX - headBounds.minX
  const torsoX = bodyBounds.minX + bodyWidth * 0.18
  const torsoWidth = bodyWidth * 0.64

  ctx.fillStyle = bodyColor
  ctx.beginPath()
  ctx.roundRect(torsoX, bodyBounds.minY, torsoWidth, bodyHeight, 7)
  ctx.fill()
  if (outline) {
    ctx.strokeStyle = outline
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  ctx.fillStyle = headColor
  ctx.beginPath()
  ctx.arc(
    (headBounds.minX + headBounds.maxX) / 2,
    (headBounds.minY + headBounds.maxY) / 2,
    headWidth * 0.44,
    0,
    Math.PI * 2,
  )
  ctx.fill()
  if (outline) {
    ctx.strokeStyle = outline
    ctx.lineWidth = 1.2
    ctx.stroke()

    ctx.strokeStyle = `rgba(219,232,247,${alpha * 0.2})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(torsoX + torsoWidth * 0.15, bodyBounds.minY + bodyHeight * 0.28)
    ctx.lineTo(torsoX + torsoWidth * 0.85, bodyBounds.minY + bodyHeight * 0.28)
    ctx.stroke()
  }

  if (assistVisible && quality.assistGlowStrength > 0) {
    const centerX = (bodyBounds.minX + bodyBounds.maxX) / 2
    const centerY = (headBounds.minY + bodyBounds.maxY) / 2
    const glow = ctx.createRadialGradient(
      centerX,
      centerY,
      bodyWidth * 0.12,
      centerX,
      centerY,
      bodyWidth * 0.9,
    )
    glow.addColorStop(0, `rgba(126, 186, 255, ${alpha * quality.assistGlowStrength})`)
    glow.addColorStop(1, 'rgba(126, 186, 255, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(
      bodyBounds.minX - bodyWidth * 0.5,
      headBounds.minY - bodyHeight * 0.35,
      bodyWidth * 2,
      bodyHeight * 1.7,
    )
  }

  ctx.restore()
}

const drawDoors = (
  ctx: CanvasRenderingContext2D,
  camera: ReturnType<typeof getCameraPose>,
  width: number,
  height: number,
  darkTheme: boolean,
  quality: QualityProfile,
) => {
  const topBeam = [
    { x: -3.08, y: 3.08, z: 45.45 },
    { x: 3.08, y: 3.08, z: 45.45 },
    { x: 3.08, y: 3.72, z: 45.45 },
    { x: -3.08, y: 3.72, z: 45.45 },
  ]
  const leftPost = [
    { x: -3.08, y: 0, z: 45.45 },
    { x: -2.42, y: 0, z: 45.45 },
    { x: -2.42, y: 3.18, z: 45.45 },
    { x: -3.08, y: 3.18, z: 45.45 },
  ]
  const rightPost = [
    { x: 2.42, y: 0, z: 45.45 },
    { x: 3.08, y: 0, z: 45.45 },
    { x: 3.08, y: 3.18, z: 45.45 },
    { x: 2.42, y: 3.18, z: 45.45 },
  ]

  for (const piece of [topBeam, leftPost, rightPost]) {
    drawProjectedPolygon(
      ctx,
      piece,
      camera,
      width,
      height,
      darkTheme ? '#4b3a29' : '#a9804c',
      darkTheme ? 'rgba(255,244,214,0.08)' : 'rgba(70,42,19,0.18)',
    )
  }

  for (const panel of DOOR_PANELS) {
    const front = [
      { x: panel.min.x, y: panel.min.y, z: panel.min.z },
      { x: panel.max.x, y: panel.min.y, z: panel.min.z },
      { x: panel.max.x, y: panel.max.y, z: panel.min.z },
      { x: panel.min.x, y: panel.max.y, z: panel.min.z },
    ]

    drawProjectedPolygon(
      ctx,
      front,
      camera,
      width,
      height,
      darkTheme ? 'rgba(122, 88, 46, 0.78)' : 'rgba(126, 83, 38, 0.58)',
      darkTheme ? 'rgba(255, 230, 188, 0.18)' : 'rgba(79, 45, 16, 0.22)',
    )

    const left = projectPoint(
      { x: panel.min.x, y: panel.min.y, z: panel.min.z },
      camera,
      width,
      height,
    )
    const right = projectPoint(
      { x: panel.max.x, y: panel.min.y, z: panel.min.z },
      camera,
      width,
      height,
    )
    const top = projectPoint(
      { x: panel.min.x, y: panel.max.y, z: panel.min.z },
      camera,
      width,
      height,
    )

    if (!left.visible || !right.visible || !top.visible) {
      continue
    }

    const slatCount = quality.doorSlatCount
    ctx.strokeStyle = darkTheme
      ? 'rgba(255, 214, 165, 0.15)'
      : 'rgba(80, 46, 16, 0.18)'
    ctx.lineWidth = 1
    for (let index = 1; index < slatCount; index += 1) {
      const ratio = index / slatCount
      const y = left.y + (top.y - left.y) * ratio
      ctx.beginPath()
      ctx.moveTo(left.x, y)
      ctx.lineTo(right.x, y)
      ctx.stroke()
    }
  }
}

const drawWeaponOverlay = (
  ctx: CanvasRenderingContext2D,
  runtime: GameRuntime,
  width: number,
  height: number,
  quality: QualityProfile,
) => {
  const scopeBlend = clamp(runtime.scope.visualLevel / 2, 0, 1)
  const alpha = 1 - scopeBlend * 0.9
  if (alpha <= 0.04) {
    return
  }

  const kick = runtime.aim.recoil * 900
  const offsetX = runtime.aim.yaw * 72
  const offsetY = runtime.aim.pitch * 26 + kick + scopeBlend * 110

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(
    width * 0.67 + offsetX * (1 - scopeBlend * 0.35),
    height * 0.85 + offsetY + scopeBlend * 42,
  )

  const weapon = runtime.settings.weapon
  const layout =
    weapon === 'awp'
      ? { scale: 1.08, rotation: -0.035, kickLift: 14, kickTilt: 0.022 }
      : weapon === 'ssg08'
        ? { scale: 0.95, rotation: -0.028, kickLift: 9, kickTilt: 0.016 }
        : { scale: 1.01, rotation: -0.022, kickLift: 11, kickTilt: 0.014 }

  ctx.scale(layout.scale - scopeBlend * 0.05, layout.scale - scopeBlend * 0.03)
  ctx.translate(0, scopeBlend * 26 - runtime.aim.recoil * layout.kickLift)
  ctx.rotate(layout.rotation + runtime.aim.pitch * 0.08 - runtime.aim.recoil * layout.kickTilt)

  const drawRoundedPanel = (
    x: number,
    y: number,
    panelWidth: number,
    panelHeight: number,
    radius: number,
    fillStyle: string | CanvasGradient,
    strokeStyle?: string,
  ) => {
    ctx.beginPath()
    ctx.roundRect(x, y, panelWidth, panelHeight, radius)
    ctx.fillStyle = fillStyle
    ctx.fill()
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  const drawHand = (
    x: number,
    y: number,
    handWidth: number,
    handHeight: number,
    angle: number,
  ) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)

    const glove = ctx.createLinearGradient(0, 0, 0, handHeight)
    glove.addColorStop(0, 'rgba(49, 54, 59, 0.96)')
    glove.addColorStop(1, 'rgba(16, 19, 23, 0.98)')
    drawRoundedPanel(-handWidth * 0.52, -handHeight * 0.5, handWidth, handHeight, 8, glove)

    ctx.fillStyle = 'rgba(94, 103, 112, 0.34)'
    ctx.beginPath()
    ctx.roundRect(-handWidth * 0.42, -handHeight * 0.18, handWidth * 0.84, handHeight * 0.26, 5)
    ctx.fill()

    ctx.restore()
  }

  const metalGradient = (
    x: number,
    y: number,
    h: number,
    topAlpha: number,
    bottomAlpha: number,
  ) => {
    const gradient = ctx.createLinearGradient(x, y, x, y + h)
    gradient.addColorStop(0, `rgba(186, 194, 202, ${topAlpha})`)
    gradient.addColorStop(0.45, `rgba(67, 74, 82, ${bottomAlpha * 0.72})`)
    gradient.addColorStop(1, `rgba(17, 21, 25, ${bottomAlpha})`)
    return gradient
  }

  const drawRailHighlights = (segments: Array<[number, number, number, number]>) => {
    if (quality.weaponDetailStrength <= 0) {
      return
    }

    ctx.strokeStyle = `rgba(226, 234, 239, ${0.14 * quality.weaponDetailStrength})`
    ctx.lineWidth = 1.2
    ctx.beginPath()
    for (const [x1, y1, x2, y2] of segments) {
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    ctx.stroke()
  }

  const drawAwpModel = () => {
    const body = metalGradient(0, -16, 78, 0.36, 0.96)
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.moveTo(-8, 26)
    ctx.lineTo(98, 14)
    ctx.lineTo(270, -5)
    ctx.lineTo(338, 4)
    ctx.lineTo(356, 13)
    ctx.lineTo(322, 28)
    ctx.lineTo(106, 34)
    ctx.lineTo(28, 40)
    ctx.closePath()
    ctx.fill()

    drawRoundedPanel(118, -27, 112, 26, 12, metalGradient(118, -27, 26, 0.42, 0.88))
    drawRoundedPanel(82, 6, 34, 46, 8, 'rgba(35, 30, 27, 0.96)')

    ctx.fillStyle = 'rgba(32, 25, 21, 0.98)'
    ctx.beginPath()
    ctx.moveTo(-34, 30)
    ctx.lineTo(60, 18)
    ctx.lineTo(112, 62)
    ctx.lineTo(44, 84)
    ctx.lineTo(-6, 70)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = 'rgba(25, 28, 31, 0.94)'
    ctx.beginPath()
    ctx.roundRect(244, 1, 96, 8, 4)
    ctx.fill()

    ctx.fillStyle = 'rgba(15, 17, 20, 0.95)'
    ctx.beginPath()
    ctx.roundRect(334, 2, 30, 5, 2.5)
    ctx.fill()

    drawRailHighlights([
      [18, 28, 312, 8],
      [130, -13, 217, -13],
      [90, 18, 122, 18],
    ])

    drawHand(110, 48, 34, 48, 0.18)
    drawHand(224, 23, 30, 42, 0.08)
  }

  const drawSsg08Model = () => {
    const body = metalGradient(0, -12, 66, 0.34, 0.92)
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.moveTo(18, 19)
    ctx.lineTo(114, 11)
    ctx.lineTo(242, -2)
    ctx.lineTo(304, 4)
    ctx.lineTo(326, 10)
    ctx.lineTo(300, 20)
    ctx.lineTo(114, 26)
    ctx.lineTo(40, 32)
    ctx.closePath()
    ctx.fill()

    drawRoundedPanel(132, -22, 88, 20, 10, metalGradient(132, -22, 20, 0.38, 0.82))
    drawRoundedPanel(88, 8, 25, 38, 7, 'rgba(31, 28, 24, 0.96)')

    ctx.fillStyle = 'rgba(38, 31, 24, 0.98)'
    ctx.beginPath()
    ctx.moveTo(-22, 27)
    ctx.lineTo(56, 18)
    ctx.lineTo(96, 54)
    ctx.lineTo(40, 72)
    ctx.lineTo(-2, 64)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = 'rgba(20, 23, 26, 0.94)'
    ctx.beginPath()
    ctx.roundRect(226, 2, 92, 5, 2.5)
    ctx.fill()

    ctx.fillStyle = 'rgba(14, 16, 18, 0.94)'
    ctx.beginPath()
    ctx.roundRect(314, 3, 28, 3.2, 1.6)
    ctx.fill()

    drawRailHighlights([
      [40, 22, 296, 7],
      [142, -11, 208, -11],
      [93, 17, 114, 17],
    ])

    drawHand(104, 42, 30, 42, 0.18)
    drawHand(204, 20, 24, 38, 0.06)
  }

  const drawScar20Model = () => {
    const body = metalGradient(0, -14, 82, 0.34, 0.94)
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.moveTo(14, 22)
    ctx.lineTo(108, 12)
    ctx.lineTo(224, -3)
    ctx.lineTo(274, 0)
    ctx.lineTo(312, 8)
    ctx.lineTo(318, 16)
    ctx.lineTo(286, 30)
    ctx.lineTo(110, 35)
    ctx.lineTo(38, 44)
    ctx.closePath()
    ctx.fill()

    drawRoundedPanel(118, -24, 104, 22, 9, metalGradient(118, -24, 22, 0.4, 0.86))
    drawRoundedPanel(140, 7, 42, 28, 6, 'rgba(25, 27, 30, 0.96)')
    drawRoundedPanel(182, 9, 48, 16, 4, 'rgba(32, 37, 41, 0.94)')

    ctx.fillStyle = 'rgba(29, 32, 35, 0.98)'
    ctx.beginPath()
    ctx.moveTo(92, 30)
    ctx.lineTo(124, 29)
    ctx.lineTo(140, 74)
    ctx.lineTo(116, 83)
    ctx.lineTo(88, 54)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = 'rgba(36, 30, 24, 0.97)'
    ctx.beginPath()
    ctx.moveTo(-20, 31)
    ctx.lineTo(58, 20)
    ctx.lineTo(96, 57)
    ctx.lineTo(30, 80)
    ctx.lineTo(-6, 68)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = 'rgba(19, 22, 25, 0.95)'
    ctx.beginPath()
    ctx.roundRect(216, 3, 88, 8, 4)
    ctx.fill()

    drawRailHighlights([
      [34, 24, 280, 8],
      [128, -12, 210, -12],
      [150, 15, 223, 15],
      [94, 35, 134, 35],
    ])

    drawHand(111, 47, 31, 44, 0.2)
    drawHand(206, 23, 26, 38, 0.1)
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)'
  ctx.beginPath()
  ctx.ellipse(138, 74, 160, 22, -0.06, 0, Math.PI * 2)
  ctx.fill()

  if (weapon === 'awp') {
    drawAwpModel()
  } else if (weapon === 'ssg08') {
    drawSsg08Model()
  } else {
    drawScar20Model()
  }

  ctx.restore()
}

const drawCrosshair = (
  ctx: CanvasRenderingContext2D,
  runtime: GameRuntime,
  width: number,
  height: number,
  now: number,
) => {
  const pulse =
    now >= runtime.weaponCooldownUntil
      ? 0
      : 1 - clamp((runtime.weaponCooldownUntil - now) / 180, 0, 1)
  drawCrosshairOverlay(ctx, width, height, {
    normal: runtime.settings.crosshair.normal,
    scoped: runtime.settings.crosshair.scoped,
    scopeVisualLevel: runtime.scope.visualLevel,
    cooldownPulse: pulse,
  })
}

const drawShotFeedback = (
  ctx: CanvasRenderingContext2D,
  runtime: GameRuntime,
  width: number,
  height: number,
  now: number,
) => {
  if (!runtime.shotFeedback) {
    return
  }

  const elapsed = now - runtime.shotFeedback.at
  if (elapsed > 220) {
    return
  }

  const alpha = 1 - elapsed / 220
  const centerX = width / 2
  const centerY = height / 2

  if (runtime.shotFeedback.title !== 'Missed Shot') {
    const toneColor =
      runtime.shotFeedback.tone === 'good'
        ? '140, 240, 203'
        : runtime.shotFeedback.tone === 'bonus'
          ? '126, 204, 255'
          : '255, 214, 130'
    ctx.strokeStyle = `rgba(${toneColor},${alpha})`
    ctx.lineWidth = 2
    const gap = 12
    const size = 9
    ctx.beginPath()
    ctx.moveTo(centerX - gap - size, centerY - gap - size)
    ctx.lineTo(centerX - gap, centerY - gap)
    ctx.moveTo(centerX + gap + size, centerY - gap - size)
    ctx.lineTo(centerX + gap, centerY - gap)
    ctx.moveTo(centerX - gap - size, centerY + gap + size)
    ctx.lineTo(centerX - gap, centerY + gap)
    ctx.moveTo(centerX + gap + size, centerY + gap + size)
    ctx.lineTo(centerX + gap, centerY + gap)
    ctx.stroke()
  } else {
    ctx.strokeStyle = `rgba(255, 136, 104, ${alpha * 0.7})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(centerX - 6, centerY - 6)
    ctx.lineTo(centerX + 6, centerY + 6)
    ctx.moveTo(centerX + 6, centerY - 6)
    ctx.lineTo(centerX - 6, centerY + 6)
    ctx.stroke()
  }
}

const drawSceneLayer = (
  ctx: CanvasRenderingContext2D,
  runtime: GameRuntime,
  camera: ReturnType<typeof getCameraPose>,
  width: number,
  height: number,
  quality: QualityProfile,
) => {
  drawBackground(ctx, width, height, runtime.settings.darkTheme, quality)
  drawAtmosphere(ctx, width, height, runtime.settings.darkTheme, quality)
  drawFloorAndWalls(ctx, camera, width, height, runtime.settings.darkTheme, quality)
  drawCover(ctx, camera, width, height, runtime.settings.darkTheme)

  const enemies = runtime.rep?.enemies ?? []
  if (enemies.length <= 1) {
    for (const enemy of enemies) {
      drawEnemy(ctx, camera, enemy, runtime, width, height, quality)
    }
  } else {
    const sortedEnemies = [...enemies].sort((left, right) => right.position.z - left.position.z)
    for (const enemy of sortedEnemies) {
      drawEnemy(ctx, camera, enemy, runtime, width, height, quality)
    }
  }

  drawDoors(ctx, camera, width, height, runtime.settings.darkTheme, quality)
  drawWeaponOverlay(ctx, runtime, width, height, quality)
}

export const renderScene = (canvas: HTMLCanvasElement, runtime: GameRuntime, now: number) => {
  const metrics = resizeCanvas(canvas, now)
  const context = getCachedContext(canvas)
  if (!context) {
    return
  }

  const { width, height, ratio } = metrics
  const quality = QUALITY_PROFILES[runtime.settings.graphicsQuality]
  const sceneWidth = Math.max(1, Math.round(width * quality.renderScale))
  const sceneHeight = Math.max(1, Math.round(height * quality.renderScale))
  const sceneBuffer = getSceneBuffer(canvas, sceneWidth, sceneHeight, ratio)
  if (!sceneBuffer) {
    return
  }

  sceneBuffer.context.setTransform(1, 0, 0, 1, 0, 0)
  sceneBuffer.context.clearRect(0, 0, sceneBuffer.canvas.width, sceneBuffer.canvas.height)
  sceneBuffer.context.setTransform(ratio, 0, 0, ratio, 0, 0)

  const camera = getCameraPose(runtime)
  drawSceneLayer(
    sceneBuffer.context,
    runtime,
    camera,
    sceneWidth,
    sceneHeight,
    quality,
  )

  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = true
  context.drawImage(
    sceneBuffer.canvas,
    0,
    0,
    sceneBuffer.canvas.width,
    sceneBuffer.canvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  drawCrosshair(context, runtime, width, height, now)
  drawShotFeedback(context, runtime, width, height, now)
}
