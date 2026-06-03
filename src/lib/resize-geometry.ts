/**
 * Rotation-aware resize geometry.
 *
 * When an element is rotated, dragging a corner handle must keep the OPPOSITE
 * corner anchored in screen space while the resize delta is interpreted along
 * the element's own (rotated) axes. This pure helper encapsulates that math so
 * it can be unit-tested independently of the React component.
 */

export interface ResizeInput {
  /** Corner being dragged: one of 'nw' | 'ne' | 'sw' | 'se'. */
  handle: string
  origX: number
  origY: number
  origW: number
  origH: number
  /** Element rotation in degrees (pivots around the element center). */
  rotation: number
  /** Pointer delta since drag start, in canvas units (already divided by zoom). */
  rawDx: number
  rawDy: number
  /** When true, preserve the original aspect ratio (Shift-resize). */
  lockAspect?: boolean
  /** Minimum width/height. */
  minSize?: number
}

export interface ResizeResult {
  x: number
  y: number
  w: number
  h: number
}

export function computeRotatedResize(input: ResizeInput): ResizeResult {
  const { handle, origX, origY, origW, origH, rotation, rawDx, rawDy } = input
  const minSize = input.minSize ?? 20

  const rot = (rotation * Math.PI) / 180
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  // s = 1 → local→world (rotate by +θ); s = -1 → world→local (rotate by -θ).
  const rotate = (px: number, py: number, s: number) => ({
    x: px * cos - py * (s * sin),
    y: px * (s * sin) + py * cos,
  })

  // Sign of the dragged corner in local space (e=+x, w=-x, s=+y, n=-y).
  const hx = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0
  const hy = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0
  // The opposite corner is the fixed anchor.
  const ax = -hx
  const ay = -hy

  // Anchor world position from the ORIGINAL geometry.
  const cx0 = origX + origW / 2
  const cy0 = origY + origH / 2
  const a0 = rotate((ax * origW) / 2, (ay * origH) / 2, 1)
  const anchorWX = cx0 + a0.x
  const anchorWY = cy0 + a0.y

  // Project the pointer delta into the element's local axes.
  const local = rotate(rawDx, rawDy, -1)

  let newW = Math.max(minSize, origW + hx * local.x)
  let newH = Math.max(minSize, origH + hy * local.y)

  // Aspect lock only meaningful on corner handles (both axes active).
  if (input.lockAspect && hx !== 0 && hy !== 0) {
    const aspect = origW / origH
    if (Math.abs(newW / origW - 1) > Math.abs(newH / origH - 1)) newH = newW / aspect
    else newW = newH * aspect
    newW = Math.max(minSize, newW)
    newH = Math.max(minSize, newH)
  }

  // Recompute the center so the anchor corner stays put in world space.
  const aN = rotate((ax * newW) / 2, (ay * newH) / 2, 1)
  const cxN = anchorWX - aN.x
  const cyN = anchorWY - aN.y

  return { x: cxN - newW / 2, y: cyN - newH / 2, w: newW, h: newH }
}

// ── Multi-select (group) resize ──

export interface GroupResizeBox { x: number; y: number; w: number; h: number }
export interface GroupResizeEl { id: string; x: number; y: number; w: number; h: number }

export interface GroupResizeInput {
  handle: string
  /** Union bounding box of the selection at drag start. */
  box: GroupResizeBox
  /** Selected elements' geometry at drag start. */
  els: GroupResizeEl[]
  /** Pointer delta since drag start, in canvas units. */
  rawDx: number
  rawDy: number
  minScale?: number
}

/**
 * Axis-aligned group resize: scale every selected element about the corner of
 * the bounding box opposite the dragged handle, preserving relative layout.
 */
export function computeGroupResize(input: GroupResizeInput): GroupResizeEl[] {
  const { handle, box, els, rawDx, rawDy } = input
  const minScale = input.minScale ?? 0.05

  // Anchor = corner opposite the dragged handle.
  const anchorX = handle.includes('w') ? box.x + box.w : box.x
  const anchorY = handle.includes('n') ? box.y + box.h : box.y

  // New bounding-box dimensions from the pointer delta.
  let newW = box.w + (handle.includes('e') ? rawDx : handle.includes('w') ? -rawDx : 0)
  let newH = box.h + (handle.includes('s') ? rawDy : handle.includes('n') ? -rawDy : 0)
  newW = Math.max(box.w * minScale, newW)
  newH = Math.max(box.h * minScale, newH)

  const sx = box.w === 0 ? 1 : newW / box.w
  const sy = box.h === 0 ? 1 : newH / box.h

  return els.map((el) => ({
    id: el.id,
    x: anchorX + (el.x - anchorX) * sx,
    y: anchorY + (el.y - anchorY) * sy,
    w: el.w * sx,
    h: el.h * sy,
  }))
}
