// client/src/components/ui/UniversalTable.jsx
// Generic table component with header, body, pagination footer, and optional footer-left slot.
// Body rows are produced by `renderRow(item, idx) => <tr>...</tr>`.

export default function UniversalTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found.',
  emptyIcon = '',
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  footerLeft = null,
  renderRow,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showPagination = totalPages > 1;

  const fromRecord = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const toRecord = Math.min(page * pageSize, total);

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className="bg-surface-container-lowest rounded-xl card-shadow border border-outline-variant/30 overflow-hidden">
      {/* Card Header (optional footerLeft slot lives in footer instead) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="font-label-md text-label-md bg-surface-container-low text-on-surface-variant">
              {columns.map((col, i) => (
                <th
                  key={col.key || i}
                  className={`px-6 py-4 font-semibold whitespace-nowrap ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-body-md text-on-surface-variant"
                >
                  {emptyIcon ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 36 }}>
                        {emptyIcon}
                      </span>
                      <span>{emptyMessage}</span>
                    </div>
                  ) : (
                    emptyMessage
                  )}
                </td>
              </tr>
            ) : (
              data.map((item, idx) => renderRow && renderRow(item, idx))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: footerLeft slot + pagination */}
      {(footerLeft || showPagination) && (
        <div className="px-6 py-4 border-t border-outline-variant/20 flex flex-col md:flex-row items-center justify-between gap-4 text-label-sm text-on-surface-variant">
          <div>{footerLeft}</div>
          {showPagination && (
            <>
              <span className="md:absolute md:left-1/2 md:-translate-x-1/2">
                Showing {fromRecord}–{toRecord} of {total.toLocaleString()} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange && onPageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg border border-outline-variant/50 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                  Previous
                </button>
                <div className="flex gap-1.5">
                  {pageNumbers.map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange && onPageChange(pageNum)}
                      className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-colors ${
                        page === pageNum
                          ? 'bg-primary text-on-primary'
                          : 'hover:bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onPageChange && onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg border border-outline-variant/50 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container"
                >
                  Next
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
