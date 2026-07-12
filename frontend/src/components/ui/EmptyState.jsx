export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-panel2 border border-border flex items-center justify-center mb-4">
          <Icon size={22} className="text-muted" />
        </div>
      )}
      <h3 className="text-ink font-display font-medium text-base">{title}</h3>
      {description && <p className="text-muted text-sm mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
