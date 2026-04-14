interface ChartPlaceholderProps {
  label: string;
}

export function ChartPlaceholder({ label }: ChartPlaceholderProps) {
  return (
    <div className="relative h-[512px] bg-[#1A1A1A] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#2f343b_0%,#1a1a1a_60%)]" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
      <div className="absolute inset-y-0 left-1/3 w-px bg-white/5" />
      <div className="absolute inset-y-0 left-2/3 w-px bg-white/5" />
      <div className="absolute bottom-8 left-8 right-8 h-24 rounded-full bg-gradient-to-r from-emerald-500/10 via-white/5 to-rose-500/10 blur-3xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-full border border-white/10 px-4 py-2 text-xs tracking-[0.18em] text-[#9C9D9E] uppercase">
          {label} Chart Placeholder
        </div>
      </div>
    </div>
  );
}
