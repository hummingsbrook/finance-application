import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { createPortal } from 'react-dom';
import api from '../../lib/api';
import { formatKES, formatDate, formatDateTime } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import Pagination from '../../components/ui/Pagination';
import TableHeader from '../../components/ui/TableHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { EXPENSE_CATEGORIES, CATEGORY_LABELS } from '../../constants/expenseCategories';

const CATEGORIES = ['All', ...EXPENSE_CATEGORIES];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FAILED', label: 'Failed' },
];

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-secondary-container text-on-secondary-container',
  REJECTED: 'bg-error-container text-on-error-container',
  FAILED: 'bg-surface-container-high text-on-surface-variant',
};

const CATEGORY_COLORS = {
  SALARIES: 'bg-green-100 text-green-700',
  UTILITIES: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
  EVENTS: 'bg-purple-100 text-purple-700',
  TRANSPORT: 'bg-indigo-100 text-indigo-700',
  SUPPLIES: 'bg-gray-100 text-gray-700',
  MISCELLANEOUS: 'bg-orange-100 text-orange-700',
};

const PAGE_SIZE = 20;

export default function ExpenseOversight() {
  const { showError } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({ totalExpenses: 0, pendingCount: 0, thisMonthTotal: 0 });
  const [toast, setToast] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Action loading
  const [actionLoading, setActionLoading] = useState(null);

  // Confirm / reject modals
  const [pendingApproval, setPendingApproval] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter && categoryFilter !== 'All') params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      params.page = page;
      params.limit = PAGE_SIZE;

      const res = await api.get('/expenses/oversight', { params });
      const data = res.data;
      setExpenses(data?.expenses || data?.data || []);
      setTotal(data?.total || 0);
      setSummary({
        totalExpenses: data.summary?.totalExpenses ?? 0,
        pendingCount: data.summary?.pendingCount ?? 0,
        thisMonthTotal: data.summary?.thisMonthTotal ?? 0,
      });
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, startDate, endDate, page]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = async (expenseId) => {
    setActionLoading(`approve-${expenseId}`);
    try {
      await api.put(`/expenses/${expenseId}/approve`);
      showToast('Expense approved successfully.');
      fetchExpenses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Approval failed.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (expenseId, reason) => {
    setActionLoading(`reject-${expenseId}`);
    try {
      await api.put(`/expenses/${expenseId}/reject`, { reason });
      showToast('Expense rejected.');
      fetchExpenses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Rejection failed.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const resetFilters = () => {
    setCategoryFilter('All');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fromRecord = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const toRecord = Math.min(page * PAGE_SIZE, total);

  const formatStatusLabel = (s) => {
    if (!s) return 'Pending';
    return s.charAt(0) + s.slice(1).toLowerCase();
  };

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-6 relative">
      {/* Background Decoration */}
      <span
        className="material-symbols-outlined absolute bottom-10 right-10 text-[240px] text-primary/5 pointer-events-none select-none -z-10"
        style={{ fontSize: 240 }}
      >
        receipt_long
      </span>

      {/* Page Header */}
      <div>
        <h2 className="font-headline-lg text-headline-lg text-primary">Expense Oversight</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Review and approve expenses across all departments
        </p>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          icon="payments"
          iconBg="bg-error-container text-error"
          label="Total Expenses"
          value={formatKES(summary.totalExpenses)}
          subLabel="All recorded expenses"
        />
        <KpiCard
          icon="pending_actions"
          iconBg="bg-amber-100 text-amber-600"
          label="Pending Approval"
          value={summary.pendingCount}
          subLabel="Awaiting admin review"
          badge={summary.pendingCount > 0 ? 'Action Req' : undefined}
          badgeColor="bg-error/10 text-error"
        />
        <KpiCard
          icon="calendar_today"
          iconBg="bg-primary-container/30 text-primary"
          label="This Month"
          value={formatKES(summary.thisMonthTotal)}
          subLabel="Current month spending"
        />
      </section>

      {/* Filter Bar */}
      <section className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl card-shadow p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">filter_alt</span>
            <h3 className="font-headline-md text-lg text-on-surface">Filter Expenses</h3>
          </div>
          <button
            onClick={resetFilters}
            className="text-secondary font-label-md hover:underline decoration-2 underline-offset-4"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none text-on-surface"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All' : CATEGORY_LABELS[c] || c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none text-on-surface"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none"
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none"
            />
          </div>
        </div>
      </section>

      {/* Error */}

      {/* Confirm Approval Dialog */}
      <ConfirmDialog
        isOpen={!!pendingApproval && pendingApproval.action === 'approve'}
        title="Confirm Expense Approval"
        message={`Approve "${pendingApproval?.description}" for ${formatKES(pendingApproval?.amount)}? This action is final.`}
        confirmText="Approve"
        onConfirm={() => { handleApprove(pendingApproval.id); setPendingApproval(null); }}
        onClose={() => setPendingApproval(null)}
      />

      {/* Data Table */}
      <section className="bg-surface-container-lowest rounded-xl card-shadow border border-outline-variant/20 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <span
              className="material-symbols-outlined animate-spin text-primary block mx-auto mb-3"
              style={{ fontSize: 40 }}
            >
              sync
            </span>
            <p className="text-body-lg text-on-surface-variant">Loading expenses...</p>
          </div>
        ) : !expenses.length ? (
          <div className="p-12 text-center">
            <span
              className="material-symbols-outlined text-on-surface-variant block mx-auto mb-3"
              style={{ fontSize: 48 }}
            >
              inbox
            </span>
            <p className="text-body-lg text-on-surface-variant">No expenses found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <TableHeader
                variant="red"
                columns={[
                  { label: 'Date' },
                  { label: 'Description' },
                  { label: 'Category' },
                  { label: 'Amount', align: 'right' },
                  { label: 'Recorded By' },
                  { label: 'Approved By' },
                  { label: 'Status' },
                  { label: 'Actions', align: 'center' },
                ]}
              />
              <tbody className="text-body-sm divide-y divide-outline-variant/10">
                {expenses.map((exp, idx) => {
                  const status = exp.status || 'PENDING';
                  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
                  const catColor =
                    CATEGORY_COLORS[exp.category] || 'bg-gray-100 text-gray-700';

                  return (
                    <tr
                      key={exp.id || idx}
                      className={`hover:bg-surface-container-low transition-colors ${
                        idx % 2 === 1 ? 'bg-surface-container-low/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                        {formatDate(exp.date || exp.expenseDate)}
                      </td>
                      <td className="px-6 py-4 font-medium text-on-surface max-w-[200px]">
                        {exp.description || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 ${catColor} rounded-full text-[12px] font-bold`}
                        >
                          {CATEGORY_LABELS[exp.category] || exp.category || 'Other'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-error">
                        ({formatKES(exp.amount)})
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {exp.recordedByUser
                          ? `${exp.recordedByUser.firstName} ${exp.recordedByUser.lastName}`
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {exp.approvedByUser
                          ? `${exp.approvedByUser.firstName} ${exp.approvedByUser.lastName}`
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`${statusStyle} px-2.5 py-1 rounded-full text-[11px] font-bold`}>
                          {formatStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {status === 'PENDING' ? (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => setPendingApproval({ id: exp.id, action: 'approve', amount: exp.amount, description: exp.description })}
                              disabled={actionLoading === `approve-${exp.id}`}
                              className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold flex items-center gap-1 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === `approve-${exp.id}` ? (
                                <span
                                  className="material-symbols-outlined animate-spin"
                                  style={{ fontSize: 14 }}
                                >
                                  sync
                                </span>
                              ) : (
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                  check
                                </span>
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => { setRejectReason(''); setRejectModal(exp.id); }}
                              disabled={actionLoading === `reject-${exp.id}`}
                              className="px-3 py-1.5 bg-error text-on-error rounded-lg text-xs font-bold flex items-center gap-1 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === `reject-${exp.id}` ? (
                                <span
                                  className="material-symbols-outlined animate-spin"
                                  style={{ fontSize: 14 }}
                                >
                                  sync
                                </span>
                              ) : (
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                  close
                                </span>
                              )}
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <span className="text-on-surface-variant text-xs">—</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer / Pagination */}
        {!loading && expenses.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            activeColor="bg-error text-white"
          />
        )}
      </section>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 transition-all ${
            toast.type === 'error'
              ? 'bg-error-container text-on-error-container'
              : 'bg-inverse-surface text-inverse-on-surface'
          }`}
        >
          <span
            className={`material-symbols-outlined ${
              toast.type === 'error' ? 'text-error' : 'text-primary-fixed-dim'
            }`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <p className="font-body-sm font-bold">{toast.message}</p>
          <button onClick={() => setToast(null)}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setRejectModal(null); setRejectReason(''); }} />
          <div className="relative bg-surface-container-lowest rounded-xl p-6 card-shadow max-w-md w-full mx-4 z-10">
            <h3 className="text-headline-md text-on-surface mb-2">Reject Expense</h3>
            <p className="text-body-sm text-on-surface-variant mb-4">
              Please provide a reason for rejecting this expense. This will be visible to the recorder.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Receipt missing, amount mismatch, unauthorized category..."
              rows={4}
              className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none mb-6"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-low text-label-md transition-colors rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleReject(rejectModal, rejectReason);
                  setRejectModal(null);
                  setRejectReason('');
                }}
                disabled={actionLoading === `reject-${rejectModal}`}
                className="px-4 py-2 bg-error text-on-error rounded-full text-label-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {actionLoading === `reject-${rejectModal}` ? 'Rejecting...' : 'Reject Expense'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}