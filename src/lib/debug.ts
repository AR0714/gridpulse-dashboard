/**
 * `?freeze=<seconds>` pins the 3D scene clock to that time (rotation, pulse, flicker, drift),
 * so screenshots of moving effects are deterministic. Not used in normal viewing.
 */
function readFreeze(): number | null {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('freeze')
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const FREEZE_AT = readFreeze()

/** `?grow=<0..1>` pins the gas modal's bar/percentage animation (for the mid-animation screenshot). */
function readGrow(): number | null {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('grow')
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null
}

export const GROW_AT = readGrow()
