import { useId } from 'react';

export default function Input({ label, error, icon, onIconClick, type = 'text', className = '', id: externalId, ...rest }) {
  const generatedId = useId();
  const inputId = externalId || generatedId;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-label-md text-on-surface-variant mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={type}
          className={`
            w-full px-4 py-2.5
            bg-surface-container-lowest
            border rounded-lg
            text-body-lg text-on-surface
            placeholder:text-on-surface-variant/50
            outline-none transition-colors
            ${icon ? 'pr-11' : ''}
            ${
              error
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'
            }
          `}
          {...rest}
        />
        {icon && (
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant ${
              onIconClick ? 'cursor-pointer hover:text-primary' : ''
            }`}
            style={{ fontSize: 20 }}
            onClick={onIconClick}
          >
            {icon}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-label-sm text-error">{error}</p>
      )}
    </div>
  );
}