import type { ScenarioCode } from '../data/scenarios'
import { REFERENCE_FLAME, type FlameLook } from '../ui/flameRing'

type RGB = [number, number, number]

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export type PulseLook = {
  period: number // seconds per pass
  gain: number
  tail: number // comet-tail length (helix-parameter units)
  stutter: number // 0..1: stalls, gain flicker and jumps (arcing)
}

export type CoilLook = {
  tint: RGB // multiplies the copper colour
  corona: number // 0..1 random spark points flashing on the coil
  coronaColor: RGB
  coronaRate: number // flashes per second per slot
}

export type VisualLook = { flame: FlameLook; pulse: PulseLook; coil: CoilLook }

const NO_CORONA = { corona: 0, coronaColor: hex('#BFD8FF'), coronaRate: 1 }

export const LOOKS: Record<ScenarioCode, VisualLook> = {
  // calm amber-gold edge, slow soft flicker, slow smooth pulse, warm copper
  N: {
    flame: { ...REFERENCE_FLAME, colDeep: hex('#3E2A0C'), colMid: hex('#E2A444'), colHot: hex('#FFF2D2'), intensity: 0.72, speed: 0.42, reach: 30 },
    pulse: { period: 2.5, gain: 1, tail: 0.075, stutter: 0 },
    coil: { tint: [1, 1, 1], ...NO_CORONA },
  },
  // blue-white corona sparks popping off the orb edge and the coil
  PD: {
    flame: { ...REFERENCE_FLAME, colDeep: hex('#40220C'), colMid: hex('#D8802E'), colHot: hex('#F2F6FF'), intensity: 0.9, speed: 0.8, reach: 40, sparks: 1 },
    pulse: { period: 2.2, gain: 1, tail: 0.07, stutter: 0 },
    coil: { tint: [0.97, 0.98, 1.02], corona: 1, coronaColor: hex('#9CC6FF'), coronaRate: 1.4 },
  },
  // orange flame tendrils like the reference, medium flicker
  T1: {
    flame: { ...REFERENCE_FLAME },
    pulse: { period: 2.0, gain: 1.1, tail: 0.075, stutter: 0 },
    coil: { tint: [1.02, 0.97, 0.92], ...NO_CORONA },
  },
  // hotter: yellow-white inner rim, faster flicker, bigger tendrils, faster brighter pulse
  T3: {
    flame: { ...REFERENCE_FLAME, colDeep: hex('#6A2A06'), colMid: hex('#F08A2A'), colHot: hex('#FFF7DE'), intensity: 1.2, speed: 1.6, reach: 58, hotRim: 0.7 },
    pulse: { period: 1.4, gain: 1.4, tail: 0.09, stutter: 0 },
    coil: { tint: [1.1, 1.0, 0.85], ...NO_CORONA },
  },
  // red-orange edge with jagged arcs; fast stuttering pulse with random bright discharges
  D2: {
    flame: { ...REFERENCE_FLAME, colDeep: hex('#5A0804'), colMid: hex('#E83A1A'), colHot: hex('#FFD8B8'), intensity: 1.3, speed: 2.0, reach: 52, arcs: 1 },
    pulse: { period: 0.9, gain: 1.6, tail: 0.06, stutter: 1 },
    coil: { tint: [1.15, 0.72, 0.58], corona: 1, coronaColor: hex('#FFE2C4'), coronaRate: 3 },
  },
}

/** Deep copy so a blended "current" look can be mutated in place. */
export function cloneLook(l: VisualLook): VisualLook {
  return structuredClone(l)
}

/** Blend factor for exponential easing: ~95% of the way in `seconds`, whatever the frame rate. */
export function easeFactor(dt: number, seconds = 1) {
  return 1 - Math.exp((-3 * dt) / seconds)
}

/** Move every number (and colour channel) of `cur` toward `target` by factor k, in place. */
export function blendInto<T extends object>(cur: T, target: T, k: number) {
  for (const key of Object.keys(target) as (keyof T)[]) {
    const tv = target[key] as unknown
    const cv = cur[key] as unknown
    if (typeof tv === 'number') (cur as Record<keyof T, number>)[key] = (cv as number) + (tv - (cv as number)) * k
    else if (Array.isArray(tv)) for (let i = 0; i < tv.length; i++) (cv as number[])[i] += (tv[i] - (cv as number[])[i]) * k
    else if (tv && typeof tv === 'object') blendInto(cv as object, tv as object, k)
  }
}
