import { useId } from 'react';

/**
 * Universal FilterBar component.
 *
 * Props:
 *   filters        {object}   — current filter values (controlled)
 *   onChange       {fn}       — called with (fieldName, value) on any change
 *   onClear        {fn}       — called with no args when "Clear all" is clicked
 *   fields         {array}    — array of field config objects (see below)
 *   hasActiveFilters {bool}   — show "Clear all" link when true
 *
 * Field config shape:
 *   { key, label, type, options?, placeholder?, min?, span? }
 *   type: 'select' | 'date' | 'search'
 *   options: [{ value, label }]  — only for type='select'
 *   span: 2                      — optional, makes field span 2 columns (lg:col-span-2)
 */

function FilterField({ config, value, onChange }) {
  const id = useId();
  const baseClass =
    'w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors';

  return (
    <div className={config.span === 2 ? 'sm:col-span-2 lg:col-span-2' : ''}>
      <label htmlFor={id} className="block text-label-sm text-on-surface-variant mb-1.5">
        {config.label}
      </label>

      {config.type === 'select' && (
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(config.key, e.target.value)}
          className={baseClass}
        >
          {(config.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {config.type === 'date' && (
        <input
          id={id}
          type="date"
          value={value ?? ''}
          min={config.min}
          onChange={(e) => onChange(config.key, e.target.value)}
          className={baseClass}
        />
      )}

      {config.type === 'search' && (
        <div className="relative">
          <input
            id={id}
            type="text"
            value={value ?? ''}
            placeholder={config.placeholder || 'Search…'}
            onChange={(e) => onChange(config.key, e.target.value)}
            className={`${baseClass} pr-9`}
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant pointer-events-none"
            style={{ fontSize: 18 }}
          >
            search
          </span>
        </div>
      )}
    </div>
  );
}

export default function FilterBar({ filters, onChange, onClear, fields, hasActiveFilters }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 card-shadow p-6">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="material-symbols-outlined text-on-surface-variant"
          style={{ fontSize: 20 }}
        >
          filter_list
        </span>
        <h4 className="text-label-md text-on-surface font-bold">Filters</h4>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto text-label-sm text-primary hover:underline cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {fields.map((field) => (
          <FilterField
            key={field.key}
            config={field}
            value={filters[field.key]}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}
