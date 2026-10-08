import TopBar from './ui/TopBar'
import HealthOrb from './ui/HealthOrb'
import SideCards from './ui/SideCards'

export default function App() {
  return (
    <div className="h-full px-[24px] pt-[16px]">
      <main className="panel-backdrop relative h-full overflow-hidden rounded-t-[28px]">
        <TopBar />
        <HealthOrb value={92} />
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
