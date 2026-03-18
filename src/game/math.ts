import type { Aabb, Vector3 } from './types.ts'

export interface Camera {
  position: Vector3
  yaw: number
  pitch: number
  fov: number
}

export interface ProjectedPoint {
  x: number
  y: number
  depth: number
  visible: boolean
}

export interface ProjectedBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  depth: number
  visible: boolean
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const lerp = (start: number, end: number, amount: number) =>
  start + (end - start) * amount

export const smoothstep = (min: number, max: number, value: number) => {
  const t = clamp((value - min) / (max - min || 1), 0, 1)
  return t * t * (3 - 2 * t)
}

export const average = (values: number[]) =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null

export const median = (values: number[]) => {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

export const add = (left: Vector3, right: Vector3): Vector3 => ({
  x: left.x + right.x,
  y: left.y + right.y,
  z: left.z + right.z,
})

export const subtract = (left: Vector3, right: Vector3): Vector3 => ({
  x: left.x - right.x,
  y: left.y - right.y,
  z: left.z - right.z,
})

export const scale = (vector: Vector3, amount: number): Vector3 => ({
  x: vector.x * amount,
  y: vector.y * amount,
  z: vector.z * amount,
})

export const dot = (left: Vector3, right: Vector3) =>
  left.x * right.x + left.y * right.y + left.z * right.z

export const length = (vector: Vector3) => Math.sqrt(dot(vector, vector))

export const normalize = (vector: Vector3): Vector3 => {
  const value = length(vector)
  if (value === 0) {
    return { x: 0, y: 0, z: 0 }
  }

  return scale(vector, 1 / value)
}

export const directionFromAngles = (yaw: number, pitch: number): Vector3 =>
  normalize({
    x: Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: Math.cos(yaw) * Math.cos(pitch),
  })

export const pointAt = (origin: Vector3, direction: Vector3, distance: number) =>
  add(origin, scale(direction, distance))

export const worldToCamera = (point: Vector3, camera: Camera): Vector3 => {
  const translated = subtract(point, camera.position)
  const forward = directionFromAngles(camera.yaw, camera.pitch)
  const right = normalize({
    x: Math.cos(camera.yaw),
    y: 0,
    z: -Math.sin(camera.yaw),
  })
  const up = normalize({
    x: forward.y * right.z,
    y: forward.z * right.x - forward.x * right.z,
    z: -forward.y * right.x,
  })

  return {
    x: dot(translated, right),
    y: dot(translated, up),
    z: dot(translated, forward),
  }
}

export const projectPoint = (
  point: Vector3,
  camera: Camera,
  width: number,
  height: number,
): ProjectedPoint => {
  const local = worldToCamera(point, camera)
  if (local.z <= 0.1) {
    return { x: 0, y: 0, depth: local.z, visible: false }
  }

  const focal = height / (2 * Math.tan(camera.fov / 2))
  return {
    x: width / 2 + (local.x * focal) / local.z,
    y: height / 2 - (local.y * focal) / local.z,
    depth: local.z,
    visible: true,
  }
}

export const projectAabbBounds = (
  box: Aabb,
  camera: Camera,
  width: number,
  height: number,
): ProjectedBounds => {
  const points: Vector3[] = [
    { x: box.min.x, y: box.min.y, z: box.min.z },
    { x: box.max.x, y: box.min.y, z: box.min.z },
    { x: box.min.x, y: box.max.y, z: box.min.z },
    { x: box.max.x, y: box.max.y, z: box.min.z },
    { x: box.min.x, y: box.min.y, z: box.max.z },
    { x: box.max.x, y: box.min.y, z: box.max.z },
    { x: box.min.x, y: box.max.y, z: box.max.z },
    { x: box.max.x, y: box.max.y, z: box.max.z },
  ]

  const projected = points
    .map((point) => projectPoint(point, camera, width, height))
    .filter((point) => point.visible)

  if (projected.length === 0) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      depth: 0,
      visible: false,
    }
  }

  return {
    minX: Math.min(...projected.map((point) => point.x)),
    maxX: Math.max(...projected.map((point) => point.x)),
    minY: Math.min(...projected.map((point) => point.y)),
    maxY: Math.max(...projected.map((point) => point.y)),
    depth: projected.reduce((sum, point) => sum + point.depth, 0) / projected.length,
    visible: true,
  }
}

export const intersectRayAabb = (
  origin: Vector3,
  direction: Vector3,
  box: Aabb,
) => {
  let tMin = -Infinity
  let tMax = Infinity

  const axes: Array<keyof Vector3> = ['x', 'y', 'z']

  for (const axis of axes) {
    const dir = direction[axis]
    const start = origin[axis]
    const min = box.min[axis]
    const max = box.max[axis]

    if (Math.abs(dir) < 1e-6) {
      if (start < min || start > max) {
        return null
      }
      continue
    }

    const inv = 1 / dir
    let near = (min - start) * inv
    let far = (max - start) * inv

    if (near > far) {
      ;[near, far] = [far, near]
    }

    tMin = Math.max(tMin, near)
    tMax = Math.min(tMax, far)

    if (tMin > tMax) {
      return null
    }
  }

  if (tMax < 0) {
    return null
  }

  return tMin >= 0 ? tMin : tMax
}
