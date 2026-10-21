import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import TopBar from './ui/TopBar'
import HealthOrb from './ui/HealthOrb'
import SideCards from './ui/SideCards'
import ScenarioSwitch from './ui/ScenarioSwitch'
import AlertStrip, { ALERT_HEIGHT } from './ui/AlertStrip'
import ActionsCard, { type ActionsState } from './ui/ActionsCard'
import GasModal from './ui/GasModal'
import Assistant from './ui/Assistant'
import SceneBoundary from './ui/SceneBoundary'
import { SCENARIOS } from './data/scenarios'
import { LOOKS } from './lib/looks'
import { startLiveFeed, useMonitor } from './store/useMonitor'
import { MOBILE_QUERY, useMediaQuery } from './lib/motion'

// three.js + postprocessing are the heavy part of the bundle: load them after the UI paints.
const Scene = lazy(() => import('./scene/Scene'))

export default function App() {
  const code = useMonitor((s) => s.code)
  const health = useMonitor((s) => s.health)
  const scenario = SCENARIOS[code]
  const critical = code === 'D2'

  const [modalOpen, setModalOpen] = useState(false)
  const [actions, setActions] = useState<ActionsState>('hidden')
  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])
  // On phones the actions card sits in the stacked layout, so it is never fully hidden.
  const mobile = useMediaQuery(MOBILE_QUERY)
  const actionsShown: ActionsState = mobile && actions === 'hidden' ? 'peek' : actions
  const changeActions = useCallback((s: ActionsState) => setActions(mobile && s === 'hidden' ? 'peek' : s), [mobile])

  useEffect(() => startLiveFeed(), [])

  // The maintenance card rises on its own 4 s after load, like the reference recording.
  useEffect(() => {
    const id = setTimeout(() => setActions((a) => (a === 'hidden' ? 'peek' : a)), 4000)
    return () => clearTimeout(id)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
    <div className="h-full px-[24px] pt-[16px] max-md:h-auto max-md:min-h-full max-md:p-[10px]">
      <main className="relative h-full overflow-clip rounded-t-[28px] bg-[#0b0b16] max-md:flex max-md:h-auto max-md:min-h-[calc(100dvh-20px)] max-md:flex-col max-md:gap-[12px] max-md:rounded-[24px] max-md:px-[14px] max-md:pb-[18px] max-md:pt-[432px]">
        <SceneBoundary>
          <Suspense fallback={<div className="scene-fallback absolute inset-0" aria-hidden="true" />}>
            <Scene className="absolute inset-0 max-md:bottom-auto max-md:h-[560px] max-md:opacity-70 max-md:[mask-image:linear-gradient(#000_65%,transparent)]" />
          </Suspense>
        </SceneBoundary>
        <AlertStrip show={critical} />
        <TopBar offset={critical ? ALERT_HEIGHT - 8 : 0} />
        <HealthOrb value={health} look={LOOKS[code].flame} onOpen={openModal} />
        <ScenarioSwitch />
        <ActionsCard state={actionsShown} scenario={scenario} onChange={changeActions} />
        <SideCards
          nextSample={scenario.nextSample}
          diagnosis={scenario.pill}
          critical={critical}
          onNextSample={() => setActions((a) => (a === 'hidden' ? 'peek' : 'open'))}
          onDiagnosis={openModal}
        />
        <footer className="absolute bottom-[14px] left-[43px] z-10 text-[11px] text-white/40 max-md:static max-md:order-3 max-md:px-[4px] max-md:pb-[52px] max-md:pt-[4px] max-md:text-center max-md:leading-[1.6]">
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
        <Assistant />
        <GasModal open={modalOpen} onClose={closeModal} />
      </main>
    </div>
    </MotionConfig>
  )
}
