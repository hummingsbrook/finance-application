import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatKES, formatDate } from '../../../lib/utils';
import StatusBadge from '../../../components/ui/StatusBadge';
import Button from '../../../components/ui/Button';

const TRANSACTION_ICON_MAP = {
  TITHE: { icon: 'volunteer_activism', bg: 'bg-secondary-container', text: 'text-primary', hoverBg: 'group-hover:bg-primary', hoverText: 'group-hover:text-white' },
  OFFERING: { icon: 'spa', bg: 'bg-secondary-container', text: 'text-primary', hoverBg: 'group-hover:bg-primary', hoverText: 'group-hover:text-white' },
  HARAMBEE: { icon: 'foundation', bg: 'bg-tertiary-container', text: 'text-on-tertiary-container', hoverBg: 'group-hover:bg-tertiary', hoverText: 'group-hover:text-white' },
};

const METHOD_ICON_MAP = {
  MPESA: { icon: 'smartphone', label: 'M-Pesa' },
  CASH: { icon: 'payments', label: 'Cash' },
  BANK_TRANSFER: { icon: 'account_balance', label: 'Bank Transfer' },
};

const STATUS_BADGE_MAP = {
  CONFIRMED: 'verified',
  PENDING: 'pending',
  REJECTED: 'rejected',
  FAILED: 'failed',
};

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'TITHE', label: 'Tithe' },
  { value: 'OFFERING', label: 'Offering' },
  { value: 'HARAMBEE', label: 'Harambee' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FAILED', label: 'Failed' },
];

export default function ContributionsPanel({
  payments,
  loading,
  total = 0,
  page = 1,
  onPageChange,
  filterType,
  filterStatus,
  dateFrom,
  dateTo,
  onFilterType,
  onFilterStatus,
  onDateFrom,
  onDateTo,
  onClearFilters,
}) {
  const navigate = useNavigate();

  // Export loading
  const [exporting, setExporting] = useState(false);

  // Total amount for the server-filtered page currently in view
  const totalFilteredAmount = payments.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0
  );

  const hasActiveFilters = filterType || filterStatus || dateFrom || dateTo;

  async function handleExport() {
    setExporting(true);
    try {
      const headers = ['Date', 'Type', 'Amount (KES)', 'Method', 'Status', 'M-Pesa Receipt'];
      const rows = payments.map((p) => [
        formatDate(p.createdAt || p.date),
        p.paymentType || '',
        parseFloat(p.amount || 0).toFixed(2),
        p.paymentMethod || '',
        p.status || '',
        p.mpesaReceiptNo || '',
      ]);
      const csv = [headers, ...rows].map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contributions-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-stack-lg">
      {/* Header row with Export CSV and New Contribution buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="text-headline-md text-on-surface">All Transactions</h4>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {loading
              ? 'Loading...'
              : `${payments.length} transaction${payments.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleExport}
            loading={exporting}
            disabled={payments.length === 0}
            className="w-full sm:w-auto justify-center"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
            Export CSV
          </Button>
          <Button onClick={() => navigate('/partner/give')} className="w-full sm:w-auto justify-center">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            New Contribution
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      {!loading && payments.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 card-shadow p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">Total Filtered</p>
              <p className="text-headline-md text-primary">{formatKES(totalFilteredAmount)}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">Transactions</p>
              <p className="text-headline-md text-on-surface">{payments.length}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">Confirmed</p>
              <p className="text-headline-md text-secondary">
                {payments.filter((p) => ['CONFIRMED', 'VERIFIED'].includes((p.status || '').toUpperCase())).length}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">Pending</p>
              <p className="text-headline-md text-[#F9A825]">
                {payments.filter((p) => (p.status || '').toUpperCase() === 'PENDING').length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 card-shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>filter_list</span>
          <h4 className="text-label-md text-on-surface font-bold">Filters</h4>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="ml-auto text-label-sm text-primary hover:underline cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Type filter */}
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1.5">Type</label>
            <select
              value={filterType}
              onChange={(e) => onFilterType(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1.5">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => onFilterStatus(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1.5">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFrom(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1.5">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateTo(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table — styled to match the removed Recent Transactions table */}
      {loading ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-12 text-center card-shadow">
          <span className="material-symbols-outlined animate-spin text-primary mb-3 block" style={{ fontSize: 48 }}>
            sync
          </span>
          <p className="text-body-lg text-on-surface-variant">Loading your contributions...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-12 text-center card-shadow">
          <span className="material-symbols-outlined text-on-surface-variant mb-3 block" style={{ fontSize: 48 }}>
            inbox
          </span>
          <p className="text-body-lg text-on-surface-variant">No contributions found. Adjust your filters or make your first contribution.</p>
          <Button className="mt-4" onClick={() => navigate('/partner/give')}>
            Make Your First Contribution
          </Button>
        </div>
      ) : (
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-label-md">
                  <th className="px-6 py-4">Transaction Details</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {payments.map((p) => {
                  const type = (p.paymentType || '').toUpperCase();
                  const iconConfig = TRANSACTION_ICON_MAP[type] || TRANSACTION_ICON_MAP.TITHE;
                  const methodConfig = METHOD_ICON_MAP[p.paymentMethod] || METHOD_ICON_MAP.CASH;
                  const statusKey = STATUS_BADGE_MAP[(p.status || '').toUpperCase()] || 'pending';

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-surface-container transition-colors group cursor-pointer"
                      onClick={() => navigate(`/partner/payment-status/${p.id}`)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${iconConfig.bg} flex items-center justify-center ${iconConfig.text} ${iconConfig.hoverBg} ${iconConfig.hoverText} transition-colors`}>
                            <span className="material-symbols-outlined">{iconConfig.icon}</span>
                          </div>
                          <div>
                            <p className="text-label-md text-on-surface">{p.description || `${type.charAt(0) + type.slice(1).toLowerCase()} Payment`}</p>
                            <p className="text-label-sm text-on-surface-variant">{p.harambee?.title || 'General Fund'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-body-sm text-on-surface-variant">
                        {formatDate(p.createdAt || p.date)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>
                            {methodConfig.icon}
                          </span>
                          <span className="text-body-sm text-on-surface-variant">{methodConfig.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-bold text-on-surface">
                        {formatKES(p.amount)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          <StatusBadge status={statusKey} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20 bg-surface-container-low/30">
              <span className="text-label-sm text-on-surface-variant">
                Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total} transactions
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg border border-outline-variant/50 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-on-surface-variant hover:bg-surface-container text-label-sm"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    chevron_left
                  </span>
                  Previous
                </button>
                <button
                  onClick={() => onPageChange(p => Math.min(Math.ceil(total / 20), p + 1))}
                  disabled={page >= Math.ceil(total / 20)}
                  className="px-4 py-2 rounded-lg border border-outline-variant/50 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-on-surface-variant hover:bg-surface-container text-label-sm"
                >
                  Next
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
