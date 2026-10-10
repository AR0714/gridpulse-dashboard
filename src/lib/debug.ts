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
