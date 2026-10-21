import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { askAssistant, type ChatTurn } from '../lib/askAssistant'
import { useMonitor } from '../store/useMonitor'

const CHIPS = ['What fault is this?', 'Is it safe to keep running?', 'Why does acetylene matter?']

const INTRO: ChatTurn = {
  role: 'assistant',
  content: 'Ask me about this transformer: its dissolved gases, the fault they point to, and what to do next.',
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4.1A8 8 0 1 1 20 12Z" />
      <path d="m12.6 7.8-2.4 4.4h3.4l-2.4 4.2" />
    </svg>
  )
}

function Dots() {
  return (
    <span className="inline-flex gap-[4px]" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-[6px] w-[6px] animate-bounce rounded-full bg-black/35 motion-reduce:animate-none" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  )
}

export default function Assistant() {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<ChatTurn[]>([INTRO])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => input.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role=dialog][aria-modal=true]')) {
        setOpen(false)
        button.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [turns, busy])

  const send = async (text: string) => {
    const q = text.trim().slice(0, 500)
    if (!q || busy) return
    const history = turns.filter((t) => t !== INTRO)
    setTurns((t) => [...t, { role: 'user', content: q }])
    setDraft('')
    setBusy(true)
    const { code, gases, health } = useMonitor.getState()
    const reply = await askAssistant(q, { code, gases, health }, history)
    setTurns((t) => [...t, reply])
    setBusy(false)
  }

  return (
    <>
      <div className="group absolute bottom-[40px] left-[43px] z-30">
        <button
          ref={button}
          type="button"
          aria-label="Ask about this unit"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid h-[44px] w-[44px] place-items-center rounded-full bg-glass text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:bg-[rgba(60,54,60,0.85)]"
        >
          <ChatIcon />
        </button>
        <span className="pointer-events-none absolute left-[54px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white px-[12px] py-[6px] text-[12px] font-semibold text-ink opacity-0 shadow-lg transition group-focus-within:opacity-100 group-hover:opacity-100">
          Ask about this unit
        </span>
      </div>

      <AnimatePresence>
        {open && (
          <motion.section
            aria-label="Diagnostic assistant"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'bottom left' }}
            className="absolute bottom-[96px] left-[43px] z-30 flex max-h-[min(470px,calc(100%-200px))] w-[372px] flex-col rounded-[22px] bg-white text-ink shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
          >
            <header className="flex items-start gap-[12px] px-[22px] pb-[12px] pt-[20px]">
              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Ask about UNIT-07</h2>
                <p className="mt-[2px] text-[11.5px] text-black/55">DGA assistant · IEC 60599 · IEEE C57.104</p>
              </div>
              <button
                type="button"
                aria-label="Close assistant"
                onClick={() => {
                  setOpen(false)
                  button.current?.focus()
                }}
                className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[#BDBDBD] text-white transition hover:bg-[#a9a9a9]"
              >
                <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 3l10 10M13 3 3 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div ref={list} className="min-h-[120px] flex-1 space-y-[10px] overflow-y-auto px-[22px] pb-[6px]" aria-live="polite">
              {turns.map((t, i) =>
                t.role === 'user' ? (
                  <p key={i} className="ml-auto w-fit max-w-[85%] rounded-[16px] rounded-br-[6px] bg-ink px-[13px] py-[9px] text-[13px] leading-[1.45] text-white">
                    {t.content}
                  </p>
                ) : (
                  <div key={i} className="max-w-[92%]">
                    <p className="rounded-[16px] rounded-bl-[6px] bg-[#F2F2F2] px-[13px] py-[10px] text-[13px] leading-[1.5]">{t.content}</p>
                    {t.source && (
                      <p className="mt-[4px] pl-[4px] text-[10.5px] text-black/45">
                        {t.source === 'groq' ? 'Llama 3.3 70B via Groq' : 'Offline answer from the scenario data'}
                      </p>
                    )}
                  </div>
                ),
              )}
              {busy && (
                <div className="w-fit rounded-[16px] rounded-bl-[6px] bg-[#F2F2F2] px-[14px] py-[12px]">
                  <Dots />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-[6px] px-[22px] pt-[10px]">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={busy}
                  onClick={() => send(c)}
                  className="rounded-full border border-black/12 px-[11px] py-[6px] text-[12px] font-medium text-black/75 transition hover:border-black/30 hover:text-black disabled:opacity-50"
                >
                  {c}
                </button>
              ))}
            </div>

            <form
              className="flex items-center gap-[8px] px-[16px] pb-[16px] pt-[12px]"
              onSubmit={(e) => {
                e.preventDefault()
                send(draft)
              }}
            >
              <label htmlFor="assistant-input" className="sr-only">
                Your question
              </label>
              <input
                id="assistant-input"
                ref={input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                placeholder="Ask about the gases, the fault, the next step…"
                autoComplete="off"
                className="h-[40px] min-w-0 flex-1 rounded-full bg-[#F2F2F2] px-[16px] text-[13px] text-ink outline-none placeholder:text-black/40 focus-visible:ring-2 focus-visible:ring-[#E8704A]"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={busy || !draft.trim()}
                className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-black disabled:opacity-40"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  )
}
