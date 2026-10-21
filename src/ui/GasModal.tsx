import { useEffect, useRef, useState } from 'react'
import { animate, AnimatePresence, motion } from 'framer-motion'
import { COMBUSTIBLE, GAS_INFO, IEC_LIMITS, MODEL, SCENARIOS, type GasKey } from '../data/scenarios'
import { aboveLimits, tdcg, tdcgShares } from '../lib/dga'
import { useMonitor } from '../store/useMonitor'
import { useReducedMotion } from '../lib/motion'
import { GROW_AT } from '../lib/debug'

// Same colour family as the reference bar (orange, amber, yellow, green, violet) plus teal.
const COLORS: Record<Exclude<GasKey, 'CO2'>, string> = {
  H2: '#F06A3A',
  CH4: '#F5A23A',
  C2H6: '#F5E63A',
  C2H4: '#6CD04A',
  C2H2: '#9B2CF0',
  CO: '#3AB7C8',
}

const ppm = (v: number) => (v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US'))

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-[31px] w-[31px] shrink-0 place-items-center rounded-full bg-[#BDBDBD] text-white transition hover:bg-[#a9a9a9]"
    >
      {children}
    </button>
  )
}

/** Bar grows and percentages count up from 0 over ~1.4 s once the card has faded in. */
function useGrow(open: boolean, still: boolean) {
  const [p, setP] = useState(0)
  useEffect(() => {
    if (!open) {
      setP(0)
      return
    }
    if (still || GROW_AT !== null) {
      setP(GROW_AT ?? 1)
      return
    }
    const c = animate(0, 1, { duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1], onUpdate: setP })
    return () => c.stop()
  }, [open, still])
  return p
}

