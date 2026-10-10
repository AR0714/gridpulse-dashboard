import { useEffect, useState } from 'react'
import Scene from './scene/Scene'
import TopBar from './ui/TopBar'
import HealthOrb from './ui/HealthOrb'
import SideCards from './ui/SideCards'

/** Placeholder live drift (±2 around the healthy score). Phase 5 derives it from the gases. */
function useHealthDrift(base: number) {
  const [value, setValue] = useState(base)
  useEffect(() => {
    const id = setInterval(() => setValue(base + Math.round(Math.random() * 4 - 2)), 3200)
    return () => clearInterval(id)
  }, [base])
  return value
}

export default function App() {
  const health = useHealthDrift(92)
  return (
    <div className="h-full px-[24px] pt-[16px]">
      <main className="relative h-full overflow-hidden rounded-t-[28px] bg-transparent">
        <Scene style={{ position: 'absolute', inset: 0 }} />
        <TopBar />
        <HealthOrb value={health} />
        <SideCards nextSample="in 12 days" diagnosis="N · Healthy" />
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
