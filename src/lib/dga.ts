import { COMBUSTIBLE, GAS_KEYS, IEC_LIMITS, type Gases, type GasKey, type Scenario } from '../data/scenarios'

/** Total dissolved combustible gas: H₂ + CH₄ + C₂H₆ + C₂H₄ + C₂H₂ + CO (ppm). */
export function tdcg(g: Gases) {
  return COMBUSTIBLE.reduce((s, k) => s + g[k], 0)
}

/** Each combustible gas's share of TDCG, 0..1. */
export function tdcgShares(g: Gases): Record<Exclude<GasKey, 'CO2'>, number> {
  const total = tdcg(g) || 1
  return Object.fromEntries(COMBUSTIBLE.map((k) => [k, g[k] / total])) as Record<Exclude<GasKey, 'CO2'>, number>
}

/** Key ratios used by IEC 60599 / Rogers / Duval style interpretation. */
export function ratios(g: Gases) {
  const div = (a: number, b: number) => (b > 0 ? a / b : 0)
  return {
    CH4_H2: div(g.CH4, g.H2),
    C2H2_C2H4: div(g.C2H2, g.C2H4),
    C2H4_C2H6: div(g.C2H4, g.C2H6),
    CO2_CO: div(g.CO2, g.CO),
  }
}

/** Gases above their IEC 60599 typical limit. */
export function aboveLimits(g: Gases): GasKey[] {
  return GAS_KEYS.filter((k) => g[k] > IEC_LIMITS[k])
}

/** One live reading: every gas jitters by up to ±4% around its nominal level. */
export function jitter(nominal: Gases, rand: () => number = Math.random): Gases {
  const out = {} as Gases
  for (const k of GAS_KEYS) out[k] = nominal[k] * (1 + (rand() * 2 - 1) * 0.04)
  return out
}

/**
 * Health Index (0–100) for a live reading.
 *
 * Anchored to the scenario's score at its nominal gas levels, then nudged by how far the live
 * gases sit above or below nominal. Gases already above their IEC limit weigh more, so a
 * worsening fault gas pulls the score down hardest. With ±4% jitter this drifts by ±1–2.
 */
export function healthIndex(g: Gases, s: Scenario) {
  let num = 0
  let den = 0
  for (const k of GAS_KEYS) {
    const w = Math.max(1, s.gases[k] / IEC_LIMITS[k])
    num += w * Math.log(g[k] / s.gases[k])
    den += w
  }
  const drift = Math.max(-2, Math.min(2, Math.round((-90 * num) / den)))
  return Math.max(0, Math.min(100, s.health + drift))
}
