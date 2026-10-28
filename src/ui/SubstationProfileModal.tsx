import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useMonitor } from '../store/useMonitor'
import type { ScenarioCode } from '../data/scenarios'

// Hero image: a wide crop of the substation transformer photo (also used for the avatar).
const HERO_SRC = '/substation-hero.jpg'

// Nameplate data for the (simulated) unit.
const STATS: [icon: string, label: string, value: string][] = [
  ['⚡', 'Voltage Level', '132 / 33 kV'],
  ['🏭', 'Transformer Capacity', '2 × 40 MVA'],
  ['📅', 'Commissioned', '2009'],
  ['🌡️', 'Ambient Temp', '38 °C'],
  ['📍', 'Location', 'Bhubaneswar, Odisha'],
  ['🔧', 'Last Inspection', '14 Oct 2026'],
]

// The status follows the live fault, so it never says "operational" during arcing.
const STATUS: Record<ScenarioCode, { label: string; color: string }> = {
  N: { label: 'OPERATIONAL', color: '#4ADE80' },
  PD: { label: 'MONITOR', color: '#FBBF24' },
  T1: { label: 'MONITOR', color: '#FBBF24' },
  T3: { label: 'ALERT', color: '#FB923C' },
  D2: { label: 'CRITICAL', color: '#F87171' },
}

export interface SubstationProfileModalProps {
  open: boolean
  onClose: () => void
  healthIndex: number // live 0–100 value from the dashboard
}

/** Glassmorphism profile card for UNIT-07, opened from the avatar in the top bar. */
export default function SubstationProfileModal({ open, onClose, healthIndex }: SubstationProfileModalProps) {
  const code = useMonitor((s) => s.code)
  const status = STATUS[code]
  const panel = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  // Escape closes; focus starts on the close button, stays inside the card, and returns to the
  // avatar when the card closes.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const t = setTimeout(() => closeBtn.current?.focus(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey, true)
      opener?.focus?.()
    }
  }, [open, onClose])

  const pct = Math.max(0, Math.min(100, Math.round(healthIndex)))

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="substation-profile"
          className="fixed inset-0 grid place-items-center p-[16px]"
          style={{ zIndex: 9999 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* backdrop: a click anywhere outside the card closes it */}
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="UNIT-07 Substation Profile"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative max-h-[calc(100dvh-32px)] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-[20px] border border-[rgba(255,160,0,0.25)] bg-[rgba(10,10,20,0.92)] text-white shadow-[0_0_60px_rgba(255,120,0,0.15)] backdrop-blur-[24px]"
          >
            <div className="relative h-[200px] w-full overflow-hidden rounded-t-[20px] bg-gradient-to-br from-[#1a0a00] via-[#2d1500] to-[#1a0a00]">
              <img src={HERO_SRC} alt="UNIT-07 substation transformer" className="h-full w-full object-cover object-top" />
              <div className="absolute inset-x-0 bottom-0 h-[70px] bg-gradient-to-t from-[rgba(10,10,20,0.92)] to-transparent" aria-hidden="true" />
            </div>

            <div className="px-[22px] pb-[18px] pt-[16px]">
              <div className="flex items-start justify-between gap-[12px]">
                <div>
                  <h2 className="text-[22px] font-bold leading-tight tracking-[-0.01em]">UNIT-07</h2>
                  <p className="mt-[2px] text-[12px] text-white/60">Odisha State Transmission Substation</p>
                </div>
                <span className="mt-[4px] inline-flex items-center gap-[6px] text-[11px] font-semibold tracking-[0.04em]" style={{ color: status.color }}>
                  <span className="h-[7px] w-[7px] animate-pulse rounded-full motion-reduce:animate-none" style={{ background: status.color }} />
                  {status.label}
                </span>
              </div>

              <dl className="mt-[16px] grid grid-cols-2 gap-[8px] max-[420px]:grid-cols-1">
                {STATS.map(([icon, label, value]) => (
                  <div key={label} className="rounded-[10px] bg-white/[0.04] px-[14px] py-[10px]">
                    <dt className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#FFA500]/70">
                      <span aria-hidden="true">{icon} </span>
                      {label}
                    </dt>
                    <dd className="mt-[2px] text-[13.5px] font-medium text-white">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-[16px]">
                <div className="mb-[6px] flex items-center justify-between text-[12px] text-white/65">
                  <span>Overall Health Index</span>
                  <span className="font-semibold tabular-nums text-[#FFA500]">{pct}%</span>
                </div>
                <div
                  className="h-[6px] overflow-hidden rounded-full bg-white/[0.08]"
                  role="progressbar"
                  aria-label="Overall Health Index"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#f97316] to-[#fbbf24]"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                  />
                </div>
              </div>

              <div className="mt-[18px] flex items-center justify-between gap-[12px] border-t border-white/[0.06] pt-[14px]">
                <p className="text-[11.5px] text-white/45">DGA monitoring active — IEC 60599</p>
                <button
                  ref={closeBtn}
                  type="button"
                  aria-label="Close substation profile"
                  onClick={onClose}
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border border-white/15 text-white/80 transition hover:border-[#FFA500] hover:text-white"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3 3l10 10M13 3 3 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
