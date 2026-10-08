type Props = {
  value: number
  onOpen?: () => void
}

export default function HealthOrb({ value, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Transformer Health Index ${value} of 100. Open dissolved gas details`}
      className="absolute left-[358px] top-[57%] z-10 grid h-[336px] w-[336px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black text-white"
    >
      <span className="flex flex-col items-center">
        <span className="text-[19px] font-semibold leading-[1.25] tracking-[-0.01em]">
          Transformer
          <br />
          Health Index
        </span>
        <span className="mt-[20px] text-[126px] font-bold leading-[0.8] tracking-[-0.045em] tabular-nums">
          {value}
        </span>
      </span>
    </button>
  )
}
