import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { formatDateTime, truncate } from '../../lib/utils';
import Button from '../../components/ui/Button';
import TableHeader from '../../components/ui/TableHeader';
import Pagination from '../../components/ui/Pagination';

const MODULES = [
  { value: '', label: 'All Modules' },
  { value: 'tithes', label: 'Tithes' },
  { value: 'offerings', label: 'Offerings' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'harambees', label: 'Harambees' },
  { value: 'payments', label: 'Payments' },
  { value: 'auth', label: 'Auth' },
  { value: 'users', label: 'Users' },

];

const ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'STATUS_CHANGE', label: 'Status Change' },
];

const ACTION_BADGE_STYLES = {
  create: 'bg-secondary-container text-on-secondary-container',
  update: 'bg-primary-fixed text-on-primary-fixed-variant',
  delete: 'bg-error-container text-on-error-container',
  login: 'bg-sky-100 text-sky-700',
  logout: 'bg-surface-variant text-on-surface-variant',
  STATUS_CHANGE: 'bg-amber-100 text-amber-800',
};

const PAGE_SIZE = 20;

export default function AuditLogs() {
  const { showError } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Expanded row
  const [expandedId, setExpandedId] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (moduleFilter) params.set('module', moduleFilter);
      if (actionFilter) params.set('action', actionFilter); // already uppercase from the ACTIONS array
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', page);
      params.set('limit', PAGE_SIZE);

      const res = await api.get(`/audit/logs?${params.toString()}`);
      const data = res.data;
      setLogs(data.logs || (Array.isArray(data) ? data : []));
      setTotal(data.total || 0);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, actionFilter, startDate, endDate, searchQuery, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const resetFilters = () => {
    setModuleFilter('');
    setActionFilter('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setSearchInput('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fromRecord = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const toRecord = Math.min(page * PAGE_SIZE, total);

  // CSV Export
  const exportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (moduleFilter) params.set('module', moduleFilter);
      if (actionFilter) params.set('action', actionFilter); // already uppercase from the ACTIONS array
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', '10000');
      params.set('page', '1');
      const res = await api.get(`/audit/logs?${params.toString()}`);
      const allLogs = res.data?.logs || logs;
      const headers = ['Timestamp','User','Email','Action','Module','Details','IP Address'];
      const rows = allLogs.map((log) => [
        log.createdAt || '',
        [log.user?.firstName, log.user?.lastName].filter(Boolean).join(' '),
        log.user?.email || '',
        log.action || '',
        log.module || '',
        `"${(log.details || '').replace(/"/g, '""')}"`,
        log.ipAddress || '',
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed', err);
    }
  };

  const selectClass =
    'bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none text-on-surface';

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-6 relative">
      {/* Background Decoration */}
      <span
        className="material-symbols-outlined absolute bottom-10 right-10 text-[240px] text-primary/5 pointer-events-none select-none -z-10"
        style={{ fontSize: 240 }}
      >
        history
      </span>

      {/* Page Header */}
      <div>
        <h2 className="font-headline-lg text-headline-lg text-primary">Audit Logs</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Complete activity history — read only
        </p>
      </div>

      {/* Read-Only Banner */}
      <div className="bg-surface-container-lowest border border-sky-100 rounded-xl p-4 flex items-start gap-4 shadow-sm">
        <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center text-sky-600 flex-shrink-0">
          <span className="material-symbols-outlined">info</span>
        </div>
        <div>
          <h4 className="font-label-md text-sky-900">
            System Notice: Immutable Audit Records
          </h4>
          <p className="text-body-sm text-sky-700/80 mt-1">
            Audit logs are append-only records protected at the application layer. Records are written
            on every state-changing operation and cannot be deleted through the application interface.
          </p>
        </div>
      </div>

      {/* Filter Panel */}
      <section className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl card-shadow p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">filter_alt</span>
            <h3 className="font-headline-md text-lg text-on-surface">Filter Logs</h3>
          </div>
          <button
            onClick={resetFilters}
            className="text-secondary font-label-md hover:underline decoration-2 underline-offset-4"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Module Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
              Module
            </label>
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              {MODULES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
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
              className={selectClass}
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
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
              manage_search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearchQuery(searchInput); setPage(1); } }}
              placeholder="Search by Record ID, IP Address, or Description Keywords..."
              className="w-full bg-surface-container-low border-none rounded-lg pl-10 py-3 text-body-sm focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50 outline-none"
            />
          </div>
          <button
            onClick={() => { setSearchQuery(searchInput); setPage(1); }}
            className="bg-primary text-on-primary rounded-lg px-4 py-3 text-label-md font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
            Search
          </button>
        </div>
      </section>

      {/* Error */}

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
            <p className="text-body-lg text-on-surface-variant">Loading audit logs...</p>
          </div>
        ) : !logs.length ? (
          <div className="p-12 text-center">
            <span
              className="material-symbols-outlined text-on-surface-variant block mx-auto mb-3"
              style={{ fontSize: 48 }}
            >
              inbox
            </span>
            <p className="text-body-lg text-on-surface-variant">No audit logs found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <TableHeader
                variant="gray"
                columns={[
                  { label: 'Timestamp' },
                  { label: 'User' },
                  { label: 'Action' },
                  { label: 'Module' },
                  { label: 'Details' },
                  { label: 'IP Address' },
                ]}
              />
              <tbody className="text-body-sm divide-y divide-outline-variant/10">
                {logs.map((log, idx) => {
                  const id = log.id || idx;
                  const actionKey = log.action || '';
                  const action = actionKey.toLowerCase();
                  const badgeStyle = ACTION_BADGE_STYLES[actionKey] || ACTION_BADGE_STYLES[action] || 'bg-surface-variant text-on-surface-variant';
                  const isExpanded = expandedId === id;
                  const details = log.details || log.description || '';

                  return (
                    <tr
                      key={id}
                      className={`hover:bg-surface-container-low transition-colors cursor-pointer ${
                        idx % 2 === 1 ? 'bg-surface-container-low/20' : ''
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : id)}
                    >
                      <td className="px-6 py-4 text-on-surface-variant font-mono text-[13px] whitespace-nowrap">
                        {formatDateTime(log.timestamp || log.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-on-surface">
                          {[log.user?.firstName, log.user?.lastName].filter(Boolean).join(' ') || 'Unknown'}
                        </div>
                        <div className="text-[12px] text-on-surface-variant">
                          {log.user?.email || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`${badgeStyle} px-2.5 py-1 rounded-full text-[11px] font-bold`}
                        >
                          {(log.action || '').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[12px] text-on-surface-variant">
                        {log.module || log.table || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant max-w-[220px]">
                        {isExpanded ? (
                          <span className="whitespace-pre-wrap">{details}</span>
                        ) : (
                          truncate(details, 50)
                        )}
                        {details.length > 50 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(isExpanded ? null : id);
                            }}
                            className="text-primary text-[11px] ml-1 hover:underline"
                          >
                            {isExpanded ? 'less' : 'more'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-[12px]">
                        {log.ipAddress || log.ip || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="px-6 py-4 bg-surface-container-low/30 border-t border-outline-variant/20 flex flex-col md:flex-row items-center justify-between gap-4 font-label-sm text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-8">
            <span>
              Showing {fromRecord}–{toRecord} of {total.toLocaleString()} entries
            </span>
            <button
              onClick={exportCSV}
              className="text-primary font-bold flex items-center gap-1.5 hover:underline decoration-2 underline-offset-4"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                download
              </span>
              Export CSV
            </button>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </section>
    </div>
  );
}