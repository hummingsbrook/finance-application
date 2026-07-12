export default function DataTable({ columns = [], data = [], emptyMessage = 'No data available.', onRowClick, headerVariant = 'gray' }) {
  const HEADER_STYLES = {
    gray: 'bg-surface-container-low text-on-surface-variant',
    red: 'bg-error text-white',
  };

  if (!data.length) {
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-12 text-center">
        <span className="material-symbols-outlined text-on-surface-variant mb-3 block" style={{ fontSize: 48 }}>
          inbox
        </span>
        <p className="text-body-lg text-on-surface-variant">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`font-label-md text-label-md ${HEADER_STYLES[headerVariant]}`}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-6 py-4 font-semibold whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                className={`border-b border-outline-variant/50 last:border-0 transition-colors hover:bg-surface-container ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 text-body-sm text-on-surface">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
