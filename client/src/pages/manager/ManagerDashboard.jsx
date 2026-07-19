import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate, useOutletContext } from 'react-router-dom';
import api from '../../lib/api';
import { formatKES, formatDateTime } from '../../lib/utils';
import Button from '../../components/ui/Button';
import KpiCard from '../../components/ui/KpiCard';
import UniversalTable from '../../components/ui/UniversalTable';
import ReactECharts from 'echarts-for-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Map an activity type to a pill badge config.
const CATEGORY_BADGE = {
  tithe: { bg: 'bg-primary/10', text: 'text-primary', label: 'TITHE' },
  offering: { bg: 'bg-secondary-container', text: 'text-on-secondary-container', label: 'OFFERING' },
  expense: { bg: 'bg-error/10', text: 'text-error', label: 'EXPENSE' },
  harambee: { bg: 'bg-tertiary-fixed/40', text: 'text-tertiary', label: 'HARAMBEE' },
  event: { bg: 'bg-tertiary-fixed/40', text: 'text-tertiary', label: 'EVENT' },
};

function categoryBadge(type) {
  const key = String(type || '').toLowerCase();
  return CATEGORY_BADGE[key] || CATEGORY_BADGE.expense;
}

// ─── Financial Health overlay ─────────────────────────────────
function computeHealth({ currentIncome, currentExpenses, currentNet, allTimeTithes, allTimeOfferings }) {
  const incomeVsBudget =
    currentIncome > 0 && allTimeTithes + allTimeOfferings > 0
      ? (currentIncome / ((allTimeTithes + allTimeOfferings) / 12)) * 100
      : 100;

  const expenseRatio = currentIncome > 0 ? (currentExpenses / currentIncome) * 100 : 0;
  const netPositive = currentNet >= 0;

  let score = 100;
  if (incomeVsBudget < 80) score -= 30;
  else if (incomeVsBudget < 95) score -= 15;
  if (expenseRatio > 80) score -= 30;
  else if (expenseRatio > 60) score -= 15;
  if (!netPositive) score -= 20;
  score = Math.max(0, Math.min(100, score));

  let state = 'HEALTHY';
  if (score < 50) state = 'CRITICAL';
  else if (score < 80) state = 'WARNING';

  return { score, state, incomeVsBudget, expenseRatio, netPositive };
}

const HEALTH_HEADER_STYLE = {
  HEALTHY: { background: '#1b5e20', color: '#ffffff' },
  WARNING: { background: '#F9A825', color: '#2a1800' },
  CRITICAL: { background: '#ba1a1a', color: '#ffffff' },
};

const HEALTH_INSIGHT = {
  HEALTHY:
    'Fiscal health is strong. Income is tracking above projections.',
  WARNING:
    'Income is lagging. Review upcoming expenses to reduce variable costs.',
  CRITICAL:
    'IMMEDIATE ACTION REQUIRED: Expenses have exceeded income. Emergency review recommended.',
};

