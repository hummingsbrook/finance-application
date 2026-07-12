// client/src/components/ui/Pagination.jsx

export default function Pagination({ page, totalPages, total, pageSize, onPageChange, activeColor = 'bg-primary text-on-primary' }) {
  if (totalPages <= 1) return null;

  const fromRecord = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const toRecord = Math.min(page * pageSize, total);

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className="px-6 py-4 border-t border-outline-variant/20 flex flex-col md:flex-row items-center justify-between gap-4 text-label-sm text-on-surface-variant">
      <span>
        Showing {fromRecord}–{toRecord} of {total.toLocaleString()} records
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
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
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-colors ${
                page === pageNum
                  ? activeColor
                  : 'hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="px-4 py-2 rounded-lg border border-outline-variant/50 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container"
        >
          Next
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
        </button>
      </div>
    </div>
  );
}
