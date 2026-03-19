import { DOOR_FRAME_OCCLUDERS, DOOR_PANELS, SOLID_COVER } from './constants.js'
import { intersectRayAabb, length, normalize, subtract } from './math.js'
import type {
  EnemyHitboxes,
  EnemyStance,
  HitRegion,
  Vector3,
} from './types.js'

const BODY_WIDTH = 0.56
const BODY_DEPTH = 0.38
const STAND_BODY_HEIGHT = 0.96
const CROUCH_BODY_HEIGHT = 0.78
const HEAD_SIZE = 0.32

export interface VisibilityResult {
  openVisibleFraction: number
  assistedVisibleFraction: number
  doorFraction: number
  throughDoor: boolean
  engageable: boolean
}

export interface RaycastTarget {
  id: string
  hitboxes: EnemyHitboxes
}

export interface RaycastResult {
  enemyId: string
  region: HitRegion
  wallbang: boolean
}

const buildBox = (
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
) => ({
  min: { x: minX, y: minY, z: minZ },
  max: { x: maxX, y: maxY, z: maxZ },
})

export const buildEnemyHitboxes = (
  position: Vector3,
  stance: EnemyStance,
  scale: number,
): EnemyHitboxes => {
  const halfWidth = (BODY_WIDTH * scale) / 2
  const halfDepth = (BODY_DEPTH * scale) / 2
  const bodyBase = stance === 'crouch' ? 0.28 : 0.54
  const bodyHeight =
    (stance === 'crouch' ? CROUCH_BODY_HEIGHT : STAND_BODY_HEIGHT) * scale
  const headCenterY = position.y + (stance === 'crouch' ? 1.14 : 1.56) * scale
  const headHalf = (HEAD_SIZE * scale) / 2

  return {
    body: buildBox(
      position.x - halfWidth,
      position.y + bodyBase,
      position.z - halfDepth,
      position.x + halfWidth,
      position.y + bodyBase + bodyHeight,
      position.z + halfDepth,
    ),
    head: buildBox(
      position.x - headHalf,
      headCenterY - headHalf,
      position.z - headHalf,
      position.x + headHalf,
      headCenterY + headHalf,
      position.z + headHalf,
    ),
  }
}

const sampleHitboxPoints = (hitboxes: EnemyHitboxes): Vector3[] => {
  const { body, head } = hitboxes
  const bodyMidY = (body.min.y + body.max.y) / 2
  const shoulderY = body.max.y - 0.12
  const hipY = body.min.y + 0.16
  const centerZ = (body.min.z + body.max.z) / 2
  const headCenterY = (head.min.y + head.max.y) / 2
  const headCenterZ = (head.min.z + head.max.z) / 2

  return [
    { x: (head.min.x + head.max.x) / 2, y: headCenterY, z: headCenterZ },
    { x: head.min.x + 0.05, y: headCenterY, z: headCenterZ },
    { x: head.max.x - 0.05, y: headCenterY, z: headCenterZ },
    { x: body.min.x + 0.08, y: shoulderY, z: centerZ },
    { x: body.max.x - 0.08, y: shoulderY, z: centerZ },
    { x: (body.min.x + body.max.x) / 2, y: bodyMidY, z: centerZ },
    { x: body.min.x + 0.09, y: hipY, z: centerZ },
    { x: body.max.x - 0.09, y: hipY, z: centerZ },
  ]
}

const traceToPoint = (origin: Vector3, point: Vector3) => {
  const vector = subtract(point, origin)
  const distance = length(vector)
  const direction = normalize(vector)
  let throughDoor = false
  let doorThickness = 0

  for (const cover of [...SOLID_COVER, ...DOOR_FRAME_OCCLUDERS]) {
    const hit = intersectRayAabb(origin, direction, cover)
    if (hit !== null && hit < distance - 0.02) {
      return {
        blocked: true,
        throughDoor,
        doorThickness,
      }
    }
  }

  for (const door of DOOR_PANELS) {
    const hit = intersectRayAabb(origin, direction, door)
    if (hit !== null && hit < distance - 0.02) {
      throughDoor = true
      doorThickness += door.max.z - door.min.z
    }
  }

  return {
    blocked: false,
    throughDoor,
    doorThickness,
  }
}

export const evaluateVisibility = (
  origin: Vector3,
  hitboxes: EnemyHitboxes,
): VisibilityResult => {
  const points = sampleHitboxPoints(hitboxes)
  let openVisible = 0
  let assistedVisible = 0
  let throughDoorVisible = 0

  for (const point of points) {
    const trace = traceToPoint(origin, point)
    if (!trace.blocked) {
      assistedVisible += 1
      if (trace.throughDoor) {
        throughDoorVisible += 1
      } else {
        openVisible += 1
      }
    }
  }

  const openVisibleFraction = openVisible / points.length
  const assistedVisibleFraction = assistedVisible / points.length
  const doorFraction = throughDoorVisible / points.length

  return {
    openVisibleFraction,
    assistedVisibleFraction,
    doorFraction,
    throughDoor: throughDoorVisible > 0,
    engageable: assistedVisibleFraction >= 0.1,
  }
}

const traceShot = (origin: Vector3, direction: Vector3, distance: number) => {
  let doorThickness = 0

  for (const cover of [...SOLID_COVER, ...DOOR_FRAME_OCCLUDERS]) {
    const hit = intersectRayAabb(origin, direction, cover)
    if (hit !== null && hit < distance - 0.02) {
      return {
        blocked: true,
        doorThickness,
      }
    }
  }

  for (const door of DOOR_PANELS) {
    const hit = intersectRayAabb(origin, direction, door)
    if (hit !== null && hit < distance - 0.02) {
      doorThickness += door.max.z - door.min.z
    }
  }

  return {
    blocked: false,
    doorThickness,
  }
}

export const raycastEnemyHit = (
  origin: Vector3,
  direction: Vector3,
  targets: RaycastTarget[],
  penetration: number,
): RaycastResult | null => {
  const candidates = targets
    .flatMap((target) => {
      const head = intersectRayAabb(origin, direction, target.hitboxes.head)
      const body = intersectRayAabb(origin, direction, target.hitboxes.body)
      const entries: Array<{ enemyId: string; region: HitRegion; distance: number }> =
        []

      if (head !== null) {
        entries.push({ enemyId: target.id, region: 'head', distance: head })
      }

      if (body !== null) {
        entries.push({ enemyId: target.id, region: 'body', distance: body })
      }

      return entries
    })
    .sort((left, right) => left.distance - right.distance)

  for (const candidate of candidates) {
    const trace = traceShot(origin, direction, candidate.distance)
    if (trace.blocked || trace.doorThickness > penetration) {
      continue
    }

    return {
      enemyId: candidate.enemyId,
      region: candidate.region,
      wallbang: trace.doorThickness > 0,
    }
  }

  return null
}
