import { useEffect } from 'react'
import { SCENARIOS, SCENARIO_ORDER } from '../data/scenarios'
import { useMonitor } from '../store/useMonitor'

/** Five tiny pills under the orb (N · PD · T1 · T3 · D2). Keys 1–5 switch too. */
export default function ScenarioSwitch() {
  const code = useMonitor((s) => s.code)
  const setScenario = useMonitor((s) => s.setScenario)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      const i = Number(e.key) - 1
      if (i >= 0 && i < SCENARIO_ORDER.length) setScenario(SCENARIO_ORDER[i])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setScenario])

  return (
    <div
      role="radiogroup"
      aria-label="Fault scenario (keys 1 to 5)"
      className="absolute left-[358px] top-[calc(57%+212px)] z-10 flex -translate-x-1/2 items-center gap-[6px]"
    >
      {SCENARIO_ORDER.map((c, i) => {
        const active = c === code
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            aria-keyshortcuts={String(i + 1)}
            title={`${SCENARIOS[c].name} (${i + 1})`}
            onClick={() => setScenario(c)}
            className={`rounded-full border px-[10px] py-[4px] text-[11px] font-medium leading-none tracking-[0.02em] transition-colors duration-300 [text-shadow:0_1px_6px_rgba(0,0,0,0.9)] ${
              active ? 'border-white/45 bg-black/25 text-white' : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            {c}
          </button>
        )
      })}
    </div>
  )
}
