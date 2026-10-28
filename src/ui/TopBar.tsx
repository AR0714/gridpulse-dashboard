import { useCallback, useEffect, useRef, useState } from 'react'
import SubstationProfileModal from './SubstationProfileModal'
import { useMonitor } from '../store/useMonitor'

function LogoMark() {
  // White disc with a dark winding: leads run to the rim, like the
  // branching lines in the reference mark.
  const turns = [15.5, 22, 28.5, 35]
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r="25" fill="#fff" />
      <g fill="none" stroke="#0d0b13" strokeWidth="2.6" strokeLinecap="round">
        <path d="M26 1.5V10.5" />
        <path d="M26 41.5V50.5" />
        {turns.map((y) => (
          <ellipse key={y} cx="26" cy={y} rx="11.5" ry="3.6" transform={`rotate(-14 26 ${y})`} />
        ))}
        <path d="M14.5 15.5C10 18 8.5 26 10 33" />
        <path d="M37.5 35C42 32.5 43.5 25 42 18" />
      </g>
    </svg>
  )
}

function HelpButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <div ref={ref} className="absolute left-1/2 top-[33px] -translate-x-1/2 max-md:left-auto max-md:right-[16px] max-md:top-[74px] max-md:translate-x-0">
      <button
        type="button"
        aria-label="How this works"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-[21px] w-[21px] place-items-center rounded-full border-[1.5px] border-white/85 text-[12px] font-semibold leading-none text-white/90 transition hover:border-white hover:text-white"
      >
        ?
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="How this works"
          className="absolute left-1/2 top-8 w-[320px] -translate-x-1/2 rounded-[18px] max-md:left-auto max-md:right-0 max-md:w-[300px] max-md:translate-x-0 bg-white p-5 text-[13px] leading-relaxed text-ink shadow-2xl"
        >
          <p className="mb-2 text-[15px] font-semibold">How this works</p>
          <p className="text-black/70">
            Seven gases dissolved in the transformer oil are read every 3 seconds. A calibrated
            XGBoost model classifies the fault (80.0% accuracy vs 57.1% for the Duval triangle) and
            the Health Index (0–100) summarises how far the gases sit above IEC 60599 limits.
            Sensor data is simulated.
          </p>
        </div>
      )}
    </div>
  )
}

export default function TopBar({ offset = 0 }: { offset?: number }) {
  const [showProfile, setShowProfile] = useState(false)
  const healthIndex = useMonitor((s) => s.health)
  // stable, so the modal's focus handling doesn't re-run on every 3-second reading
  const closeProfile = useCallback(() => setShowProfile(false), [])
  return (
    <header
      className="pointer-events-none absolute inset-x-0 top-0 z-20 transition-transform duration-500 ease-out"
      style={{ transform: `translateY(${offset}px)` }}
    >
      <a
        href="#"
        aria-label="gridpulse home"
        className="pointer-events-auto absolute left-[43px] top-[26px] flex items-center gap-[13px] max-md:left-[16px] max-md:top-[20px] max-md:gap-[8px] max-md:[&_svg]:h-[36px] max-md:[&_svg]:w-[36px]"
      >
        <LogoMark />
        <span className="text-[45px] font-normal leading-none tracking-[-0.025em] text-white max-md:text-[28px]">gridpulse</span>
      </a>

      <div className="pointer-events-auto">
        <HelpButton />
      </div>

      <div className="absolute right-[38px] top-[24px] flex items-center gap-[24px] max-md:right-[16px] max-md:top-[16px] max-md:gap-[10px]">
        <p className="text-right text-[33px] font-bold leading-[1.17] tracking-[-0.02em] text-white max-md:text-[17px]">
          UNIT-07
          <br />
          Substation
        </p>
        <button
          type="button"
          aria-label="Open UNIT-07 substation profile"
          aria-haspopup="dialog"
          aria-expanded={showProfile}
          onClick={() => setShowProfile(true)}
          className="pointer-events-auto h-[78px] w-[78px] shrink-0 cursor-pointer rounded-full bg-gradient-to-br from-[#ffd34a] to-[#f2a91e] p-[3px] transition-shadow duration-300 hover:shadow-[0_0_16px_rgba(255,165,0,0.5)] max-md:h-[46px] max-md:w-[46px] max-md:p-[2px]"
        >
          <img
            src="/transformer.jpg"
            alt="Substation transformer UNIT-07"
            className="h-full w-full rounded-full object-cover"
          />
        </button>
      </div>
      <SubstationProfileModal open={showProfile} onClose={closeProfile} healthIndex={healthIndex} />
    </header>
  )
}
