import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createFlameRing, REFERENCE_FLAME, type FlameLook } from './flameRing'
import { useReducedMotion } from '../lib/motion'
import { FREEZE_AT } from '../lib/debug'

const DISC = 336 // black disc diameter, CSS px
const PAD = 100 // room around the disc for tendrils and glow
const STEP_MS = 150 // one integer per step when the score changes

/** Walks the displayed value toward the target one integer at a time. */
function useTicker(target: number, instant: boolean) {
  const [shown, setShown] = useState(target)
  const dir = useRef(0)
  useEffect(() => {
    if (instant) {
      setShown(target)
      return
    }
    if (shown === target) return
    const id = setTimeout(() => {
      dir.current = target > shown ? 1 : -1
      setShown((s) => s + (target > s ? 1 : -1))
    }, STEP_MS)
    return () => clearTimeout(id)
  }, [shown, target, instant])
  return { shown, dir: dir.current }
}

function TickingNumber({ value, still }: { value: number; still: boolean }) {
  const { shown, dir } = useTicker(value, still)
  const digits = String(shown).split('')
  return (
    <span className="relative inline-flex tabular-nums" aria-hidden="true">
      {digits.map((d, i) => {
        const place = digits.length - 1 - i // key by place value so only changed digits animate
        return (
          <span key={place} className="relative -my-[0.12em] inline-block overflow-hidden py-[0.12em]">
            <AnimatePresence initial={false} mode="popLayout" custom={dir}>
              <motion.span
                key={d}
                className="inline-block"
                custom={dir}
                variants={{
                  enter: (k: number) => ({ y: k >= 0 ? '42%' : '-42%', opacity: 0 }),
                  centre: { y: '0%', opacity: 1 },
                  exit: (k: number) => ({ y: k >= 0 ? '-42%' : '42%', opacity: 0 }),
                }}
                initial="enter"
                animate="centre"
                exit="exit"
                transition={{ duration: still ? 0 : 0.14, ease: [0.22, 1, 0.36, 1] }}
              >
                {d}
              </motion.span>
            </AnimatePresence>
          </span>
        )
      })}
    </span>
  )
}

function FlameCanvas({ look, still }: { look: FlameLook; still: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const ringRef = useRef<ReturnType<typeof createFlameRing>>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let ring: ReturnType<typeof createFlameRing> = null
    try {
      ring = createFlameRing(canvas)
    } catch (e) {
      console.warn('Flame ring unavailable:', e)
    }
    if (!ring) return
    ringRef.current = ring
    const size = DISC + PAD * 2
    // the flame is soft, so it doesn't need full retina resolution; this halves its fragment cost
    ring.resize(size, Math.min(window.devicePixelRatio || 1, 1.25), DISC / 2)
    ring.setLook(look)

    let raf = 0
    const t0 = performance.now()
    const frame = () => {
      ring!.render(FREEZE_AT ?? (performance.now() - t0) / 1000)
      if (!still && FREEZE_AT === null) raf = requestAnimationFrame(frame)
    }
    frame()
    return () => {
      cancelAnimationFrame(raf)
      ring!.dispose()
      ringRef.current = null
    }
    // look changes are pushed separately below; the loop only restarts on `still`
  }, [still])

  useEffect(() => {
    ringRef.current?.setLook(look)
    if (still) ringRef.current?.render(FREEZE_AT ?? 1.7)
  }, [look, still])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: DISC + PAD * 2, height: DISC + PAD * 2 }}
    />
  )
}

type Props = {
  value: number
  look?: FlameLook
  onOpen?: () => void
}

export default function HealthOrb({ value, look = REFERENCE_FLAME, onOpen }: Props) {
  const still = useReducedMotion()
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Transformer Health Index ${value} of 100. Open dissolved gas details`}
      className="absolute left-[358px] top-[57%] z-10 grid h-[336px] w-[336px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white"
    >
      {/* fallback disc if WebGL is unavailable; the flame canvas draws the real, soft-edged one */}
      <span className="absolute inset-[16px] rounded-full bg-black" aria-hidden="true" />
      <FlameCanvas look={look} still={still} />
      <span className="relative flex flex-col items-center">
        <span className="text-[19px] font-semibold leading-[1.25] tracking-[-0.01em]">
          Transformer
          <br />
          Health Index
        </span>
        <span className="mt-[20px] text-[126px] font-bold leading-[0.8] tracking-[-0.045em]">
          <TickingNumber value={value} still={still} />
        </span>
      </span>
    </button>
  )
}