function ShapRow({ feature, value }: { feature: string; value: number }) {
  const toward = value > 0
  const w = Math.min(1, Math.abs(value) / 0.8)
  return (
    <div className="grid grid-cols-[92px_1fr_44px] items-center gap-[10px] text-[12.5px]">
      <span className="font-medium text-black/80">{feature}</span>
      <span className="relative h-[10px] rounded-full bg-black/[0.05]">
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${w * 100}%`, background: toward ? '#E5483A' : '#3FAE5A' }}
        />
      </span>
      <span className={`text-right font-semibold tabular-nums ${toward ? 'text-[#C9352A]' : 'text-[#2E8F47]'}`}>
        {value > 0 ? '+' : '−'}
        {Math.abs(value).toFixed(2)}
      </span>
    </div>
  )
}

type Props = { open: boolean; onClose: () => void }

export default function GasModal({ open, onClose }: Props) {
  const still = useReducedMotion()
  const code = useMonitor((s) => s.code)
  const gases = useMonitor((s) => s.gases)
  const s = SCENARIOS[code]
  const p = useGrow(open, still)
  const card = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLDivElement>(null)

  // Esc closes; Tab is trapped inside the card; focus returns to the opener on close.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const t = setTimeout(() => closeBtn.current?.querySelector('button')?.focus(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !card.current) return
      const items = Array.from(
        card.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute('disabled'))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || !card.current.contains(document.activeElement))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || !card.current.contains(document.activeElement))) {
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

  const total = tdcg(gases)
  const shares = tdcgShares(gases)
  const over = aboveLimits(gases)
  const verdict =
    over.length === 0 ? 'All within IEC typical limits' : `${over.length} gas${over.length > 1 ? 'es' : ''} above IEC typical limits`
  const key = s.keyGas
  const duvalRight = s.duval === s.code

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="gas-modal"
          className="absolute inset-0 z-40 max-md:fixed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          transition={{ duration: 0.35 }}
        >
          {/* scene dims to ~45% and blurs slightly */}
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1.5px]" onClick={onClose} aria-hidden="true" />

          <motion.div
            ref={card}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gas-modal-title"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25 } }}
            transition={{ duration: still ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 left-1/2 top-[109px] w-[684px] -translate-x-1/2 overflow-y-auto max-md:left-[8px] max-md:right-[8px] max-md:top-[48px] max-md:w-auto max-md:translate-x-0 max-md:px-[20px] max-md:pt-[22px] overscroll-contain rounded-t-[28px] bg-white px-[40px] pb-[40px] pt-[31px] text-ink [scrollbar-width:thin]"
          >
            <div className="flex items-center gap-[15px]">
              <IconButton label="Back" onClick={onClose}>
                <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M13.5 8h-11M7 3.5 2.5 8 7 12.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconButton>
              <h2 id="gas-modal-title" className="text-[23px] font-semibold tracking-[-0.01em]">
                Dissolved gases
              </h2>
              <div ref={closeBtn} className="ml-auto">
                <IconButton label="Close" onClick={onClose}>
                  <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3 3l10 10M13 3 3 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </IconButton>
              </div>
            </div>

            <p className="mt-[16px] max-w-[290px] text-[12px] leading-[1.4] text-black/85">
              Seven gases dissolved in the transformer oil, read live every 3 seconds.
            </p>

            <div className="mt-[26px] flex items-baseline justify-between max-md:flex-col max-md:gap-[2px]">
              <h3 className="text-[15.5px] font-semibold">Total dissolved combustible gas</h3>
              <span className="text-[11.5px] text-black/80">IEC 60599 · IEEE C57.104</span>
            </div>
            <p className="mt-[6px] text-[23px] font-semibold tabular-nums tracking-[-0.01em]">{ppm(total)} ppm</p>

            {/* stacked bar: each combustible gas's share of TDCG, growing from the left */}
            <div
              className="mt-[14px] flex h-[57px] w-full overflow-hidden rounded-[3px] bg-[#EBEBEB]"
              role="img"
              aria-label={COMBUSTIBLE.map((k) => `${GAS_INFO[k].name} ${(shares[k as keyof typeof shares] * 100).toFixed(1)}%`).join(', ')}
            >
              {COMBUSTIBLE.map((k, i) => (
                <span
                  key={k}
                  className="h-full"
                  style={{
                    width: `${shares[k as keyof typeof shares] * p * 100}%`,
                    background: COLORS[k as keyof typeof COLORS],
                    boxShadow: i ? 'inset 1px 0 0 rgba(255,255,255,0.7)' : undefined,
                  }}
                />
              ))}
            </div>

            <div className="mt-[24px] grid grid-cols-6 gap-[8px] max-md:grid-cols-3 max-md:gap-y-[14px]">
              {COMBUSTIBLE.map((k) => (
                <div key={k} className="min-w-0">
                  <p className="h-[30px] text-[11.5px] leading-[1.3] text-black/85">
                    {GAS_INFO[k].name} {GAS_INFO[k].formula}
                  </p>
                  <p className="mt-[4px] flex items-center gap-[7px] text-[21px] font-medium tabular-nums tracking-[-0.01em]">
                    <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: COLORS[k as keyof typeof COLORS] }} />
                    {(shares[k as keyof typeof shares] * p * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>

            <p className={`mt-[26px] text-[15px] font-semibold ${over.length ? 'text-[#C9352A]' : ''}`}>{verdict}</p>

            <div className="mt-[20px] rounded-[16px] border border-[#E4E4E4] px-[23px] py-[22px]">
              <div className="flex items-baseline justify-between">
                <p className="text-[15px] font-semibold">
                  {GAS_INFO[key].name} · {GAS_INFO[key].formula}
                </p>
                <p className="text-[11.5px] text-black/70">IEC typical limit {IEC_LIMITS[key]} ppm</p>
              </div>
              <p className="mt-[6px] text-[23px] font-semibold tabular-nums tracking-[-0.01em]">{ppm(gases[key])} ppm</p>
            </div>

            <p className="mt-[26px] text-[15.5px] font-semibold leading-[1.55]">{s.interpretation}</p>

            <div className="mt-[28px] border-t border-black/10 pt-[24px]">
              <div className="flex items-baseline justify-between max-md:flex-col max-md:gap-[2px]">
                <h3 className="text-[15.5px] font-semibold">Why the model decided</h3>
                <span className="text-[11.5px] text-black/60">SHAP · red pushes toward {s.code}, green away</span>
              </div>
              <div className="mt-[16px] space-y-[10px]">
                {s.shap.map((d) => (
                  <ShapRow key={d.feature} {...d} />
                ))}
              </div>

              <div className="mt-[22px] grid grid-cols-2 gap-[10px] text-[12.5px]">
                <div className="rounded-[14px] bg-black/[0.04] px-[16px] py-[13px]">
                  <p className="text-black/60">Duval triangle</p>
                  <p className="mt-[3px] text-[15px] font-semibold">
                    {s.duval}{' '}
                    <span className={`text-[12px] font-medium ${duvalRight ? 'text-black/50' : 'text-[#C9352A]'}`}>
                      {duvalRight ? 'agrees' : `misses ${s.code}`}
                    </span>
                  </p>
                  <p className="mt-[2px] text-black/60">{(MODEL.duvalAccuracy * 100).toFixed(1)}% accuracy</p>
                </div>
                <div className="rounded-[14px] bg-[#FFF3E8] px-[16px] py-[13px]">
                  <p className="text-black/60">{MODEL.name}</p>
                  <p className="mt-[3px] text-[15px] font-semibold">
                    {s.code} <span className="text-[12px] font-medium text-black/50">{Math.round(s.confidence * 100)}% confidence</span>
                  </p>
                  <p className="mt-[2px] text-black/60">{(MODEL.accuracy * 100).toFixed(1)}% accuracy</p>
                </div>
              </div>
              <p className="mt-[12px] text-[11px] leading-[1.45] text-black/50">
                Sealed test set of {MODEL.testSamples} samples. Calibration cut the expected calibration error from{' '}
                {MODEL.eceBefore.toFixed(2)} to {MODEL.eceAfter.toFixed(2)}.
                {code === 'N' && ' The Duval triangle has no “healthy” zone, so it always names a fault.'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
