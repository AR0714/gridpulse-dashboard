import { useEffect } from 'react'
import Scene from './scene/Scene'
import TopBar from './ui/TopBar'
import HealthOrb from './ui/HealthOrb'
import SideCards from './ui/SideCards'
import ScenarioSwitch from './ui/ScenarioSwitch'
import AlertStrip, { ALERT_HEIGHT } from './ui/AlertStrip'
import { SCENARIOS } from './data/scenarios'
import { LOOKS } from './lib/looks'
import { startLiveFeed, useMonitor } from './store/useMonitor'

export default function App() {
  const code = useMonitor((s) => s.code)
  const health = useMonitor((s) => s.health)
  const scenario = SCENARIOS[code]
  const critical = code === 'D2'

  useEffect(() => startLiveFeed(), [])

  return (
    <div className="h-full px-[24px] pt-[16px]">
      <main className="relative h-full overflow-hidden rounded-t-[28px] bg-transparent">
        <Scene style={{ position: 'absolute', inset: 0 }} />
        <AlertStrip show={critical} />
        <TopBar offset={critical ? ALERT_HEIGHT - 8 : 0} />
        <HealthOrb value={health} look={LOOKS[code].flame} />
        <ScenarioSwitch />
        <SideCards nextSample={scenario.nextSample} diagnosis={scenario.pill} critical={critical} />
        <footer className="absolute bottom-[14px] left-[43px] z-10 text-[11px] text-white/40">
          Simulated sensor data · Calibrated XGBoost, 80% accuracy on sealed test set ·{' '}
          <a
            href="https://github.com/AR0714/transformer-health-dga"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:text-white/70 hover:underline"
          >
            GitHub
          </a>
        </footer>
      </main>
    </div>
  )
}
