import { AnimatePresence, motion } from 'framer-motion'
import type { Scenario } from '../data/scenarios'

export type ActionsState = 'hidden' | 'peek' | 'open'

type Props = {
  state: ActionsState
  scenario: Scenario
  onChange: (s: ActionsState) => void
}

// ~450 ms spring, like the reference card rising from below the panel edge
const SPRING = { type: 'spring', stiffness: 330, damping: 32, mass: 1 } as const

function Chevron({ up }: { up: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className={`transition-transform duration-300 ${up ? 'rotate-180' : ''}`}>
      <path d="M8 2.5v11M3.5 9 8 13.5 12.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * White "Maintenance actions" card that slides up from below the panel's bottom edge, left of
 * the side cards (the reference's "Your Health Snapshot"). Clicking the body expands it to the
 * three actions for the current fault; the chevron button collapses it back down.
 */
export default function ActionsCard({ state, scenario, onChange }: Props) {
  const open = state === 'open'
  return (
    <motion.section
      aria-label="Maintenance actions"
      initial={false}
      animate={{ y: state === 'hidden' ? 220 : 0 }}
      transition={SPRING}
      className="absolute bottom-[-40px] right-[312px] z-10 w-[314px] rounded-[22px] bg-white text-ink shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
      style={{ pointerEvents: state === 'hidden' ? 'none' : 'auto' }}
      aria-hidden={state === 'hidden'}
    >
      <div
        role="button"
        tabIndex={state === 'hidden' ? -1 : 0}
        aria-expanded={open}
        onClick={() => onChange('open')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onChange(open ? 'peek' : 'open')
          }
        }}
        className="relative cursor-pointer rounded-[22px] px-[31px] pb-[64px] pt-[24px] outline-offset-[-3px]"
      >
        <h2 className="pr-[44px] text-[20.5px] font-semibold leading-[1.18] tracking-[-0.01em]">
          Maintenance
          <br />
          actions
        </h2>
        <p className="mt-[11px] text-[11.5px] font-semibold text-black/75">Recommendations</p>

        <AnimatePresence initial={false}>
          {open && (
            <motion.ol
              key={scenario.code}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <li className="pt-[14px] text-[11px] font-medium uppercase tracking-[0.06em] text-black/45">
                {scenario.code} · {scenario.name}
              </li>
              {scenario.actions.map((a, i) => (
                <li key={i} className="flex gap-[10px] pt-[10px] text-[13px] leading-[1.4] text-black/80">
                  <span className="mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-black/[0.06] text-[10.5px] font-semibold">
                    {i + 1}
                  </span>
                  <span>{a}</span>
                </li>
              ))}
            </motion.ol>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        aria-label={open ? 'Collapse maintenance actions' : 'Hide maintenance actions'}
        tabIndex={state === 'hidden' ? -1 : 0}
        onClick={(e) => {
          e.stopPropagation()
          onChange(open ? 'peek' : 'hidden')
        }}
        className="absolute right-[22px] top-[20px] grid h-[27px] w-[27px] place-items-center rounded-full bg-[#E6E6E6] text-ink transition hover:bg-[#d9d9d9]"
      >
        <Chevron up={false} />
      </button>
    </motion.section>
  )
}
