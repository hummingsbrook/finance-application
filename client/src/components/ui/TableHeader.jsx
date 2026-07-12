// client/src/components/ui/TableHeader.jsx

const VARIANT_STYLES = {
  gray: 'bg-surface-container-low text-on-surface-variant',
  red:  'bg-error text-white',
};

export default function TableHeader({ columns = [], variant = 'gray' }) {
  return (
    <thead>
      <tr className={`font-label-md text-label-md ${VARIANT_STYLES[variant]}`}>
        {columns.map((col, i) => (
          <th
            key={i}
            className={`px-6 py-4 font-semibold whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
          >
            {col.label ?? col}
          </th>
        ))}
      </tr>
    </thead>
  );
}
