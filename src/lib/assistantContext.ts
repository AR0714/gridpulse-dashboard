// Shared by the browser (offline answers) and the Netlify Function (Groq prompt).
// Pure TypeScript, no DOM, so the function bundle can import it.
import { GAS_INFO, GAS_KEYS, IEC_LIMITS, MODEL, SCENARIOS, SCENARIO_ORDER, type Gases, type ScenarioCode } from '../data/scenarios'
import { aboveLimits, ratios, tdcg } from './dga'

export const SYSTEM_PROMPT = [
  'You are a transformer DGA (dissolved gas analysis) diagnostics assistant for a substation power transformer, UNIT-07.',
  'Base every answer on IEC 60599:2022 and IEEE C57.104-2019 and on the live unit data below.',
  'Answer in 2 to 4 plain sentences. Quote the actual ppm values from the data.',
  'Always end with one concrete maintenance action.',
  'If the question is not about this transformer, its oil, its gases or its maintenance, say briefly that you can only help with this unit.',
  'Never invent readings that are not in the data. The sensor data is simulated for a demo.',
].join(' ')

export type AssistantPayload = {
  question: string
  code: ScenarioCode
  gases: Gases
  health: number
  history?: { role: 'user' | 'assistant'; content: string }[]
}

const fmt = (v: number) => (v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US'))

/** Plain-text summary of the live unit state, appended to the system prompt. */
export function buildContext(code: ScenarioCode, gases: Gases, health: number) {
  const s = SCENARIOS[code]
  const over = aboveLimits(gases)
  const r = ratios(gases)
  const lines = [
    `Unit: UNIT-07 substation transformer. Health Index ${health}/100.`,
    `Model diagnosis (${MODEL.name}): ${s.code} – ${s.name}, confidence ${Math.round(s.confidence * 100)}%.`,
    `Duval triangle says: ${s.duval}. Accuracy on the sealed ${MODEL.testSamples}-sample test set: XGBoost ${(MODEL.accuracy * 100).toFixed(1)}%, Duval ${(MODEL.duvalAccuracy * 100).toFixed(1)}%.`,
    'Live gases (ppm, with IEC 60599 typical limit):',
    ...GAS_KEYS.map((k) => `- ${GAS_INFO[k].name} ${GAS_INFO[k].formula}: ${fmt(gases[k])} (limit ${IEC_LIMITS[k]})${gases[k] > IEC_LIMITS[k] ? ' ABOVE LIMIT' : ''}`),
    `TDCG: ${fmt(tdcg(gases))} ppm. Gases above limits: ${over.length ? over.map((k) => GAS_INFO[k].formula).join(', ') : 'none'}.`,
    `Ratios: CH4/H2 ${r.CH4_H2.toFixed(2)}, C2H2/C2H4 ${r.C2H2_C2H4.toFixed(2)}, C2H4/C2H6 ${r.C2H4_C2H6.toFixed(2)}, CO2/CO ${r.CO2_CO.toFixed(1)}.`,
    `Top SHAP drivers: ${s.shap.map((d) => `${d.feature} ${d.value > 0 ? '+' : ''}${d.value.toFixed(2)}`).join(', ')} (positive pushes toward ${s.code}).`,
    `Interpretation: ${s.interpretation}`,
    `Recommended actions: ${s.actions.join(' ')}`,
    `Next oil sample: ${s.nextSample}. Fleet risk score (probability × severity): ${s.fleetRisk}.`,
  ]
  return lines.join('\n')
}

/** Validates an untrusted request body. Returns a clean payload or an error message. */
export function parsePayload(raw: unknown): AssistantPayload | string {
  if (!raw || typeof raw !== 'object') return 'Body must be a JSON object.'
  const b = raw as Record<string, unknown>
  const question = typeof b.question === 'string' ? b.question.trim() : ''
  if (!question) return 'Missing question.'
  if (question.length > 500) return 'Question is too long (500 characters max).'
  const code = SCENARIO_ORDER.find((c) => c === b.code)
  if (!code) return 'Unknown scenario code.'
  const g = b.gases as Record<string, unknown> | undefined
  if (!g || typeof g !== 'object') return 'Missing gases.'
  const gases = {} as Gases
  for (const k of GAS_KEYS) {
    const v = g[k]
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1e6) return `Invalid value for ${k}.`
    gases[k] = v
  }
  const health = typeof b.health === 'number' && Number.isFinite(b.health) ? Math.round(Math.min(100, Math.max(0, b.health))) : SCENARIOS[code].health
  const history: AssistantPayload['history'] = []
  if (Array.isArray(b.history)) {
    for (const m of b.history.slice(-6)) {
      if (!m || typeof m !== 'object') continue
      const { role, content } = m as Record<string, unknown>
      if ((role === 'user' || role === 'assistant') && typeof content === 'string' && content.trim()) {
        history.push({ role, content: content.slice(0, 800) })
      }
    }
  }
  return { question, code, gases, health, history }
}
