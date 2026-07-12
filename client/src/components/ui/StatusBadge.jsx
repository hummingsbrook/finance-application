const STATUS_CONFIG = {
  verified: {
    bg: 'bg-[#E8F5E9]',
    text: 'text-secondary',
    icon: 'check_circle',
    filled: true,
    label: 'Verified',
  },
  pending: {
    bg: 'bg-[#FFF8E1]',
    text: 'text-[#F9A825]',
    icon: 'pending',
    filled: false,
    label: 'Pending',
  },
  rejected: {
    bg: 'bg-error-container',
    text: 'text-on-error-container',
    icon: 'cancel',
    filled: true,
    label: 'Rejected',
  },
  failed: {
    bg: 'bg-error-container',
    text: 'text-on-error-container',
    icon: 'error',
    filled: true,
    label: 'Failed',
  },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-medium ${config.bg} ${config.text}`}
    >
      <span
        className={`material-symbols-outlined ${config.filled ? 'filled' : ''}`}
        style={{ fontSize: 16 }}
      >
        {config.icon}
      </span>
      {config.label}
    </span>
  );
}