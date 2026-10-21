import type { Gases, ScenarioCode } from '../data/scenarios'
import { fallbackAnswer } from './fallback'

export type ChatTurn = { role: 'user' | 'assistant'; content: string; source?: 'groq' | 'offline' }

type Ctx = { code: ScenarioCode; gases: Gases; health: number }

/**
 * Asks the Netlify Function (Groq). If it's unreachable, errors, times out or has no key,
 * answers from the rule-based fallback instead, so the demo always responds.
 */
export async function askAssistant(question: string, ctx: Ctx, history: ChatTurn[]): Promise<ChatTurn> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question,
        code: ctx.code,
        gases: ctx.gases,
        health: ctx.health,
        history: history.slice(-6).map(({ role, content }) => ({ role, content })),
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) {
      const data = (await res.json()) as { answer?: string }
      if (data.answer) return { role: 'assistant', content: data.answer, source: 'groq' }
    }
  } catch {
    // network error or timeout: fall through to the offline answer
  }
  return { role: 'assistant', content: fallbackAnswer(question, ctx.code, ctx.gases, ctx.health), source: 'offline' }
}
