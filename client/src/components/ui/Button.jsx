const VARIANTS = {
  primary: 'bg-primary-container text-on-primary hover:bg-primary-container/90',
  secondary: 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90',
  danger: 'bg-error text-on-error hover:bg-error/90',
  ghost: 'bg-transparent text-primary hover:bg-surface-container',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-label-sm',
  md: 'px-5 py-2.5 text-label-md',
  lg: 'px-6 py-3 text-body-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl font-semibold
        transition-all duration-150
        active:scale-[0.99]
        ${VARIANTS[variant] || VARIANTS.primary}
        ${SIZES[size] || SIZES.md}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...rest}
    >
      {loading && (
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>
          sync
        </span>
      )}
      {children}
    </button>
  );
}