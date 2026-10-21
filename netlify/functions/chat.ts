// Netlify Function (v2): POST /api/chat → Groq chat completion.
// The Groq key is read from the server environment and never sent to the browser.
// The browser sends only the question, the scenario code and the live gas readings; the
// prompt context is rebuilt here from the project's own scenario data.
import { SYSTEM_PROMPT, buildContext, parsePayload } from '../../src/lib/assistantContext'

declare const process: { env: Record<string, string | undefined> }

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'
const MAX_BODY = 8_000 // bytes

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' })

  const text = await req.text()
  if (text.length > MAX_BODY) return json(413, { error: 'Request too large.' })
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return json(400, { error: 'Body must be JSON.' })
  }
  const p = parsePayload(raw)
  if (typeof p === 'string') return json(400, { error: p })

  const key = process.env.GROQ_API_KEY
  // Not an error for the page: it answers from its offline rules instead (and nothing red in the console).
  if (!key) return json(200, { answer: null, configured: false })

  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\nLive unit data:\n${buildContext(p.code, p.gases, p.health)}` },
    ...(p.history ?? []),
    { role: 'user', content: p.question },
  ]

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.3, max_tokens: 320 }),
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) {
      // Don't echo the upstream body: it can contain account details.
      console.error('Groq error', res.status)
      return json(502, { error: `Upstream error (${res.status}).` })
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const answer = data.choices?.[0]?.message?.content?.trim()
    if (!answer) return json(502, { error: 'Empty answer from the model.' })
    return json(200, { answer, source: 'groq', model: MODEL })
  } catch (e) {
    console.error('Groq request failed', e instanceof Error ? e.name : e)
    return json(504, { error: 'The model did not answer in time.' })
  }
}

export const config = { path: '/api/chat' }
