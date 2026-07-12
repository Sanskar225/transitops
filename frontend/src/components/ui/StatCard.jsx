export default function StatCard({ label, value, sub, icon: Icon, accent = 'beacon' }) {
  const accentClasses = {
    beacon: 'text-beacon',
    teal: 'text-teal',
    violet: 'text-violet',
    danger: 'text-danger',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="label mb-0">{label}</span>
        {Icon && <Icon size={16} className={accentClasses[accent]} />}
      </div>
      <div className="font-mono text-2xl font-medium text-ink">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}
