import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatKES, formatDateTime } from '../../lib/utils';
import Button from '../../components/ui/Button';
import KpiCard from '../../components/ui/KpiCard';
import ReactECharts from 'echarts-for-react';

export default function AdminDashboard() {
  const { showError } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
  });
  const [monthlyUsers, setMonthlyUsers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    db: 'checking',
    api: 'checking',
  });
  const [roleData, setRoleData] = useState({ partners: 0, managers: 0, admins: 0, total: 0 });
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, dashboardRes, auditRes, healthRes] = await Promise.allSettled([
        api.get('/users', { params: { limit: 1000 } }),
        api.get('/reports/dashboard'),
        api.get('/audit/logs', { params: { limit: 5 } }),
        api.get('/health'),
      ]);

      // Users
      if (usersRes.status === 'fulfilled') {
        const users = Array.isArray(usersRes.value.data) ? usersRes.value.data : usersRes.value.data?.users || [];
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.isActive !== false).length;

        // Build monthly user growth data (new signups per month, not cumulative)
        const now = new Date();
        const monthLabels = [];
        const monthCounts = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
          monthLabels.push(d.toLocaleDateString('en-US', { month: 'short' }));
          const count = users.filter((u) => {
            const created = new Date(u.createdAt);
            return created >= d && created < monthEnd;
          }).length;
          monthCounts.push(count);
        }
        setMonthlyUsers(monthLabels.map((label, i) => ({ label, value: monthCounts[i] })));

        setStats((prev) => ({ ...prev, totalUsers, activeUsers }));

        // User Roles donut — compute from actual data
        const partners = users.filter(u => u.role === 'PARTNER').length;
        const managers = users.filter(u => u.role === 'MANAGER').length;
        const admins = users.filter(u => u.role === 'SUPER_ADMIN').length;
        setRoleData({ partners, managers, admins, total: totalUsers });
      }

      // Dashboard
      if (dashboardRes.status === 'fulfilled') {
        const res = dashboardRes.value;
        const summary = res.data?.summary;
        if (summary) {
          const totalRevenue = (summary.allTime?.tithes || 0) + (summary.allTime?.offerings || 0);
          const pendingApprovals = summary.currentMonth?.pendingCount || 0;
          setStats((prev) => ({ ...prev, totalRevenue, pendingApprovals }));
        }
      }

      // Recent Activity from audit logs
      if (auditRes.status === 'fulfilled') {
        const logsData = auditRes.value.data?.logs || auditRes.value.data || [];
        const logsArray = Array.isArray(logsData) ? logsData : [];
        setRecentActivity(
          logsArray.slice(0, 5).map((log) => ({
            timestamp: log.createdAt,
            user: `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim() || 'Unknown',
            action: log.action || 'SYSTEM',
            resource: log.module || 'System',
            ip: log.ipAddress || '—',
          }))
        );
      }

      // System Health
      if (healthRes.status === 'fulfilled' && healthRes.value.data?.status === 'ok') {
        setSystemHealth({ db: 'connected', api: 'connected' });
      } else {
        setSystemHealth({ db: 'error', api: 'error' });
      }


    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setLastFetchTime(new Date());
    }
  }, []);

  const formatTime = (d) => d ? d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—';

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Chart helpers
  const maxUserValue = Math.max(...monthlyUsers.map((m) => m.value), 1);

  // Donut chart calculations
  const CIRCUMFERENCE = 2 * Math.PI * 16; // ~100.5
  const partnerLen = roleData.total > 0 ? (roleData.partners / roleData.total) * CIRCUMFERENCE : 0;
  const managerLen = roleData.total > 0 ? (roleData.managers / roleData.total) * CIRCUMFERENCE : 0;
  const adminLen = roleData.total > 0 ? (roleData.admins / roleData.total) * CIRCUMFERENCE : 0;

  const kpiCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: 'group',
      color: 'bg-primary-container text-on-primary-container',
      badge: `${stats.activeUsers} active`,
      badgeColor: 'bg-surface-container-high text-on-surface-variant',
    },
    {
      label: 'Active Users',
      value: stats.activeUsers,
      icon: 'bolt',
      color: 'bg-secondary-container text-on-secondary-container',
      badge: 'Live',
      badgeColor: 'bg-surface-container-high text-on-surface-variant',
    },
    {
      label: 'Total Revenue',
      value: formatKES(stats.totalRevenue),
      icon: 'payments',
      color: 'bg-tertiary-fixed text-on-tertiary-fixed',
      badge: 'Tithes + Offerings',
      badgeColor: 'bg-primary/10 text-primary',
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: 'pending_actions',
      color: 'bg-error-container text-on-error-container',
      badge: stats.pendingApprovals > 0 ? 'Action Req' : 'Clear',
      badgeColor:
        stats.pendingApprovals > 0 ? 'bg-error/10 text-error' : 'bg-secondary-container text-on-secondary-container',
    },
  ];

  const quickActions = [
    { label: 'Add User', icon: 'person_add', path: '/admin/users/create', color: 'text-primary' },
    { label: 'Backup', icon: 'cloud_download', path: '/admin/database', color: 'text-secondary' },
    { label: 'Audit Logs', icon: 'history', path: '/admin/audit-logs', color: 'text-tertiary-container' },
    { label: 'Expenses', icon: 'receipt_long', path: '/admin/expense-oversight', color: 'text-on-surface-variant' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
      </div>
    );
  }

  // FIXED: BUG-1 — removed the `if (error)` render block that referenced an
  // undeclared variable. Fetch failures are surfaced via showError() toast.
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-headline-lg text-on-surface">System Dashboard</h2>
          <p className="text-body-lg text-on-surface-variant">Health and overview of the Stewardship platform</p>
        </div>
        <Button onClick={fetchDashboard} className="self-start sm:self-auto shrink-0">
          <span className="material-symbols-outlined">refresh</span>
          Refresh Data
        </Button>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi) => (
          <KpiCard
            key={kpi.label}
            icon={kpi.icon}
            iconBg={kpi.color}
            label={kpi.label}
            value={kpi.value}
            badge={kpi.badge}
            badgeColor={kpi.badgeColor}
          />
        ))}
      </section>

      {/* Environment & Status Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: 'toggle_on', label: 'Database', value: systemHealth.db === 'connected' ? 'Connected' : 'Error', ok: systemHealth.db === 'connected' },
          { icon: 'cloud_sync', label: 'API Status', value: systemHealth.api === 'connected' ? 'Operational' : 'Down', ok: systemHealth.api === 'connected' },
          { icon: 'shield', label: 'Authentication', value: 'JWT Active', ok: true },
          { icon: 'schedule', label: 'Last Updated', value: lastFetchTime ? formatTime(lastFetchTime) : 'Never', ok: !!lastFetchTime },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined">{item.icon}</span>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">{item.label}</p>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${item.ok ? 'bg-secondary' : 'bg-error'}`}
                />
                <p className="text-label-md text-on-surface">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Environment Status & Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environment Status */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">monitor_heart</span>
            </div>
            <h4 className="text-headline-md text-on-surface">System Status</h4>
          </div>
          <div className="flex-1 space-y-4">
            {[
              { label: 'Platform', value: 'ChurchFinance Pro' },
              { label: 'Features Enabled', value: 'All Core Modules' },
              { label: 'System Health', value: 'All Systems Operational', ok: true },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-outline-variant/10 last:border-0 last:pb-0">
                <span className="text-body-sm text-on-surface-variant">{row.label}</span>
                {row.badge ? (
                  <span className="text-label-sm bg-primary text-on-primary px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">
                    {row.value}
                  </span>
                ) : row.ok ? (
                  <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span className="text-label-md">{row.value}</span>
                  </div>
                ) : (
                  <span className="text-label-md text-on-surface">{row.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined">offline_bolt</span>
            </div>
            <h4 className="text-headline-md text-on-surface">Quick Actions</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="p-6 bg-surface border border-outline-variant/20 rounded-2xl hover:bg-secondary-container/20 hover:border-secondary/30 transition-all group flex flex-col items-center justify-center gap-3 active:scale-95"
              >
                <span className={`material-symbols-outlined text-3xl group-hover:scale-110 transition-transform ${action.color}`}>
                  {action.icon}
                </span>
                <span className="text-label-md text-on-surface">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Bar Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h4 className="text-headline-md text-on-surface">User Growth (6 Months)</h4>
            <div className="flex gap-4">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-primary rounded-full" />
                <span className="text-label-sm text-on-surface-variant">Users</span>
              </span>
            </div>
          </div>
          {monthlyUsers.length > 0 ? (
            <ReactECharts
              notMerge={true}
              style={{ height: '220px', width: '100%' }}
              option={{
                grid: { left: 40, right: 16, top: 16, bottom: 24 },
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                xAxis: {
                  type: 'category',
                  data: monthlyUsers.map((m) => m.label),
                  axisLine: { show: false },
                  axisTick: { show: false },
                  axisLabel: { color: '#5c6060', fontSize: 11 },
                },
                yAxis: {
                  type: 'value',
                  splitLine: { lineStyle: { color: '#f0eded' } },
                  axisLabel: { color: '#5c6060', fontSize: 11 },
                },
                series: [
                  {
                    type: 'bar',
                    data: monthlyUsers.map((m, i) => ({
                      value: m.value,
                      itemStyle: {
                        color: i === monthlyUsers.length - 1 ? '#4caf50' : '#1b6d2433',
                        borderRadius: [4, 4, 0, 0],
                      },
                    })),
                    label: {
                      show: true,
                      position: 'top',
                      color: '#5c6060',
                      fontSize: 11,
                    },
                  },
                ],
              }}
            />
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-body-sm text-on-surface-variant">No user growth data available.</p>
            </div>
          )}
        </div>

        {/* User Roles Donut */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col">
          <h4 className="text-headline-md text-on-surface mb-10">User Roles</h4>
          <div className="flex-1 flex flex-col items-center justify-center">
            <ReactECharts
              notMerge={true}
              style={{ height: '200px', width: '100%' }}
              option={{
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                series: [
                  {
                    type: 'pie',
                    radius: ['55%', '80%'],
                    center: ['50%', '50%'],
                    avoidLabelOverlap: false,
                    label: {
                      show: true,
                      position: 'center',
                      formatter: () => `{total|${stats.totalUsers}}\n{sub|Total}`,
                      rich: {
                        total: { fontSize: 22, fontWeight: 'bold', color: '#1a1c1a' },
                        sub: { fontSize: 11, color: '#5c6060' },
                      },
                    },
                    emphasis: { label: { show: true } },
                    data: [
                      { value: roleData.partners, name: 'Partners', itemStyle: { color: '#4caf50' } },
                      { value: roleData.managers, name: 'Managers', itemStyle: { color: '#a5d6a7' } },
                      { value: roleData.admins, name: 'Admins', itemStyle: { color: '#2e3b2f' } },
                    ],
                  },
                ],
              }}
            />
            <div className="mt-8 space-y-3 w-full">
              {[
                { color: 'bg-secondary', label: 'Partners', count: roleData.partners },
                { color: 'bg-primary-fixed-dim', label: 'Managers', count: roleData.managers },
                { color: 'bg-tertiary-container', label: 'Admins', count: roleData.admins },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-sm ${r.color}`} />
                    <span className="text-label-md text-on-surface">{r.label}</span>
                  </div>
                  <span className="text-label-md text-on-surface-variant">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity Table */}
      <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low/30">
          <h3 className="text-headline-md text-on-surface">Recent System Activity</h3>
          <button
            onClick={fetchDashboard}
            className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container"
          >
            refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 text-label-md text-on-surface-variant">
                <th className="py-4 px-8">Timestamp</th>
                <th className="py-4 px-8">User</th>
                <th className="py-4 px-8">Action</th>
                <th className="py-4 px-8">Resource</th>
                <th className="py-4 px-8 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="text-body-sm text-on-surface divide-y divide-outline-variant/10">
              {recentActivity.length > 0 ? (
                recentActivity.map((row, i) => {
                  const actionCfg = {
                    SIGNUP: { bg: 'bg-secondary/10', text: 'text-secondary' },
                    CREATE: { bg: 'bg-secondary/10', text: 'text-secondary' },
                    UPDATE: { bg: 'bg-primary/10', text: 'text-primary' },
                    DELETE: { bg: 'bg-error/10', text: 'text-error' },
                    LOGIN: { bg: 'bg-surface-container-high', text: 'text-on-surface-variant' },
                  };
                  const ac = actionCfg[row.action] || actionCfg.LOGIN;
                  return (
                    <tr key={i} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-4 px-8 text-on-surface-variant whitespace-nowrap">
                        {formatDateTime(row.timestamp)}
                      </td>
                      <td className="py-4 px-8 font-semibold">{row.user}</td>
                      <td className="py-4 px-8">
                        <span className={`inline-flex px-2.5 py-1 rounded-full font-bold text-[10px] ${ac.bg} ${ac.text}`}>
                          {row.action}
                        </span>
                      </td>
                      <td className="py-4 px-8">{row.resource}</td>
                      <td className="py-4 px-8 text-right tabular-nums text-on-surface-variant">{row.ip}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-on-surface-variant">
                    No recent activity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-8 py-4 bg-surface-container-low/30 border-t border-outline-variant/20 flex justify-between items-center">
          <span className="text-label-sm text-on-surface-variant">
            Showing {recentActivity.length} recent {recentActivity.length === 1 ? 'entry' : 'entries'}
          </span>
          <button
            onClick={() => navigate('/admin/audit-logs')}
            className="text-label-md text-primary hover:underline underline-offset-4 decoration-2 transition-all flex items-center gap-2"
          >
            View Full Audit Logs <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </section>
    </div>
  );
}