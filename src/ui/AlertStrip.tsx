import { AnimatePresence, motion } from 'framer-motion'

export const ALERT_HEIGHT = 34

/** Thin red strip that slides down from the top of the panel during high-energy arcing. */
export default function AlertStrip({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="alert"
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="absolute inset-x-0 top-0 z-30 flex items-center justify-center gap-[10px] bg-[#C7261C] text-[13px] font-semibold text-white shadow-[0_6px_24px_rgba(199,38,28,0.45)]"
          style={{ height: ALERT_HEIGHT }}
        >
          <span className="relative flex h-[8px] w-[8px]" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 motion-reduce:animate-none" />
            <span className="relative inline-flex h-[8px] w-[8px] rounded-full bg-white" />
          </span>
          Critical: high-energy arcing (D2). De-energize and inspect.
        </motion.div>
      )}
    </AnimatePresence>
  )
}
