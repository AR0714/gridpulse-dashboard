// Rule-based answers used when the assistant function is unreachable, errors, or has no key.
// Built only from the live readings and the scenario data, so the demo always answers.
import { GAS_INFO, IEC_LIMITS, MODEL, SCENARIOS, type GasKey, type Gases, type ScenarioCode } from '../data/scenarios'
import { aboveLimits, ratios } from './dga'

const fmt = (v: number) => (v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US'))
const gasText = (g: Gases, k: GasKey) => `${GAS_INFO[k].formula} ${fmt(g[k])} ppm (limit ${IEC_LIMITS[k]})`

const GAS_MEANING: Record<GasKey, string> = {
  H2: 'Hydrogen is produced by almost every fault and is the main gas of partial discharge (corona).',
  CH4: 'Methane points to low-temperature overheating of the oil (below about 300 °C) and to partial discharge.',
  C2H6: 'Ethane comes from low- to medium-temperature thermal faults in the oil.',
  C2H4: 'Ethylene marks thermal faults above about 300 °C and dominates above 700 °C.',
  C2H2: 'Acetylene only forms in quantity at very high temperatures (roughly 700–1,000 °C and above), so it is the key gas for arcing.',
  CO: 'Carbon monoxide comes from overheating or degradation of the paper (cellulose) insulation.',
  CO2: 'Carbon dioxide comes from normal ageing and overheating of the paper insulation; a CO₂/CO ratio below about 3 hints at paper overheating.',
}

const GAS_WORDS: [GasKey, RegExp][] = [
  ['C2H2', /acetylene|c2h2|c₂h₂/i],
  ['C2H4', /ethylene|c2h4|c₂h₄/i],
  ['C2H6', /ethane|c2h6|c₂h₆/i],
  ['CH4', /methane|ch4|ch₄/i],
  ['CO2', /carbon dioxide|co2|co₂/i],
  ['CO', /carbon monoxide|\bco\b/i],
  ['H2', /hydrogen|\bh2\b|h₂/i],
]

const SAFETY: Record<ScenarioCode, (g: Gases, h: number) => string> = {
  N: (g, h) =>
    `Yes. The Health Index is ${h}/100 and all seven gases are inside IEC 60599 typical limits, for example ${gasText(g, 'H2')} and ${gasText(g, 'C2H2')}. Keep it in normal service and stay on the routine schedule: next oil sample ${SCENARIOS.N.nextSample}.`,
  PD: (g) =>
    `It can stay in service for now, but not unwatched. ${gasText(g, 'H2')} is the signature of partial discharge, which slowly erodes the insulation and can grow into arcing. Re-sample the oil now and run online PD (UHF or acoustic) measurements to find the source.`,
  T1: (g) =>
    `Yes, with care. ${gasText(g, 'CH4')}, ${gasText(g, 'C2H6')} and ${gasText(g, 'CO')} point to a hot spot below 300 °C that is ageing the paper insulation. Check the loading and the cooling (fans, pumps, radiators) now and re-sample in 2 weeks.`,
  T3: (g) =>
    `Only at reduced load and under close watch. ${gasText(g, 'C2H4')} with a C₂H₄/C₂H₆ ratio of ${ratios(g).C2H4_C2H6.toFixed(1)} means a hot spot above 700 °C that can escalate. Reduce the load, sample weekly and plan an internal inspection of the core ground and connections.`,
  D2: (g) =>
    `No. ${gasText(g, 'C2H2')} and ${gasText(g, 'H2')} mean high-energy arcing inside the tank, which can lead to tank rupture or fire. De-energize and isolate the transformer now, then inspect the windings, leads, tap changer and bushings before any re-energization.`,
}

function gasAnswer(k: GasKey, code: ScenarioCode, g: Gases) {
  const s = SCENARIOS[code]
  const over = g[k] > IEC_LIMITS[k]
  const shap = s.shap.find((d) => d.feature === GAS_INFO[k].formula)
  const parts = [
    GAS_MEANING[k],
    `On UNIT-07 it is ${fmt(g[k])} ppm against an IEC 60599 typical limit of ${IEC_LIMITS[k]} ppm, so it is ${over ? `${(g[k] / IEC_LIMITS[k]).toFixed(1)}× over the limit` : 'within the limit'}.`,
  ]
  if (shap) parts.push(`It is also one of the model's top drivers here (SHAP ${shap.value > 0 ? '+' : '−'}${Math.abs(shap.value).toFixed(2)}, ${shap.value > 0 ? `pushing toward ${s.code}` : `pushing away from a fault`}).`)
  parts.push(`Next step: ${s.actions[0]}`)
  return parts.join(' ')
}

/** Answers a question from the live data alone. */
export function fallbackAnswer(question: string, code: ScenarioCode, gases: Gases, health: number) {
  const s = SCENARIOS[code]
  const q = question.toLowerCase()

  if (/safe|keep (it )?running|in service|operate|run it|energi[sz]ed|shut ?down/.test(q)) return SAFETY[code](gases, health)

  if (/acetylene|c2h2|c₂h₂/.test(q) && /why|matter|important|mean|what/.test(q)) return gasAnswer('C2H2', code, gases)

  if (/duval|xgboost|model|shap|accura|confiden|why .*decid|calibrat/.test(q)) {
    const note = code === 'N' ? ' The Duval triangle has no “healthy” zone, so on a healthy unit it still names a fault.' : ''
    return `The calibrated XGBoost model calls this ${s.code} (${s.name}) with ${Math.round(s.confidence * 100)}% confidence; the Duval triangle says ${s.duval}.${note} On the sealed ${MODEL.testSamples}-sample test set XGBoost was right ${(MODEL.accuracy * 100).toFixed(1)}% of the time against ${(MODEL.duvalAccuracy * 100).toFixed(1)}% for Duval. Its top drivers here are ${s.shap.map((d) => `${d.feature} (${d.value > 0 ? '+' : '−'}${Math.abs(d.value).toFixed(2)})`).join(', ')}. ${s.actions[0]}`
  }

  for (const [k, re] of GAS_WORDS) if (re.test(q)) return gasAnswer(k, code, gases)

  if (/health|index|score/.test(q))
    return `The Health Index is ${health}/100. It reflects the model's reading of the fault (${s.code}, ${s.name}) and moves by 1–2 points as each 3-second reading of the seven gases comes in; ${aboveLimits(gases).length} of them are above IEC typical limits right now. ${s.actions[0]}`

  if (/sample|when|next|schedule/.test(q))
    return `Next oil sample: ${s.nextSample}. That interval follows the IEEE C57.104 idea of sampling faster as gas levels and gassing rates rise. ${s.actions[0]}`

  if (/\b(should|to do|do i|do we|action|fix|maint|recommend|next step)/.test(q))
    return `For ${s.name.toLowerCase()} the recommended actions are: 1) ${s.actions[0]} 2) ${s.actions[1]} 3) ${s.actions[2]}`

  // default, and "What fault is this?"
  return `This reads as ${s.name} (${s.code}), ${Math.round(s.confidence * 100)}% model confidence, with a Health Index of ${health}/100. ${s.interpretation} First action: ${s.actions[0]}`
}

