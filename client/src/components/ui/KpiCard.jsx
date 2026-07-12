// client/src/components/ui/KpiCard.jsx

export default function KpiCard({
  icon,
  iconBg,
  label,
  value,
  badge,
  badgeColor,
  subLabel,
  subLabelColor,
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 min-h-[120px] flex flex-col justify-between">
      {/* Decorative circle — stays inside due to overflow-hidden on parent */}
      <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full group-hover:scale-110 transition-transform pointer-events-none" />

      {/* Top row: icon + badge */}
      <div className="flex justify-between items-start relative mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {badge && (
          <span className={`text-label-sm px-2.5 py-1 rounded-full uppercase tracking-wider max-w-[120px] truncate ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Bottom row: label + value + subLabel */}
      <div className="min-w-0">
        <p className="text-label-md text-on-surface-variant truncate">{label}</p>
        <h3 className="text-headline-lg text-primary mt-1 break-words leading-tight">{value}</h3>
        {subLabel && (
          <p className={`text-label-sm mt-1 flex items-center gap-1 flex-wrap ${subLabelColor || 'text-on-surface-variant'}`}>
            {subLabel}
          </p>
        )}
      </div>
    </div>
  );
}