function HealthOverlay({ open, onClose, health }) {
  if (!open || !health) return null;
  const { score, state, incomeVsBudget, expenseRatio } = health;
  const headerStyle = HEALTH_HEADER_STYLE[state] || HEALTH_HEADER_STYLE.HEALTHY;
  const insight = HEALTH_INSIGHT[state] || HEALTH_INSIGHT.HEALTHY;

  const insightBlock =
    state === 'HEALTHY'
      ? 'bg-secondary-container/10 border-secondary-container/20'
      : state === 'WARNING'
        ? 'bg-tertiary-fixed/20 border-tertiary-container/20'
        : 'bg-error/5 border-error/20';

  const insightIcon =
    state === 'HEALTHY' ? 'lightbulb' : state === 'WARNING' ? 'warning' : 'emergency_home';
  const insightIconColor =
    state === 'HEALTHY' ? 'text-secondary' : state === 'WARNING' ? 'text-tertiary' : 'text-error';
  const insightTitleColor =
    state === 'CRITICAL' ? 'text-error' : 'text-on-surface';

  const metricIconColor =
    state === 'HEALTHY' ? 'text-secondary' : state === 'WARNING' ? 'text-tertiary' : 'text-error';

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-xl overflow-hidden shadow-2xl border border-outline-variant w-full max-w-2xl relative">
        {/* Header */}
        <div style={headerStyle} className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 26 }}>
                monitor_heart
              </span>
            </div>
            <div>
              <h3 className="text-headline-md font-bold" style={{ color: headerStyle.color }}>
                Financial Health
              </h3>
              <p className="text-label-sm opacity-80" style={{ color: headerStyle.color }}>
                ChurchFinance Pro · {monthLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="bg-white/15 px-4 py-2 rounded-lg border border-white/10 text-right"
              style={{ color: headerStyle.color }}
            >
              <div className="text-headline-md font-bold leading-none">{score}/100</div>
              <div className="text-label-sm uppercase tracking-wider opacity-90 mt-1">{state}</div>
            </div>
            <button
              type="button"
              onClick={() => onClose && onClose()}
              aria-label="Close"
              className="text-white/70 hover:text-white transition-colors p-1"
              style={{ color: headerStyle.color, opacity: 0.8 }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Score bar strip */}
        <div className="relative">
          <div className="h-4 w-full flex">
            <div className="flex-1 bg-error" />
            <div className="flex-1" style={{ background: '#F9A825' }} />
            <div className="flex-1 bg-outline-variant" />
            <div className="flex-1" style={{ background: '#88d982' }} />
            <div className="flex-1 bg-secondary" />
          </div>
          <div
            className="absolute"
            style={{
              left: `${score}%`,
              bottom: '-2px',
              transform: 'translateX(-50%)',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid white',
              width: 0,
              height: 0,
            }}
          />
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Three metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <span className={`material-symbols-outlined ${metricIconColor}`} style={{ fontSize: 22 }}>
                  savings
                </span>
              </div>
              <div className={`text-headline-lg font-bold ${metricIconColor}`}>
                {incomeVsBudget.toFixed(1)}%
              </div>
              <p className="text-label-sm text-on-surface-variant mt-1">Income vs Budget</p>
              <div className="mt-2 text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {incomeVsBudget >= 100 ? 'trending_up' : 'trending_down'}
                </span>
                <span>
                  {incomeVsBudget >= 100 ? 'Above' : 'Below'} projected pace
                </span>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <span className={`material-symbols-outlined ${metricIconColor}`} style={{ fontSize: 22 }}>
                  account_balance_wallet
                </span>
              </div>
              <div className={`text-headline-lg font-bold ${metricIconColor}`}>
                {expenseRatio.toFixed(1)}%
              </div>
              <p className="text-label-sm text-on-surface-variant mt-1">Expense Control</p>
              <div className="mt-2 text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {expenseRatio > 80 ? 'trending_up' : 'trending_down'}
                </span>
                <span>
                  {expenseRatio > 80 ? 'Over' : 'Within'} budget threshold
                </span>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <span className={`material-symbols-outlined ${metricIconColor}`} style={{ fontSize: 22 }}>
                  {state === 'CRITICAL' ? 'show_chart' : 'payments'}
                </span>
              </div>
              <div className={`text-headline-lg font-bold ${metricIconColor}`}>
                {formatKES(health.currentNet)}
              </div>
              <p className="text-label-sm text-on-surface-variant mt-1">
                {health.currentNet >= 0 ? 'Net Surplus' : 'Net Deficit'}
              </p>
              <div className="mt-2 text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {health.currentNet >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                <span>{health.currentNet >= 0 ? 'Positive cash flow' : 'Negative cash flow'}</span>
              </div>
            </div>
          </div>

          {/* Smart insight block */}
          <div className={`rounded-lg border p-4 flex gap-3 ${insightBlock}`}>
            <span className={`material-symbols-outlined filled ${insightIconColor}`} style={{ fontSize: 24 }}>
              {insightIcon}
            </span>
            <div>
              <h4 className={`text-label-md font-bold ${insightTitleColor}`}>Smart Insight</h4>
              <p className="text-body-sm text-on-surface-variant mt-1">{insight}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function ManagerDashboard() {
  const { showError } = useToast();
  const navigate = useNavigate();
  const outletCtx = useOutletContext() || {};
  const { showHealthOverlay, onOpenHealth, onCloseHealth } = outletCtx;

  const [dashboard, setDashboard] = useState(null);
  const [yearlyDashboard, setYearlyDashboard] = useState(null);
  const [loading, setLoading] = useState(false);

  // New compact filter state — drives fetchDashboard and the chart
  const [filterMode, setFilterMode] = useState('Monthly'); // 'Monthly' | 'Yearly'
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [hasActiveFilter, setHasActiveFilter] = useState(false);

  // Pagination state for the Recent Activities table.
  const [activityPage, setActivityPage] = useState(1);

  const saveScroll = () => document.getElementById('main-scroll')?.scrollTop ?? 0;
  const restoreScroll = (pos) => {
    const el = document.getElementById('main-scroll');
    if (el) el.scrollTop = pos;
  };

  const fetchDashboard = useCallback(async (params) => {
    const scrollPos = saveScroll();
    setLoading(true);
    try {
      const url = params?.year && params?.month
        ? `/reports/dashboard?year=${params.year}&month=${params.month}`
        : '/reports/dashboard';
      const res = await api.get(url);
      setDashboard(res.data);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => restoreScroll(scrollPos));
    }
  }, []);

  const fetchYearlyDashboard = useCallback(async (year) => {
    const scrollPos = saveScroll();
    setLoading(true);
    try {
      const res = await api.get(`/reports/dashboard/yearly?year=${year}`);
      setYearlyDashboard(res.data);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to load yearly dashboard');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => restoreScroll(scrollPos));
    }
  }, []);

  useEffect(() => {
    if (filterMode === 'Monthly') {
      setYearlyDashboard(null);
      fetchDashboard({ year: filterYear, month: filterMonth });
    } else {
      setDashboard(null);
      fetchYearlyDashboard(filterYear);
    }
    const defaultYear = new Date().getFullYear();
    const defaultMonth = new Date().getMonth() + 1;
    setHasActiveFilter(
      filterMode !== 'Monthly' ||
      filterYear !== defaultYear ||
      filterMonth !== defaultMonth
    );
  }, [filterMode, filterYear, filterMonth, fetchDashboard, fetchYearlyDashboard]);

  // ── Active data source depends on filterMode ─────────────────────────────
  const isYearly = filterMode === 'Yearly';
  const activeData = isYearly ? yearlyDashboard : dashboard;

  // Monthly path
  const summary      = dashboard?.summary || {};
  const currentMonth = summary.currentMonth || {};
  const allTime      = summary.allTime || {};

  // Yearly path
  const yearSummary  = yearlyDashboard?.summary?.currentYear || {};
  const prevYearSum  = yearlyDashboard?.summary?.previousYear || {};

  // KPI values — unified
  const currentIncome   = isYearly ? (yearSummary.totalIncome || 0)  : (currentMonth.totalIncome || 0);
  const currentExpenses = isYearly ? (yearSummary.expenses || 0)     : (currentMonth.expenses || 0);
  const currentNet      = isYearly ? (yearSummary.netBalance || 0)   : (currentMonth.netBalance ?? currentIncome - currentExpenses);
  const pendingCount    = isYearly ? (yearSummary.pendingCount || 0) : (currentMonth.pendingCount || 0);

  // Delta labels — "vs last year" in Yearly mode, "from last month" in Monthly mode
  const allTimeTithes   = allTime.tithes || 0;
  const allTimeOfferings = allTime.offerings || 0;
  const allTimeExpenses = allTime.expenses || 0;
  const allTimeEvents   = allTime.events || 0;

  const lastPeriodIncome   = isYearly ? (prevYearSum.totalIncome || 0)  : (dashboard?.trend?.[4]?.income   || 0);
  const lastPeriodExpenses = isYearly ? (prevYearSum.expenses || 0)     : (dashboard?.trend?.[4]?.expenses || 0);
  const lastPeriodNet      = isYearly ? (prevYearSum.netBalance || 0)   : (dashboard?.trend?.[4]?.net      || 0);

  const incomeDelta  = currentIncome   - lastPeriodIncome;
  const expenseDelta = currentExpenses - lastPeriodExpenses;
  const netDelta     = currentNet      - lastPeriodNet;

  const deltaLabel = isYearly ? 'vs last year' : 'from last month';

  // Chart trend
  const monthlyTrend = dashboard?.trend || [];
  const chartTrend   = isYearly
    ? (yearlyDashboard?.trend || [])      // 5 yearly data points from the new endpoint
    : monthlyTrend.slice(-6);             // last 6 months

  // Activities
  const allActivities = activeData?.recentActivity || [];

  // Chart computations.
  const maxVal = useMemo(
    () => Math.max(...chartTrend.map((t) => Math.max(t.income, t.expenses)), 1),
    [chartTrend],
  );

  // Health overlay data.
  const health = useMemo(() => {
    if (!dashboard) return null;
    return computeHealth({
      currentIncome,
      currentExpenses,
      currentNet,
      allTimeTithes,
      allTimeOfferings,
    });
  }, [dashboard, currentIncome, currentExpenses, currentNet, allTimeTithes, allTimeOfferings]);

  // Budget performance — use monthly average (all-time ÷ 12) as the baseline.
  // Harambees are intentionally excluded; only tithes & offerings are income
  // streams for budget purposes.
  const monthlyAvgTithes   = allTimeTithes / 12;
  const monthlyAvgOfferings = allTimeOfferings / 12;
  const monthlyAvgExpenses  = allTimeExpenses / 12;

  // In yearly mode compare vs previous year totals; in monthly mode vs monthly average
  const tithesCurrent   = isYearly ? (yearSummary.tithes || 0)    : (currentMonth.tithes || 0);
  const offeringsCurrent = isYearly ? (yearSummary.offerings || 0) : (currentMonth.offerings || 0);
  const tithesBase      = isYearly ? (prevYearSum.totalIncome * 0.6 || 1) : (monthlyAvgTithes || 1);
  const offeringsBase   = isYearly ? (prevYearSum.totalIncome * 0.4 || 1) : (monthlyAvgOfferings || 1);
  const expenseBase     = isYearly ? (prevYearSum.expenses || 1)           : (monthlyAvgExpenses || 1);

  const tithesPct      = Math.min(150, (tithesCurrent / tithesBase) * 100);
  const offeringsPct   = Math.min(150, (offeringsCurrent / offeringsBase) * 100);
  const expenseFocusPct = Math.min(150, (currentExpenses / expenseBase) * 100);

  const achievementPct = currentIncome + currentExpenses > 0
    ? (currentIncome / (currentIncome + currentExpenses)) * 100
    : 0;

  // ─── Recent Activities pagination ─────────────────────────────
  // Filtering is removed — the table now shows all activities with
  // simple client-side pagination.
  const ACTIVITY_PAGE_SIZE = 12;

  const pagedActivities = allActivities.slice(
    (activityPage - 1) * ACTIVITY_PAGE_SIZE,
    activityPage * ACTIVITY_PAGE_SIZE
  );

  const activityTotalIncome = allActivities
    .filter((a) => a.type !== 'expense')
    .reduce((sum, a) => sum + (a.amount || 0), 0);
  const activityTotalExpenses = allActivities
    .filter((a) => a.type === 'expense')
    .reduce((sum, a) => sum + (a.amount || 0), 0);

  if (loading && !dashboard && !yearlyDashboard) {
    return (
      <div className="flex justify-center py-12">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
      </div>
    );
  }

  // FIXED: BUG-2 — removed the `if (error && !dashboard && !yearlyDashboard)`
  // render block that referenced an undeclared `error` variable and crashed
  // on every mount. Fetch failures are surfaced via showError() from useToast.
  return (
    <div className="space-y-6">
      {/* A. Header */}
      <div>
        <h2 className="text-headline-lg font-bold text-on-surface">Financial Dashboard</h2>
        <p className="text-body-lg text-on-surface-variant">
          {isYearly
            ? `Annual overview for ${filterYear}`
            : `Overview for ${MONTH_NAMES[filterMonth - 1]} ${filterYear}`}
        </p>
      </div>

      {/* NEW: Compact Filter Bar — between header and KPI cards */}
      <div className="bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
        {/* Top row: active filter badge + clear */}
        <div className="flex justify-end mb-3">
          {hasActiveFilter && (
            <div className="flex items-center gap-1">
              <span className="bg-primary/10 text-primary rounded px-2 py-0.5 font-bold text-label-sm">
                1 Filter Active
              </span>
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() => {
                  setFilterMode('Monthly');
                  setFilterYear(new Date().getFullYear());
                  setFilterMonth(new Date().getMonth() + 1);
                }}
                className="text-on-surface-variant hover:opacity-80 transition-opacity flex items-center"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter controls row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Segmented toggle: Monthly / Yearly */}
          <div className="inline-flex bg-surface-container-low rounded-lg p-1 h-10">
            {['Monthly', 'Yearly'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`px-5 rounded-md text-label-md font-medium transition-all ${
                  filterMode === mode
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Year selector — always visible */}
          <div className="flex items-center gap-2">
            <label className="text-label-sm text-on-surface-variant whitespace-nowrap">Year</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month selector — only visible when filterMode === 'Monthly' */}
          {filterMode === 'Monthly' && (
            <div className="flex items-center gap-2">
              <label className="text-label-sm text-on-surface-variant whitespace-nowrap">Month</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh button — far right */}
          <button
            type="button"
            onClick={() => {
              if (filterMode === 'Monthly') {
                fetchDashboard({ year: filterYear, month: filterMonth });
              } else {
                fetchYearlyDashboard(filterYear);
              }
            }}
            className="ml-auto p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
            aria-label="Refresh dashboard"
            title="Refresh"
          >
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* B. KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1 — Total Income */}
        <KpiCard
          icon="account_balance"
          iconBg="bg-primary/10 text-primary"
          label="Total Income"
          value={formatKES(currentIncome)}
          subLabel={<><span className="material-symbols-outlined" style={{ fontSize: 14 }}>{incomeDelta >= 0 ? 'arrow_upward' : 'arrow_downward'}</span>{`${incomeDelta >= 0 ? '+' : ''}${formatKES(incomeDelta)} ${deltaLabel}`}</>}
          subLabelColor={incomeDelta >= 0 ? 'text-primary' : 'text-error'}
        />

        {/* Card 2 — Total Expenses */}
        <KpiCard
          icon="payments"
          iconBg="bg-error/10 text-error"
          label="Total Expenses"
          value={formatKES(currentExpenses)}
          subLabel={<><span className="material-symbols-outlined" style={{ fontSize: 14 }}>{expenseDelta > 0 ? 'arrow_upward' : 'arrow_downward'}</span>{`${expenseDelta >= 0 ? '+' : ''}${formatKES(expenseDelta)} ${deltaLabel}`}</>}
          subLabelColor={expenseDelta > 0 ? 'text-error' : 'text-primary'}
        />

        {/* Card 3 — Net Surplus */}
        <KpiCard
          icon={currentNet >= 0 ? 'trending_up' : 'trending_down'}
          iconBg={currentNet >= 0 ? 'bg-secondary-container/40 text-secondary' : 'bg-error/10 text-error'}
          label="Net Surplus"
          value={<span className={currentNet >= 0 ? 'text-secondary' : 'text-error'}>{formatKES(currentNet)}</span>}
          subLabel={<><span className="material-symbols-outlined" style={{ fontSize: 14 }}>{netDelta >= 0 ? 'arrow_upward' : 'arrow_downward'}</span>{`${netDelta >= 0 ? '+' : ''}${formatKES(netDelta)} ${deltaLabel}`}</>}
          subLabelColor={netDelta >= 0 ? 'text-secondary' : 'text-error'}
        />

        {/* Card 4 — Pending Approvals */}
        <KpiCard
          icon="pending_actions"
          iconBg="bg-tertiary-fixed/30 text-tertiary"
          label="Pending Approvals"
          value={pendingCount}
          badge={pendingCount > 0 ? 'Action Req' : 'Clear'}
          badgeColor={pendingCount > 0 ? 'bg-error/10 text-error' : 'bg-secondary-container text-on-secondary-container'}
        />
      </div>

      {/* D. Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Financial Performance chart */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
            <div>
              <h4 className="text-headline-md font-bold text-on-surface">Financial Performance</h4>
              <p className="text-label-sm text-on-surface-variant mt-0.5">
                {isYearly
                  ? `Last 5 years · ${filterYear - 4}–${filterYear}`
                  : `Last 6 months · ${MONTH_NAMES[filterMonth - 1]} ${filterYear}`}
              </p>
            </div>
            <div className="flex gap-4">
              <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                <span className="w-3 h-3 rounded-full bg-primary" /> Income
              </span>
              <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                <span className="w-3 h-3 rounded-full bg-error" /> Expenses
              </span>
              <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                <span
                  className="w-3 h-0.5"
                  style={{ background: '#F9A825', borderTop: '2px dashed #F9A825' }}
                />{' '}
                Net Profit
              </span>
            </div>
          </div>

          {chartTrend.length === 0 || maxVal === 1 ? (
            <div className="h-[250px] flex items-center justify-center bg-surface-container rounded-lg">
              <p className="text-body-sm text-on-surface-variant">No data available for this period.</p>
            </div>
          ) : (
            <ReactECharts
              notMerge={true}
              style={{ height: '250px', width: '100%' }}
              option={{
                grid: { left: 48, right: 16, top: 16, bottom: 32 },
                tooltip: {
                  trigger: 'axis',
                  axisPointer: { type: 'shadow' },
                  formatter: (params) =>
                    params
                      .map((p) => `${p.marker} ${p.seriesName}: KES ${p.value?.toLocaleString()}`)
                      .join('<br/>'),
                },
                legend: { show: false },
                xAxis: {
                  type: 'category',
                  data: chartTrend.map((m) => m.label),
                  axisLine: { show: false },
                  axisTick: { show: false },
                  axisLabel: { color: '#5c6060', fontSize: 11 },
                },
                yAxis: {
                  type: 'value',
                  splitLine: { lineStyle: { color: '#f0eded' } },
                  axisLabel: {
                    color: '#5c6060',
                    fontSize: 11,
                    formatter: (v) => `${(v / 1000).toFixed(0)}k`,
                  },
                },
                series: [
                  {
                    name: 'Income',
                    type: 'bar',
                    data: chartTrend.map((m) => m.income),
                    itemStyle: { color: '#1b6d24', borderRadius: [3, 3, 0, 0] },
                  },
                  {
                    name: 'Expenses',
                    type: 'bar',
                    data: chartTrend.map((m) => m.expenses),
                    itemStyle: { color: '#b71c1c', borderRadius: [3, 3, 0, 0] },
                  },
                  {
                    name: 'Net',
                    type: 'line',
                    data: chartTrend.map((m) => m.net),
                    smooth: true,
                    lineStyle: { color: '#F9A825', width: 2, type: 'dashed' },
                    itemStyle: { color: '#F9A825' },
                    symbol: 'circle',
                    symbolSize: 6,
                  },
                ],
              }}
            />
          )}
        </div>

        {/* Right — Budget Performance */}
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm">
          <h4 className="text-headline-md font-bold text-on-surface mb-4">Budget Performance</h4>

          {/* Income Streams */}
          <div className="space-y-4">
            <p className="text-label-sm text-primary uppercase tracking-wider font-bold">Income Streams</p>

            <div>
              <div className="flex items-center justify-between text-label-md mb-1">
                <span className="text-on-surface">Tithes</span>
                <span className="text-on-surface-variant">
                  {tithesPct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, tithesPct)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-label-md mb-1">
                <span className="text-on-surface">Offerings</span>
                <span className="text-on-surface-variant">
                  {offeringsPct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, offeringsPct)}%` }}
                />
              </div>
            </div>

            {/* Events stream */}
            {(() => {
              const eventsCurrent = isYearly
                ? (yearSummary.events || 0)
                : (currentMonth.events || 0);
              const eventsBase = isYearly
                ? (prevYearSum.totalIncome * 0.1 || 1)
                : (allTimeEvents / 12 || 1);
              const eventsPct = Math.min(150, (eventsCurrent / eventsBase) * 100);
              return (
                <div>
                  <div className="flex items-center justify-between text-label-md mb-1">
                    <span className="text-on-surface">Events</span>
                    <span className="text-on-surface-variant">{eventsPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-tertiary-fixed h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, eventsPct)}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Expense Focus */}
          <div className="space-y-2 mt-6">
            <p className="text-label-sm text-error uppercase tracking-wider font-bold">Expense Focus</p>
            <div>
              <div className="flex items-center justify-between text-label-md mb-1">
                <span className="text-on-surface">Expenses</span>
                <span className="text-on-surface-variant">
                  {expenseFocusPct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                <div
                  className="bg-error h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, expenseFocusPct)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Footer grid */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-outline-variant">
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Variance</p>
              <p className={`text-label-md font-bold ${currentNet >= 0 ? 'text-secondary' : 'text-error'}`}>
                {formatKES(currentNet)}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Achievement</p>
              <p className="text-label-md font-bold text-primary">
                {achievementPct.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* E. Recent Activities */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-headline-md font-bold text-on-surface">Recent Activities</h4>
          <button
            type="button"
            onClick={() => navigate('/manager/reports')}
            className="text-primary text-label-md font-semibold inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            View All
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_right_alt</span>
          </button>
        </div>

        <UniversalTable
          columns={[
            { key: 'date',        label: 'Date' },
            { key: 'category',    label: 'Category' },
            { key: 'amount',      label: 'Amount (KES)' },
            { key: 'source',      label: 'Source' },
            { key: 'description', label: 'Contributor / Payee' },
            { key: 'recordedBy',  label: 'Recorded By' },
            { key: 'actions',     label: 'Details', align: 'right' },
          ]}
          data={pagedActivities}
          loading={loading && !!activeData}
          emptyMessage="No recent activity found."
          emptyIcon="inbox"
          page={activityPage}
          pageSize={ACTIVITY_PAGE_SIZE}
          total={allActivities.length}
          onPageChange={setActivityPage}
          footerLeft={
            <span className="text-label-sm text-on-surface-variant flex items-center gap-3">
              <span>Income: <span className="font-bold text-primary">{formatKES(activityTotalIncome)}</span></span>
              <span>Expenses: <span className="font-bold text-error">{formatKES(activityTotalExpenses)}</span></span>
              <span>Net: <span className={`font-bold ${activityTotalIncome - activityTotalExpenses >= 0 ? 'text-secondary' : 'text-error'}`}>{formatKES(activityTotalIncome - activityTotalExpenses)}</span></span>
            </span>
          }
          renderRow={(row, idx) => {
            const badge = categoryBadge(row.type);
            const isExpense = String(row.type).toLowerCase() === 'expense';
            const targetPath =
              row.type === 'expense'    ? '/manager/expenses'
              : row.type === 'tithe'   ? '/manager/tithes'
              : row.type === 'offering'? '/manager/offerings'
              : '/manager/harambees';

            return (
              <tr
                key={`${row.type}-${row.id}`}
                className={`hover:bg-surface-container transition-colors ${idx % 2 === 1 ? 'bg-surface-container-low/30' : ''}`}
              >
                <td className="px-6 py-4 text-body-sm text-on-surface whitespace-nowrap">
                  {formatDateTime(row.date)}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block rounded-full px-3 py-1 text-label-sm font-bold ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                </td>
                <td className={`px-6 py-4 text-body-sm font-bold ${isExpense ? 'text-error' : 'text-on-surface'}`}>
                  {formatKES(row.amount)}
                </td>
                <td className="px-6 py-4 text-body-sm text-on-surface-variant">
                  {row.paymentMethod || '—'}
                </td>
                <td className="px-6 py-4 text-body-sm text-on-surface">
                  {row.description || '—'}
                </td>
                <td className="px-6 py-4 text-body-sm text-on-surface-variant">
                  {row.recordedBy || '—'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => navigate(targetPath)}
                    className="text-primary text-label-sm font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    View
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                  </button>
                </td>
              </tr>
            );
          }}
        />
      </div>

      {/* Financial Health overlay */}
      <HealthOverlay
        open={showHealthOverlay}
        onClose={onCloseHealth}
        health={health ? { ...health, currentNet } : null}
      />

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse-soft {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .pulse-dot {
          animation: pulse-soft 2s infinite;
        }
      `}</style>
    </div>
  );
}
