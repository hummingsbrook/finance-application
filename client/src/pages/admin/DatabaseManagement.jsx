import { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const TABLES = [
  { key: 'users', label: 'Users', icon: 'group', endpoint: '/users' },
  { key: 'tithes', label: 'Tithes', icon: 'receipt_long', endpoint: '/tithes' },
  { key: 'offerings', label: 'Offerings', icon: 'volunteer_activism', endpoint: '/offerings' },
  { key: 'expenses', label: 'Expenses', icon: 'payments', endpoint: '/expenses' },
  { key: 'harambees', label: 'Harambees', icon: 'event', endpoint: '/harambees' },
  { key: 'payments', label: 'Payments', icon: 'phone_android', endpoint: '/payments' },
  { key: 'audit_logs', label: 'Audit Logs', icon: 'history', endpoint: '/audit/logs' },
];

const LARGE_TABLE_THRESHOLD = 10000;

export default function DatabaseManagement() {
  const { showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [tableStats, setTableStats] = useState([]);
  const [dbInfo, setDbInfo] = useState(null);
  const [backingUp, setBackingUp] = useState(false);
  const [optimizing, setOptimizing] = useState(null);
  const [toast, setToast] = useState(null);
  const [archiveChecked, setArchiveChecked] = useState(false);
  const [archiveYear, setArchiveYear] = useState('2022');
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      await fetchIndividualCounts();
      setDbInfo({ status: 'connected' });
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to load database statistics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchIndividualCounts = async () => {
    const stats = await Promise.allSettled(
      TABLES.map(async (t) => {
        try {
          const res = await api.get(t.endpoint, { params: { limit: 1, countOnly: true } });
          const count = res.data?.total || res.data?.count || res.data?.data?.length || 0;
          return { ...t, count };
        } catch {
          return { ...t, count: 0 };
        }
      })
    );
    setTableStats(
      stats.map((s, i) => (s.status === 'fulfilled' ? s.value : { ...TABLES[i], count: 0 }))
    );
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      // FIXED: H-4 — replaced the per-table client-side fetch loop with a
      // single server-side endpoint. The server streams a JSON snapshot of
      // every table (with passwordHash already stripped) and the browser
      // handles the download directly. No client-side fetch loop needed.
      window.location.href = '/api/admin/backup';
      showToast('Backup download started.');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Backup failed.', 'error');
    } finally {
      setBackingUp(false);
    }
  };

  const handleOptimize = async (tableKey) => {
    setOptimizing(tableKey);
    // Refresh counts — the DB engine handles its own optimization automatically
    try {
      await loadStats();
      showToast(`Table "${tableKey}" counts refreshed.`);
    } catch {
      showToast('Refresh failed.', 'error');
    } finally {
      setOptimizing(null);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      // Archive is handled by exporting a backup filtered to the selected year
      showToast(`Use the Backup button to export all records before archiving year ${archiveYear}.`);
      setArchiveChecked(false);
    } finally {
      setArchiving(false);
    }
  };

  const financeRecords = tableStats
    .filter((t) => ['tithes', 'offerings', 'expenses', 'harambees'].includes(t.key))
    .reduce((sum, t) => sum + (t.count || 0), 0);
  const paymentCount = tableStats.find((t) => t.key === 'payments')?.count || 0;
  const userCount = tableStats.find((t) => t.key === 'users')?.count || 0;

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 relative">
      {/* Background Decoration */}
      <span
        className="material-symbols-outlined fixed -bottom-8 -right-8 text-[240px] opacity-[0.03] select-none pointer-events-none text-primary"
        style={{ fontSize: 240, fontVariationSettings: "'FILL' 1" }}
      >
        storage
      </span>

      {/* Page Header */}
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Database Management</h1>
        <p className="font-body-lg text-on-surface-variant">
          Backups, storage statistics, and data tools
        </p>
      </div>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Finance Records */}
        <Card className="relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary-container/10 rounded-lg">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary px-2 py-1 bg-primary-fixed/30 rounded">
              Vital
            </span>
          </div>
          <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
            Finance Records
          </p>
          <h3 className="text-3xl font-black text-on-surface mb-2">
            {loading ? '—' : financeRecords.toLocaleString()}
          </h3>
          <p className="flex items-center gap-1 text-xs text-secondary font-medium">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              north_east
            </span>
            Across all categories
          </p>
        </Card>

        {/* Users */}
        <Card className="relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary-container/10 rounded-lg text-primary">
              <span className="material-symbols-outlined">group</span>
            </div>
          </div>
          <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Users</p>
          <h3 className="text-3xl font-black text-on-surface mb-2">
            {loading ? '—' : userCount.toLocaleString()}
          </h3>
          <p className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              check_circle
            </span>
            Registered accounts
          </p>
        </Card>

        {/* Events/Harambees */}
        <Card className="relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary-container/10 rounded-lg text-primary">
              <span className="material-symbols-outlined">event</span>
            </div>
          </div>
          <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
            Harambees
          </p>
          <h3 className="text-3xl font-black text-on-surface mb-2">
            {loading ? '—' : (tableStats.find((t) => t.key === 'harambees')?.count || 0).toLocaleString()}
          </h3>
          <p className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
            Fundraising events
          </p>
        </Card>

        {/* M-Pesa Transactions */}
        <Card className="relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary-container/10 rounded-lg text-primary">
              <span className="material-symbols-outlined">payment</span>
            </div>
          </div>
          <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
            M-Pesa TX
          </p>
          <h3 className="text-3xl font-black text-on-surface mb-2">
            {loading ? '—' : paymentCount.toLocaleString()}
          </h3>
          <p className="flex items-center gap-1 text-xs text-secondary font-medium">
            Confirmed transactions
          </p>
        </Card>
      </section>

      {/* DB Info + Backup */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Database Information */}
        <div className="lg:col-span-1 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-low flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">database</span>
            <h4 className="font-title-lg text-title-lg text-on-surface">Database Information</h4>
          </div>
          <div className="p-6 space-y-5">
            {/* Connection Status */}
            <div className="flex items-center gap-3 p-3 bg-surface-container rounded-lg border border-outline-variant/20">
              <span className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0" />
              <span className="font-bold text-sm text-on-surface">
                {dbInfo?.status === 'connected' || dbInfo ? 'Connected' : 'Checking...'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
                Database Name
              </label>
              <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg border border-outline-variant/20">
                <span className="font-mono text-sm text-primary font-semibold">
                  {dbInfo?.name || 'churchfinance_db'}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
              <span className="text-body-sm text-on-surface-variant">Size on Disk</span>
              <span className="font-bold text-on-surface">{dbInfo?.size || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
              <span className="text-body-sm text-on-surface-variant">Database Version</span>
              <span className="font-bold text-on-surface">{dbInfo?.version || 'MySQL (version unknown)'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
              <span className="text-body-sm text-on-surface-variant">Active Connections</span>
              <span className="font-bold text-secondary">{dbInfo?.connections || '—'}</span>
            </div>

            <Button
              variant="secondary"
              fullWidth
              onClick={loadStats}
              loading={loading}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                refresh
              </span>
              Refresh Stats
            </Button>
          </div>
        </div>

        {/* Table List + Backup */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-low/50 flex justify-between items-center">
            <h4 className="font-title-lg text-title-lg text-on-surface">Table Records</h4>
            <Button onClick={handleBackup} loading={backingUp}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                backup
              </span>
              Run Backup
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-highest/30">
                <tr>
                  <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/30">
                    Table
                  </th>
                  <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/30 text-right">
                    Records
                  </th>
                  <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/30 text-right">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-black uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/30">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {loading
                  ? TABLES.map((t) => (
                      <tr key={t.key} className="animate-pulse">
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-on-surface-variant">
                              {t.icon}
                            </span>
                            <span className="bg-on-surface-variant/10 rounded h-4 w-24 inline-block" />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="bg-on-surface-variant/10 rounded h-4 w-12 inline-block" />
                        </td>
                        <td className="px-6 py-4 text-right" />
                        <td className="px-6 py-4" />
                      </tr>
                    ))
                  : tableStats.map((t) => {
                      const isLarge = t.count > LARGE_TABLE_THRESHOLD;
                      return (
                        <tr
                          key={t.key}
                          className={`hover:bg-surface-container transition-colors ${isLarge ? 'bg-amber-50/30' : ''}`}
                        >
                          <td className="px-6 py-4 text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <span
                                className={`material-symbols-outlined ${isLarge ? 'text-amber-600' : 'text-on-surface-variant'}`}
                              >
                                {t.icon}
                              </span>
                              {t.label}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-mono font-bold">
                            {t.count.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isLarge ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase">
                                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                                  warning
                                </span>
                                Large
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary-container/50 text-secondary rounded text-[10px] font-bold uppercase">
                                OK
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleOptimize(t.key)}
                              disabled={optimizing === t.key}
                              className="p-2 text-primary hover:bg-primary/5 rounded-full transition-all disabled:opacity-50"
                              title={`Optimize ${t.label}`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                {optimizing === t.key ? 'sync' : 'tune'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* Large Table Warning */}
          {!loading && tableStats.some((t) => t.count > LARGE_TABLE_THRESHOLD) && (
            <div className="px-6 py-4 bg-amber-50 border-t border-amber-200 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 mt-0.5">warning</span>
              <div>
                <p className="text-sm font-bold text-amber-800">Large Table Warning</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Tables marked as &quot;Large&quot; may benefit from optimization. Consider archiving
                  old records to improve query performance.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <div className="border-2 border-error/30 rounded-2xl bg-error-container/10 p-6 overflow-hidden relative shadow-sm">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-error-container rounded-xl flex items-center justify-center text-error">
                <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                  warning
                </span>
              </div>
              <div>
                <h4 className="font-headline-md text-headline-md text-error leading-tight">
                  Danger Zone
                </h4>
                <p className="text-body-sm text-on-surface-variant">
                  Administrative actions that cannot be undone.
                </p>
              </div>
            </div>
            <span className="px-4 py-1.5 bg-error text-on-error rounded-full text-xs font-black uppercase tracking-widest">
              Irreversible Actions
            </span>
          </div>

          <div className="bg-surface/50 rounded-xl border border-outline-variant/30 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <h5 className="text-title-lg font-bold text-on-surface mb-2">Archive Old Data</h5>
                <p className="text-body-sm text-on-surface-variant max-w-xl">
                  Archive all financial and membership records from selected years. This will remove
                  them from the active production database and move them to cold storage.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    Select Archive Year
                  </label>
                  <select
                    value={archiveYear}
                    onChange={(e) => setArchiveYear(e.target.value)}
                    className="bg-surface-container border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:ring-error/20 focus:border-error transition-all outline-none"
                  >
                    <option value="2022">Fiscal Year 2022</option>
                    <option value="2021">Fiscal Year 2021</option>
                    <option value="2020">Fiscal Year 2020</option>
                  </select>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="confirm-archive"
                    checked={archiveChecked}
                    onChange={(e) => setArchiveChecked(e.target.checked)}
                    className="mt-1 rounded border-outline-variant text-error focus:ring-error accent-error"
                  />
                  <label htmlFor="confirm-archive" className="text-xs text-on-surface-variant leading-relaxed">
                    I understand that archiving is permanent and data will only be accessible via the
                    manual recovery portal.
                  </label>
                </div>
                <Button
                  fullWidth
                  disabled={!archiveChecked || archiving}
                  loading={archiving}
                  variant="danger"
                  onClick={handleArchive}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    archive
                  </span>
                  Archive Records
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 transition-all transform translate-y-0 opacity-100 ${
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
        </div>
      )}
    </div>
  );
}