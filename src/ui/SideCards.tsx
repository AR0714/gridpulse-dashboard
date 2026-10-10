type Props = {
  nextSample: string
  diagnosis: string
  critical?: boolean
  onNextSample?: () => void
  onDiagnosis?: () => void
}

function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function SideCards({ nextSample, diagnosis, critical = false, onNextSample, onDiagnosis }: Props) {
  return (
    <div className="absolute bottom-[-40px] right-[40px] z-10 flex w-[252px] flex-col gap-[21px]">
      <section className="relative h-[141px] rounded-[22px] bg-glass px-[24px] pt-[24px] backdrop-blur-xl">
        <h2 className="text-[20.5px] font-semibold leading-[1.15] tracking-[-0.01em] text-white">
          Next oil
          <br />
          sample
        </h2>
        <p className="absolute bottom-[29px] left-[24px] text-[11.5px] font-medium text-white/55">{nextSample}</p>
        <button
          type="button"
          aria-label="Show maintenance actions"
          onClick={onNextSample}
          className="absolute bottom-[21px] right-[22px] grid h-[30px] w-[30px] place-items-center rounded-full bg-black text-white transition hover:bg-neutral-900"
        >
          <Arrow />
        </button>
      </section>

      <section className="diagnosis-gradient relative h-[150px] rounded-[22px] px-[24px] pt-[28px]">
        <h2 className="text-[20.5px] font-semibold leading-[1.15] tracking-[-0.01em] text-white">Diagnosis</h2>
        <div className="absolute left-[24px] top-[93px] flex items-center gap-[4px]">
          <span
            className={`whitespace-nowrap rounded-full px-[12px] py-[7px] text-[14px] font-semibold leading-none transition-colors duration-700 ${
              critical ? 'bg-[#D42A1E] text-white' : 'bg-white text-ink'
            }`}
          >
            {diagnosis}
          </span>
          <button
            type="button"
            aria-label="Open dissolved gas details"
            onClick={onDiagnosis}
            className="grid h-[30px] w-[30px] place-items-center rounded-full bg-white text-ink transition hover:bg-white/85"
          >
            <Arrow className="h-[15px] w-[15px]" />
          </button>
        </div>
      </section>
    </div>
  )
}
