const colorMap = {
  teal: 'bg-teal/10 text-teal border-teal/30',
  beacon: 'bg-beacon/10 text-beacon border-beacon/30',
  violet: 'bg-violet/10 text-violet border-violet/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
  muted: 'bg-panel2 text-muted border-border',
};

export default function StatusPill({ status, colorKey = 'muted' }) {
  const classes = colorMap[colorKey] || colorMap.muted;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono tracking-wide ${classes}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
