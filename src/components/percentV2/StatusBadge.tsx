interface StatusBadgeProps {
  status: 'Pending' | 'Passed' | 'Failed' | 'Executed';
}

const STATUS_CLASSNAMES: Record<StatusBadgeProps['status'], string> = {
  Pending: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  Passed: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  Failed: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
  Executed: 'text-sky-300 border-sky-500/30 bg-sky-500/10'
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs border ${STATUS_CLASSNAMES[status]}`}>
      {status}
    </span>
  );
}
