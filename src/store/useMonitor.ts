import { create } from 'zustand'
import { SCENARIOS, SCENARIO_ORDER, type Gases, type ScenarioCode } from '../data/scenarios'
import { healthIndex, jitter } from '../lib/dga'
import { FREEZE_AT } from '../lib/debug'

export const READ_INTERVAL_MS = 3000

type MonitorState = {
  code: ScenarioCode
  gases: Gases // live reading
  health: number // live Health Index
  readAt: number // timestamp of the last reading
  setScenario: (code: ScenarioCode) => void
  read: () => void
}

/** `?scenario=D2` opens straight into a fault (handy for screenshots and sharing links). */
function initialCode(): ScenarioCode {
  if (typeof window === 'undefined') return 'N'
  const q = new URLSearchParams(window.location.search).get('scenario')?.toUpperCase()
  return SCENARIO_ORDER.find((c) => c === q) ?? 'N'
}

const start = initialCode()

export const useMonitor = create<MonitorState>((set, get) => ({
  code: start,
  gases: { ...SCENARIOS[start].gases },
  health: SCENARIOS[start].health,
  readAt: Date.now(),
  setScenario: (code) => {
    if (code === get().code) return
    const s = SCENARIOS[code]
    set({ code, gases: { ...s.gases }, health: s.health, readAt: Date.now() })
  },
  read: () => {
    // Frozen screenshots keep the nominal values so they're reproducible.
    if (FREEZE_AT !== null) return
    const s = SCENARIOS[get().code]
    const gases = jitter(s.gases)
    set({ gases, health: healthIndex(gases, s), readAt: Date.now() })
  },
}))

/** Start the live sensor feed (one reading every 3 s). Returns a stop function. */
export function startLiveFeed() {
  const id = window.setInterval(() => useMonitor.getState().read(), READ_INTERVAL_MS)
  return () => window.clearInterval(id)
}
