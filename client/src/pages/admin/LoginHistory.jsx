import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { formatDateTime } from '../../lib/utils';

const ROLE_BADGE = {
  SUPER_ADMIN: 'bg-error-container text-on-error-container',
  MANAGER:     'bg-primary-container text-on-primary-container',
  PARTNER:     'bg-secondary-container text-on-secondary-container',
};

const ACTION_BADGE = {
  LOGIN:  'bg-[#e8f5e9] text-[#2e7d32]',
  LOGOUT: 'bg-surface-container-high text-on-surface-variant',
};

const PAGE_SIZE = 20;

export default function LoginHistory() {
  const { showError } = useToast();
  const [logs, setLogs]       = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);


  // Filters
  const [startDate,    setStartDate]    = useState('');
  const [endDate,      setEndDate]      = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search,       setSearch]       = useState('');
  const [searchInput,  setSearchInput]  = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ startDate: '', endDate: '', actionFilter: '' });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', PAGE_SIZE);
      if (appliedFilters.startDate) params.set('startDate', appliedFilters.startDate);
      if (appliedFilters.endDate)   params.set('endDate', appliedFilters.endDate);
      if (appliedFilters.actionFilter) params.set('action', appliedFilters.actionFilter);
      if (search)       params.set('search', search);

      const res = await api.get(`/audit/login-history?${params.toString()}`);
      const data = res.data;
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setSummary(data.summary || null);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to load login history.');
    } finally {
      setLoading(false);
    }
  }, [page, search, appliedFilters]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleApply = () => {
    setAppliedFilters({ startDate, endDate, actionFilter });
    setSearch(searchInput);
    setPage(1);
  };

  const handleClear = () => {
    setStartDate(''); setEndDate(''); setActionFilter('');
    setSearch(''); setSearchInput('');
    setAppliedFilters({ startDate: '', endDate: '', actionFilter: '' });
    setPage(1);
  };

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '10000');
      params.set('page', '1');
      if (appliedFilters.startDate) params.set('startDate', appliedFilters.startDate);
      if (appliedFilters.endDate)   params.set('endDate', appliedFilters.endDate);
      if (appliedFilters.actionFilter) params.set('action', appliedFilters.actionFilter);
      if (search) params.set('search', search);
      const res = await api.get(`/audit/login-history?${params.toString()}`);
      const allLogs = res.data?.logs || logs;
      const headers = ['Timestamp', 'User', 'Email', 'Role', 'Action', 'IP Address'];
      const rows = allLogs.map(log => [
        log.createdAt || '',
        `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim(),
        log.user?.email || '',
        log.user?.role || '',
        log.action || '',
        log.ipAddress || '',
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `login_history_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Login history CSV export failed', err); }
  };

  const getInitials = (user) =>
    `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-headline-lg text-on-surface">Login History</h2>
        <p className="text-body-lg text-on-surface-variant">
          Track user sign-in and sign-out activity across the system
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Total Events',
            value: summary?.totalEvents ?? '—',
            icon: 'history',
            color: 'text-primary',
          },
          {
            label: 'Unique Users',
            value: summary?.uniqueUsers ?? '—',
            icon: 'people',
            color: 'text-secondary',
          },
          {
            label: 'Logins',
            value: summary?.loginCount ?? '—',
            icon: 'login',
            color: 'text-[#2e7d32]',
          },
          {
            label: 'Logouts',
            value: summary?.logoutCount ?? '—',
            icon: 'logout',
            color: 'text-on-surface-variant',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-surface-container-lowest rounded-2xl shadow-sm
              border border-outline-variant p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">
                {kpi.label}
              </p>
              <span
                className={`material-symbols-outlined ${kpi.color}`}
                style={{ fontSize: 22 }}
              >
                {kpi.icon}
              </span>
            </div>
            <p className={`text-headline-md font-bold ${kpi.color}`}>
              {kpi.value}
            </p>
            <p className="text-label-sm text-on-surface-variant mt-1">
              {(startDate || endDate) ? `${startDate || 'start'} – ${endDate || 'today'}` : 'This month'}
            </p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm
        border border-outline-variant p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-lg border border-outline-variant
                focus:border-primary outline-none text-body-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-lg border border-outline-variant
                focus:border-primary outline-none text-body-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1.5">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-lg border border-outline-variant
                focus:border-primary outline-none text-body-sm bg-surface appearance-none"
            >
              <option value="">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1.5">
              Search User
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              placeholder="Name, email, or IP…"
              className="w-full min-h-[44px] px-3 rounded-lg border border-outline-variant
                focus:border-primary outline-none text-body-sm bg-surface"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              className="flex-1 min-h-[44px] bg-primary text-on-primary rounded-lg
                font-semibold text-label-md flex items-center justify-center gap-1.5
                hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                filter_alt
              </span>
              Apply
            </button>
            <button
              onClick={handleClear}
              className="min-h-[44px] px-3 border border-outline-variant rounded-lg
                text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Clear filters"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                close
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm
        border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-container border-b border-outline-variant">
              <tr>
                {['User', 'Role', 'Action', 'IP Address', 'Timestamp'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-label-sm text-on-surface-variant
                      uppercase tracking-wider font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <span
                      className="material-symbols-outlined animate-spin text-primary"
                      style={{ fontSize: 32 }}
                    >
                      progress_activity
                    </span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-on-surface-variant">
                    <span
                      className="material-symbols-outlined block mb-2 text-outline"
                      style={{ fontSize: 40 }}
                    >
                      manage_search
                    </span>
                    No login history found for the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container
                          text-on-primary-container flex items-center justify-center
                          text-label-sm font-bold flex-shrink-0">
                          {getInitials(log.user)}
                        </div>
                        <div>
                          <p className="text-body-sm font-semibold text-on-surface">
                            {log.user?.firstName} {log.user?.lastName}
                          </p>
                          <p className="text-label-sm text-on-surface-variant">
                            {log.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px]
                        font-bold uppercase tracking-wide
                        ${ROLE_BADGE[log.user?.role] || 'bg-surface-container text-on-surface-variant'}`}>
                        {log.user?.role?.replace('_', ' ')}
                      </span>
                    </td>
                    {/* Action */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1
                        rounded-full text-[11px] font-bold uppercase tracking-wide
                        ${ACTION_BADGE[log.action] || 'bg-surface-container text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                          {log.action === 'LOGIN' ? 'login' : 'logout'}
                        </span>
                        {log.action}
                      </span>
                    </td>
                    {/* IP */}
                    <td className="px-4 py-3">
                      <span className="text-body-sm text-on-surface-variant font-mono">
                        {log.ipAddress || '—'}
                      </span>
                    </td>
                    {/* Timestamp */}
                    <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                      {formatDateTime(log.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="px-4 py-3 border-t border-outline-variant
            flex items-center justify-between text-body-sm text-on-surface-variant">
            <span>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–
              {Math.min(page * PAGE_SIZE, total)} of {total} events
            </span>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV} className="flex items-center gap-1.5 text-primary font-semibold text-body-sm hover:underline">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                Export CSV
              </button>
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border
                  border-outline-variant text-on-surface disabled:opacity-40
                  disabled:cursor-not-allowed hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  chevron_left
                </span>
                Prev
              </button>
              <span className="px-3 py-1.5 font-semibold text-primary">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border
                  border-outline-variant text-on-surface disabled:opacity-40
                  disabled:cursor-not-allowed hover:bg-surface-container transition-colors"
              >
                Next
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
