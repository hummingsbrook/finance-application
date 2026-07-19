import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { formatKES, formatDate } from '../../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const TABS = [
  'Income Statement',
  'Financial Position',
  'Cash Flow',
  'Budget vs Actual',
  'Categorical',
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [];
for (let y = CURRENT_YEAR; y >= 2022; y--) YEARS.push(y);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function parseNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function abbreviateKES(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `KES ${(v / 1_000).toFixed(0)}k`;
  return `KES ${v.toFixed(0)}`;
}

// Build the effective { year, month } pair from the current timeline mode.
function getEffectivePeriod(timelineType, selectedYear, selectedMonth, selectedQuarter) {
  if (timelineType === 'Quarterly') {
    return { year: selectedYear, month: selectedQuarter * 3 };
  }
  if (timelineType === 'Annual') {
    return { year: selectedYear, month: 12 };
  }
  return { year: selectedYear, month: selectedMonth };
}

function periodLabel(timelineType, selectedYear, selectedMonth, selectedQuarter) {
  if (timelineType === 'Quarterly') return `Q${selectedQuarter} ${selectedYear}`;
  if (timelineType === 'Annual') return `${selectedYear}`;
  return `${MONTH_FULL[selectedMonth - 1]} ${selectedYear}`;
}

function periodRangeString(timelineType, year, month, quarter) {
  if (timelineType === 'Quarterly') {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    const lastDay = new Date(year, endMonth, 0).getDate();
    return `${MONTH_FULL[startMonth - 1]} 1 — ${MONTH_FULL[endMonth - 1]} ${lastDay}, ${year}`;
  }
  if (timelineType === 'Annual') {
    return `January 1 — December 31, ${year}`;
  }
  const lastDay = new Date(year, month, 0).getDate();
  return `${MONTH_FULL[month - 1]} 1 — ${MONTH_FULL[month - 1]} ${lastDay}, ${year}`;
}

function buildFallbackNarrative(summaryData, language, periodString) {
  const income = Number(summaryData?.totalIncome || 0);
  const expenses = Number(summaryData?.expenses || 0);
  const net = Number(summaryData?.netBalance || 0);
  const tithes = Number(summaryData?.tithes || 0);
  const offerings = Number(summaryData?.offerings || 0);
  const harambees = Number(summaryData?.harambees || 0);

  if (language === 'kiswahili') {
    const p1 =
      `Ripoti ya fedha ya ${periodString} inaonyesha mapato ya jumla ya ${formatKES(income)}, ` +
      `yakijumuisha zaka ya ${formatKES(tithes)}, sadaka ya ${formatKES(offerings)}, ` +
      `na michango ya harambee ya ${formatKES(harambees)}. ` +
      (income > 0
        ? `Michango ya waumini ime${net >= 0 ? 'zidi' : 'pungua'} kiwango kilichotarajiwa kwa kipindi hiki.`
        : `Hakuna mapato yaliyojazwa kwa kipindi hiki.`);
    const p2 =
      `Matumizi ya jumla yalikuwa ${formatKES(expenses)}, na kusababisha ` +
      `${net >= 0 ? 'ziada' : 'upungufu'} wa ${formatKES(Math.abs(net))} kwa kipindi hiki. ` +
      (net >= 0
        ? `Salio hili chanya linaipa kanisa nafasi nzuri ya kukabiliana na majukumu ya uinjilishaji yajayo.`
        : `Kamati ya fedha inashauriwa kukagua matumizi yasiyo ya lazima ili kurekebisha hali ya fedha.`);
    return `${p1}\n\n${p2}`;
  }

  const p1 =
    `The financial report for ${periodString} reflects a total income of ${formatKES(income)}, ` +
    `comprising tithes of ${formatKES(tithes)}, offerings of ${formatKES(offerings)}, ` +
    `and harambee contributions of ${formatKES(harambees)}. ` +
    (income > 0
      ? `The congregation's generosity has ${net >= 0 ? 'surpassed' : 'fallen short of'} the projected targets for the period.`
      : `No income was recorded for this period.`);
  const p2 =
    `Total expenditure stood at ${formatKES(expenses)}, resulting in a net ` +
    `${net >= 0 ? 'surplus' : 'deficit'} of ${formatKES(Math.abs(net))}. ` +
    (net >= 0
      ? `The positive balance positions the church well for upcoming ministry commitments.`
      : `The finance committee is advised to review discretionary expenditures to restore fiscal balance.`);
  return `${p1}\n\n${p2}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Donut chart
// ─────────────────────────────────────────────────────────────────────────────
function IncomeDonut({ tithes, offerings, harambees, total }) {
  const safeTotal = Number(total) || 0;
  const radius = 40;
  const circ = 2 * Math.PI * radius; // ≈ 251.327
  const segs = [
    { label: 'Tithes', value: Number(tithes) || 0, color: 'var(--color-primary)' },
    { label: 'Offerings', value: Number(offerings) || 0, color: 'var(--color-secondary)' },
    { label: 'Harambees', value: Number(harambees) || 0, color: 'var(--color-tertiary)' },
  ];
  const others = Math.max(0, safeTotal - segs.reduce((s, x) => s + x.value, 0));
  if (others > 0) {
    segs.push({ label: 'Others', value: others, color: 'var(--color-outline-variant)' });
  }
  const used = segs.reduce((s, x) => s + x.value, 0);

  let offset = 0;
  const arcs = segs.map((s) => {
    const frac = used > 0 ? s.value / used : 0;
    const len = frac * circ;
    const arc = {
      ...s,
      dash: `${len} ${circ - len}`,
      offset: -offset,
      pct: frac * 100,
    };
    offset += len;
    return arc;
  });

  return (
    <div className="reports-donut-scope flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {/* Track */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="var(--color-outline-variant)"
            strokeWidth="12"
            opacity="0.25"
          />
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={a.color}
              strokeWidth="12"
              strokeDasharray={a.dash}
              strokeDashoffset={a.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total</span>
          <span className="text-headline-md font-bold text-on-surface mt-1">
            {abbreviateKES(safeTotal)}
          </span>
        </div>
      </div>
      <div className="mt-4 w-full space-y-2">
        {arcs.map((a, i) => (
          <div key={i} className="flex items-center justify-between text-body-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ background: a.color }}
              />
              <span className="text-on-surface-variant">{a.label}</span>
            </div>
            <span className="font-semibold text-on-surface">
              {a.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function Reports() {
  const { showError } = useToast();
  const { user } = useAuth();

  // Period
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // New filter state — replaces the old FilterBar state
  const [reportMode, setReportMode] = useState('Monthly'); // 'Monthly' | 'Yearly'
  const [reportSortBy, setReportSortBy] = useState('date'); // 'date' | 'income' | 'expenses' | 'net'

  // Derived: filter is "active" when anything differs from default
  const reportHasActiveFilter =
    reportMode !== 'Monthly' || reportSortBy !== 'date';

  const handleReportFilterClear = () => {
    setReportMode('Monthly');
    setReportSortBy('date');
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth(new Date().getMonth() + 1);
  };

  // Budget (user-editable per report run)
  const [budgetEnabled, setBudgetEnabled] = useState(true);
  const [budgetTithes, setBudgetTithes] = useState('');
  const [budgetOfferings, setBudgetOfferings] = useState('');
  const [budgetHarambees, setBudgetHarambees] = useState('');
  const [budgetExpenseCap, setBudgetExpenseCap] = useState('');

  // Language
  const [language, setLanguage] = useState('english');

  // Data
  const [summary, setSummary] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  // Narrative
  const [narrative, setNarrative] = useState('');
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  // Active preview tab
  const [activeTab, setActiveTab] = useState('Income Statement');

  // Print ref
  const printRef = useRef(null);

  // Memoised effective period (not via useMemo to keep deps simple — recomputed on each render)
  const effective = {
    year: selectedYear,
    month: reportMode === 'Yearly' ? 12 : selectedMonth,
  };
  const periodStr =
    reportMode === 'Yearly'
      ? `${selectedYear}`
      : `${MONTH_FULL[selectedMonth - 1]} ${selectedYear}`;
  const periodRange = (() => {
    if (reportMode === 'Yearly') {
      return `January 1 — December 31, ${selectedYear}`;
    }
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    return `01 ${MONTH_FULL[selectedMonth - 1]} ${selectedYear} – ${lastDay} ${MONTH_FULL[selectedMonth - 1]} ${selectedYear}`;
  })();

  // ── Background narrative generator (does not block report render) ────────
  const generateNarrative = useCallback(
    async (summaryData, breakdownData) => {
      setNarrativeLoading(true);
      setNarrative('');

      const payload = {
        reportData: {
          period: periodStr,
          totalIncome: summaryData.totalIncome,
          totalExpenses: summaryData.expenses,
          netBalance: summaryData.netBalance,
          tithes: summaryData.tithes,
          offerings: summaryData.offerings,
          harambees: summaryData.harambees,
          transactionCount: summaryData.transactionCount,
          budgets: {
            tithes: budgetTithes,
            offerings: budgetOfferings,
            harambees: budgetHarambees,
            expenseCap: budgetExpenseCap,
          },
        },
        language,
      };

      try {
        const res = await api.post('/reports/generate-narrative', payload);
        if (res.data?.narrative) {
          setNarrative(res.data.narrative);
        } else {
          setNarrative(buildFallbackNarrative(summaryData, language, periodStr));
        }
      } catch {
        setNarrative(buildFallbackNarrative(summaryData, language, periodStr));
      } finally {
        setNarrativeLoading(false);
      }
    },
    [
      periodStr, language,
      budgetTithes, budgetOfferings, budgetHarambees, budgetExpenseCap,
    ]
  );

  // ── Generate report ──────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    const saveScroll    = () => document.getElementById('main-scroll')?.scrollTop ?? 0;
    const restoreScroll = (pos) => { const el = document.getElementById('main-scroll'); if (el) el.scrollTop = pos; };
    const scrollPos = saveScroll();

    setLoading(true);
    setReportGenerated(false);

    const { year, month } = effective;
    const isYearly = reportMode === 'Yearly';

    try {
      const [summaryRes, breakdownRes] = await Promise.all([
        isYearly
          ? api.get('/reports/summary/yearly',   { params: { year } })
          : api.get('/reports/summary',          { params: { year, month } }),
        isYearly
          ? api.get('/reports/breakdown/yearly', { params: { year } })
          : api.get('/reports/breakdown',        { params: { year, month } }),
      ]);

      const summaryData = summaryRes.data;
      const breakdownData = breakdownRes.data;

      setSummary(summaryData);
      setBreakdown(breakdownData);
      setReportGenerated(true);
      setActiveTab('Income Statement');
      restoreScroll(scrollPos);

      // Kick off narrative in the background — do not await
      generateNarrative(summaryData, breakdownData).catch(() => {});
    } catch (err) {
      showError(
        err?.response?.data?.message ||
        'Failed to generate report. Please try again.'
      );
    } finally {
      setLoading(false);
      restoreScroll(scrollPos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective.year, effective.month, reportMode, generateNarrative]);

  // ── CSV export removed — was tied to the deleted Statement of Activities tab. ─

  // ─────────────────────────────────────────────────────────────────────────
  // Derived data for rendering
  // ─────────────────────────────────────────────────────────────────────────
  // Income rows = Tithes, Offerings (total only), Harambees
  // Expense rows = each "Expense — <category>" aggregated row
  // Per-service-type offering rows ("Offering — Sunday Main" etc.) are intentionally
  // filtered out — only the combined "Offerings" total is shown.
  const allAgg = breakdown?.aggregated || [];
  const incomeAggRows = allAgg.filter(
    (r) => !r.category.startsWith('Expense') && !r.category.startsWith('Offering —')
  );
  const expenseAggRows = allAgg.filter((r) => r.category.startsWith('Expense'));

  const totalIncome = Number(summary?.totalIncome || 0);
  const totalExpenses = Number(summary?.expenses || 0);
  const netBalance = Number(summary?.netBalance || 0);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Section A — Page Header ─────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">Financial Reports</h2>
        <p className="text-body-lg text-on-surface-variant">Generate and export financial reports</p>
      </div>

      {/* ── Section B — Compact Filter Bar ─────────────────────────── */}

      {/* Active filter badge row — right-aligned, above the card */}
      <div className="flex justify-end mb-2">
        {reportHasActiveFilter && (
          <div className="flex items-center gap-1">
            <div className="bg-secondary-container text-on-secondary-container rounded px-2 py-0.5 font-bold text-label-sm">
              {[reportMode !== 'Monthly', reportSortBy !== 'date'].filter(Boolean).length} Filter Active
            </div>
            <button
              type="button"
              onClick={handleReportFilterClear}
              className="cursor-pointer flex items-center"
              aria-label="Clear filters"
            >
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter card */}
      <div className="bg-surface rounded-xl p-5 shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border-l-4 border-primary-container flex items-center gap-4 mb-6 flex-wrap">

        {/* Monthly / Yearly segmented toggle */}
        <div className="flex items-center bg-surface-container w-[220px] h-[40px] rounded-lg p-1">
          {['Monthly', 'Yearly'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setReportMode(mode)}
              className={`flex-1 h-full rounded text-label-md font-semibold transition-all flex items-center justify-center ${
                reportMode === mode
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-variant/50'
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
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-[40px] px-3 rounded-lg border border-outline-variant bg-surface text-body-sm text-on-surface outline-none focus:border-primary-container transition-colors"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Month selector — only when Monthly */}
        {reportMode === 'Monthly' && (
          <div className="flex items-center gap-2">
            <label className="text-label-sm text-on-surface-variant whitespace-nowrap">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-[40px] px-3 rounded-lg border border-outline-variant bg-surface text-body-sm text-on-surface outline-none focus:border-primary-container transition-colors"
            >
              {MONTH_FULL.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sort By dropdown */}
        <div className="relative w-[200px]">
          <select
            value={reportSortBy}
            onChange={(e) => setReportSortBy(e.target.value)}
            className="w-full h-[40px] pl-9 pr-8 appearance-none bg-surface border border-outline-variant rounded-xl text-on-surface text-body-sm outline-none focus:border-primary-container cursor-pointer transition-colors hover:border-outline"
          >
            <option value="date">Date (Newest)</option>
            <option value="income">Total Income</option>
            <option value="expenses">Total Expenses</option>
            <option value="net">Net Position</option>
          </select>
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            style={{ fontSize: 18 }}
          >
            sort
          </span>
          <span
            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            style={{ fontSize: 20 }}
          >
            expand_more
          </span>
        </div>
      </div>

      {/* Budget Comparison */}
      <div className="mb-6">
        <div className="bg-surface-container-lowest rounded-2xl shadow-md border border-outline-variant p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Budget Comparison</p>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={budgetEnabled}
                onChange={(e) => setBudgetEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <span className="relative w-11 h-6 bg-outline-variant rounded-full peer-checked:bg-primary transition-colors">
                <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
          </div>

          <div className={`space-y-3 ${budgetEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1 ml-1">Tithe Budget (KES)</label>
              <input
                type="number"
                value={budgetTithes}
                onChange={(e) => setBudgetTithes(e.target.value)}
                disabled={!budgetEnabled}
                placeholder="0"
                className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none w-full text-body-lg text-on-surface"
              />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1 ml-1">Offerings Budget (KES)</label>
              <input
                type="number"
                value={budgetOfferings}
                onChange={(e) => setBudgetOfferings(e.target.value)}
                disabled={!budgetEnabled}
                placeholder="0"
                className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none w-full text-body-lg text-on-surface"
              />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1 ml-1">Harambee Budget (KES)</label>
              <input
                type="number"
                value={budgetHarambees}
                onChange={(e) => setBudgetHarambees(e.target.value)}
                disabled={!budgetEnabled}
                placeholder="0"
                className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none w-full text-body-lg text-on-surface"
              />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1 ml-1">Expense Cap (KES)</label>
              <input
                type="number"
                value={budgetExpenseCap}
                onChange={(e) => setBudgetExpenseCap(e.target.value)}
                disabled={!budgetEnabled}
                placeholder="0"
                className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none w-full text-body-lg text-on-surface"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Language + Generate + Export row */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-md border border-outline-variant p-6 mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Report Language:</span>
            <div className="inline-flex rounded-lg overflow-hidden border border-outline-variant">
              {['english', 'kiswahili'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-4 py-1.5 text-label-md font-semibold capitalize transition-colors ${
                    language === l
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-secondary-container/20'
                  }`}
                >
                  {l === 'english' ? 'English' : 'Kiswahili'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl text-headline-md font-bold transition-all ${
            loading
              ? 'bg-primary/70 text-on-primary cursor-not-allowed'
              : 'bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.99]'
          }`}
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined">description</span>
          )}
          {loading ? 'Generating Report…' : 'Generate Report'}
        </button>

        {reportGenerated && (
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container transition-colors text-on-surface font-semibold"
            >
              <span className="material-symbols-outlined text-secondary">print</span>
              Print / Save as PDF
            </button>
          </div>
        )}
      </div>

      {/* ── Section C — Report Preview Card ────────────────────────────── */}
      {reportGenerated && summary && breakdown && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden border border-outline-variant mb-6">

          {/* IDENTITY STRIP */}
          <div className="bg-primary text-on-primary px-6 py-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                <span className="material-symbols-outlined">church</span>
              </div>
              <div>
                <p className="text-headline-md font-bold leading-tight">
                  {user?.churchName || 'Grace Community Church'}
                </p>
                <p className="text-label-sm opacity-80">{periodStr}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-label-md font-semibold"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>print</span>
                Print
              </button>
            </div>
          </div>

          {/* KPI ROW */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-outline-variant">
            <div className="p-5 border-r border-outline-variant">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total Income</p>
              <p className="text-headline-md font-bold text-primary mt-1">{formatKES(totalIncome)}</p>
            </div>
            <div className="p-5 border-r border-outline-variant">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total Expenses</p>
              <p className="text-headline-md font-bold text-error mt-1">{formatKES(totalExpenses)}</p>
            </div>
            <div className="p-5 border-r border-outline-variant">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Net Surplus</p>
              <p className={`text-headline-md font-bold mt-1 ${netBalance >= 0 ? 'text-secondary' : 'text-error'}`}>
                {formatKES(netBalance)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Transactions</p>
              <p className="text-headline-md font-bold text-tertiary mt-1">
                {summary.transactionCount || 0}
              </p>
            </div>
          </div>

          {/* TAB BAR */}
          <div className="overflow-x-auto no-scrollbar border-b border-outline-variant">
            <div className="flex min-w-max">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-5 py-3 text-label-md font-semibold whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === t
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* TAB CONTENT */}
          <div className="p-8">
            {/* ── Income Statement ───────────────────────────────────── */}
            {activeTab === 'Income Statement' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* LEFT — table */}
                <div className="md:col-span-2 overflow-hidden rounded-xl border border-outline-variant">
                  <table className="w-full">
                    <thead className="bg-surface-container">
                      <tr className="text-left">
                        <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-right text-label-sm text-on-surface-variant uppercase tracking-wider">{reportMode === 'Yearly' ? 'This Year' : 'This Month'}</th>
                        <th className="px-4 py-3 text-right text-label-sm text-on-surface-variant uppercase tracking-wider">Budget</th>
                        <th className="px-4 py-3 text-right text-label-sm text-on-surface-variant uppercase tracking-wider">Variance</th>
                        <th className="px-4 py-3 text-right text-label-sm text-on-surface-variant uppercase tracking-wider">% of Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {incomeAggRows.map((row, i) => {
                        const isTithe = row.category === 'Tithes';
                        const isOffering = row.category === 'Offerings' || row.category.startsWith('Offering —');
                        const isHarambee = row.category === 'Harambees';
                        const budget = isTithe
                          ? parseNum(budgetTithes)
                          : isHarambee
                            ? parseNum(budgetHarambees)
                            : isOffering && row.category === 'Offerings'
                              ? parseNum(budgetOfferings)
                              : 0;
                        const showBudget = budgetEnabled && budget > 0 && (isTithe || isHarambee || row.category === 'Offerings');
                        const variance = showBudget ? row.actual - budget : null;
                        const pct = totalIncome > 0 ? (row.actual / totalIncome) * 100 : 0;
                        return (
                          <tr key={i} className="hover:bg-surface-container-low text-body-sm">
                            <td className="px-4 py-3 text-on-surface font-medium">{row.category}</td>
                            <td className="px-4 py-3 text-right text-on-surface">{formatKES(row.actual)}</td>
                            <td className="px-4 py-3 text-right text-on-surface-variant">
                              {showBudget ? formatKES(budget) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {variance === null ? (
                                <span className="text-on-surface-variant">—</span>
                              ) : variance >= 0 ? (
                                <span className="inline-flex items-center gap-1 text-secondary font-semibold">
                                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_upward</span>
                                  {formatKES(Math.abs(variance))}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-error font-semibold">
                                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_downward</span>
                                  {formatKES(Math.abs(variance))}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-on-surface-variant">{pct.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-surface-container font-bold">
                      <tr>
                        <td className="px-4 py-3 text-on-surface">Total Income</td>
                        <td className="px-4 py-3 text-right text-primary">{formatKES(totalIncome)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* RIGHT — donut + insight */}
                <div className="md:col-span-1 space-y-4">
                  <div className="bg-surface-container-low rounded-xl p-4">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-3 text-center">Income Distribution</p>
                    <IncomeDonut
                      tithes={summary.tithes}
                      offerings={summary.offerings}
                      harambees={summary.harambees}
                      total={totalIncome}
                    />
                  </div>

                  <div
                    className="rounded-xl p-4 flex gap-3"
                    style={{
                      background: 'var(--color-tertiary-container)',
                      color: 'var(--color-on-tertiary-container)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>lightbulb</span>
                    <div className="text-body-sm">
                      {narrativeLoading ? (
                        <span className="italic">Generating AI narrative…</span>
                      ) : narrative ? (
                        narrative.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ')
                      ) : netBalance >= 0 ? (
                        `Net surplus of ${formatKES(netBalance)} recorded. Income is ${
                          totalExpenses > 0 ? ((totalIncome / totalExpenses - 1) * 100).toFixed(1) : '100'
                        }% above expenses.`
                      ) : (
                        `A deficit of ${formatKES(Math.abs(netBalance))} was recorded. Recommend reviewing discretionary expenditures.`
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Statement of Activities tab — removed ── */}

            {/* ── Financial Position ─────────────────────────────────── */}
            {activeTab === 'Financial Position' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-outline-variant overflow-hidden">
                  <div className="bg-surface-container px-4 py-3 border-b border-outline-variant">
                    <p className="text-label-md font-bold text-on-surface">Assets</p>
                  </div>
                  <table className="w-full text-body-sm">
                    <tbody className="divide-y divide-outline-variant">
                      <tr>
                        <td className="px-4 py-3 text-on-surface-variant">Current Period Receipts</td>
                        <td className="px-4 py-3 text-right text-on-surface font-semibold">{formatKES(totalIncome)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-on-surface-variant">Less: Disbursements</td>
                        <td className="px-4 py-3 text-right text-error font-semibold">({formatKES(totalExpenses)})</td>
                      </tr>
                      <tr className="bg-surface-container font-bold">
                        <td className="px-4 py-3 text-on-surface">Net Period Assets</td>
                        <td className={`px-4 py-3 text-right ${netBalance >= 0 ? 'text-secondary' : 'text-error'}`}>
                          {formatKES(netBalance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-outline-variant overflow-hidden">
                  <div className="bg-surface-container px-4 py-3 border-b border-outline-variant">
                    <p className="text-label-md font-bold text-on-surface">Liabilities & Net Equity</p>
                  </div>
                  <table className="w-full text-body-sm">
                    <tbody className="divide-y divide-outline-variant">
                      <tr>
                        <td className="px-4 py-3 text-on-surface-variant">Outstanding Liabilities</td>
                        <td className="px-4 py-3 text-right text-on-surface-variant">—</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-on-surface-variant">No outstanding liabilities recorded for this period.</td>
                        <td className="px-4 py-3" />
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-on-surface-variant">Opening Balance</td>
                        <td className="px-4 py-3 text-right text-on-surface-variant">{formatKES(0)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-on-surface-variant">Current Surplus / (Deficit)</td>
                        <td className={`px-4 py-3 text-right font-semibold ${netBalance >= 0 ? 'text-secondary' : 'text-error'}`}>
                          {formatKES(netBalance)}
                        </td>
                      </tr>
                      <tr className="bg-surface-container font-bold">
                        <td className="px-4 py-3 text-on-surface">Total Liab. & Equity</td>
                        <td className={`px-4 py-3 text-right ${netBalance >= 0 ? 'text-secondary' : 'text-error'}`}>
                          {formatKES(netBalance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Cash Flow ──────────────────────────────────────────── */}
            {activeTab === 'Cash Flow' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant">
                    <p className="text-label-md font-bold text-primary mb-3">Operating</p>
                    <div className="space-y-2 text-body-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Receipts</span>
                        <span className="text-on-surface font-semibold">{formatKES(totalIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Payments</span>
                        <span className="text-error font-semibold">({formatKES(totalExpenses)})</span>
                      </div>
                      <div className="flex justify-between border-t border-outline-variant pt-2">
                        <span className="text-on-surface font-semibold">Net</span>
                        <span className={`font-bold ${netBalance >= 0 ? 'text-secondary' : 'text-error'}`}>
                          {formatKES(netBalance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant">
                    <p className="text-label-md font-bold text-primary mb-3">Investing</p>
                    <div className="space-y-2 text-body-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Equipment</span>
                        <span className="text-on-surface-variant">{formatKES(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Maintenance</span>
                        <span className="text-on-surface-variant">{formatKES(0)}</span>
                      </div>
                      <div className="flex justify-between border-t border-outline-variant pt-2">
                        <span className="text-on-surface font-semibold">Net</span>
                        <span className="text-on-surface-variant font-bold">{formatKES(0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant">
                    <p className="text-label-md font-bold text-primary mb-3">Financing</p>
                    <div className="space-y-2 text-body-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Loans</span>
                        <span className="text-on-surface-variant">{formatKES(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Interest</span>
                        <span className="text-on-surface-variant">{formatKES(0)}</span>
                      </div>
                      <div className="flex justify-between border-t border-outline-variant pt-2">
                        <span className="text-on-surface font-semibold">Net</span>
                        <span className="text-on-surface-variant font-bold">{formatKES(0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary text-on-primary rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="text-body-sm">
                    <span className="opacity-80">Opening:</span>{' '}
                    <span className="font-bold">{formatKES(0)}</span>
                  </div>
                  <div className="text-body-sm">
                    <span className="opacity-80">+ Net Flow:</span>{' '}
                    <span className="font-bold">{formatKES(netBalance)}</span>
                  </div>
                  <div className="text-body-sm">
                    <span className="opacity-80">= Closing:</span>{' '}
                    <span className="font-bold">{formatKES(netBalance)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Budget vs Actual ───────────────────────────────────── */}
            {activeTab === 'Budget vs Actual' && (
              !budgetEnabled ? (
                <div className="text-center py-12 bg-surface-container-low rounded-xl">
                  <span className="material-symbols-outlined text-on-surface-variant mb-2 block" style={{ fontSize: 48 }}>lock</span>
                  <p className="text-body-lg text-on-surface-variant">Enable Budget Comparison to view this tab.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-outline-variant">
                  <table className="w-full">
                    <thead className="bg-surface-container">
                      <tr className="text-left">
                        <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wider">Line Item</th>
                        <th className="px-4 py-3 text-right text-label-sm text-on-surface-variant uppercase tracking-wider">Budget</th>
                        <th className="px-4 py-3 text-right text-label-sm text-on-surface-variant uppercase tracking-wider">Actual</th>
                        <th className="px-4 py-3 text-right text-label-sm text-on-surface-variant uppercase tracking-wider">Variance</th>
                        <th className="px-4 py-3 text-center text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {(() => {
                        const rows = [
                          { label: 'Tithes', budget: parseNum(budgetTithes), actual: Number(summary.tithes) || 0, kind: 'income' },
                          { label: 'Offerings', budget: parseNum(budgetOfferings), actual: Number(summary.offerings) || 0, kind: 'income' },
                          { label: 'Harambees', budget: parseNum(budgetHarambees), actual: Number(summary.harambees) || 0, kind: 'income' },
                          { label: 'Expenses', budget: parseNum(budgetExpenseCap), actual: Number(summary.expenses) || 0, kind: 'expense' },
                        ];
                        return rows.map((r) => {
                          const variance = r.actual - r.budget;
                          let badge, badgeText;
                          if (r.kind === 'income') {
                            if (r.actual >= r.budget && r.budget > 0) {
                              badge = 'bg-secondary-container text-on-secondary-container';
                              badgeText = 'ON BUDGET';
                            } else if (r.actual >= r.budget * 0.9) {
                              badge = 'bg-tertiary-fixed text-on-tertiary-fixed-variant';
                              badgeText = 'NEAR';
                            } else {
                              badge = 'bg-error-container text-on-error-container';
                              badgeText = 'UNDER';
                            }
                          } else {
                            // expense — under cap is good
                            if (r.actual <= r.budget || r.budget === 0) {
                              badge = 'bg-secondary-container text-on-secondary-container';
                              badgeText = 'UNDER CAP';
                            } else {
                              badge = 'bg-error-container text-on-error-container';
                              badgeText = 'OVER';
                            }
                          }
                          return (
                            <tr key={r.label} className="hover:bg-surface-container-low text-body-sm">
                              <td className="px-4 py-3 text-on-surface font-medium">{r.label}</td>
                              <td className="px-4 py-3 text-right text-on-surface-variant">{formatKES(r.budget)}</td>
                              <td className="px-4 py-3 text-right text-on-surface font-semibold">{formatKES(r.actual)}</td>
                              <td className={`px-4 py-3 text-right font-semibold ${variance >= 0 ? 'text-secondary' : 'text-error'}`}>
                                {variance >= 0 ? '+' : ''}{formatKES(variance)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold ${badge}`}>
                                  {badgeText}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ── Categorical ────────────────────────────────────────── */}
            {activeTab === 'Categorical' && (
              <div className="space-y-6">
                <div>
                  <p className="text-label-md font-bold text-on-surface mb-3">Income Categories</p>
                  <div className="space-y-3">
                    {incomeAggRows.length === 0 && (
                      <p className="text-body-sm text-on-surface-variant">No income recorded.</p>
                    )}
                    {incomeAggRows.map((r, i) => {
                      const pct = totalIncome > 0 ? (r.actual / totalIncome) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-body-sm mb-1">
                            <span className="text-on-surface-variant">{r.category}</span>
                            <span className="text-on-surface font-semibold">{formatKES(r.actual)} · {pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-bold text-on-surface mb-3">Expense Categories</p>
                  <div className="space-y-3">
                    {expenseAggRows.length === 0 && (
                      <p className="text-body-sm text-on-surface-variant">No expenses recorded.</p>
                    )}
                    {expenseAggRows.map((r, i) => {
                      const pct = totalExpenses > 0 ? (r.actual / totalExpenses) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-body-sm mb-1">
                            <span className="text-on-surface-variant">{r.category.replace(/^Expense — /, '')}</span>
                            <span className="text-on-surface font-semibold">{formatKES(r.actual)} · {pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-error rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section D — PRINTABLE REPORT ─────────────────────────────── */}
      <div ref={printRef}>
        <style>{`
          @media print {
            body > * { display: none !important; }
            .print-report { display: block !important; }
          }
          .print-report { display: none; }
        `}</style>
        {reportGenerated && summary && breakdown && (
          <div className="print-report">
            {/* LETTERHEAD */}
            <div
              style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
              className="px-8 py-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
                  <span className="material-symbols-outlined filled">account_balance</span>
                </div>
                <div>
                  <p className="text-headline-lg font-bold">
                    {user?.churchName || 'Grace Community Church'}
                  </p>
                  <p className="text-label-sm tracking-[0.2em] uppercase opacity-80">Stewardship with Integrity</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-label-sm tracking-widest uppercase opacity-80">Financial Report</p>
                <p className="text-headline-md font-bold">{periodStr}</p>
              </div>
            </div>

            {/* Sub-header */}
            <div className="bg-surface-container px-8 py-3 flex items-center justify-between text-body-sm text-on-surface-variant border-b border-outline-variant">
              <span>Prepared by: {user?.firstName || ''} {user?.lastName || ''}</span>
              <span>Period: {periodRange}</span>
              <span>Generated: {formatDate(new Date())}</span>
            </div>

            {/* SECTION 1 — Executive Summary */}
            <div className="px-8 py-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-sm font-bold">1</span>
                <h3 className="text-headline-md text-on-surface">Executive Summary</h3>
                <div className="flex-1 border-b-2 border-primary-fixed-dim" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="col-span-12 md:col-span-5">
                  <div className="bg-surface-container-low border-l-4 border-secondary rounded-r-xl p-4">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Performance Snapshot</p>
                    <div className="mt-2 space-y-1 text-body-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Total Income</span>
                        <span className="font-semibold text-on-surface">{formatKES(totalIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Total Expenses</span>
                        <span className="font-semibold text-error">({formatKES(totalExpenses)})</span>
                      </div>
                      <div className="flex justify-between border-t border-outline-variant pt-1 mt-1">
                        <span className="font-bold text-on-surface">Net Surplus</span>
                        <span className={`text-headline-md font-bold ${netBalance >= 0 ? 'text-secondary' : 'text-error'}`}>
                          {formatKES(netBalance)}
                        </span>
                      </div>
                    </div>
                    {budgetEnabled && (
                      <div className="mt-3">
                        <p className="text-label-sm text-on-surface-variant mb-1">Budget Achievement</p>
                        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                          {(() => {
                            const budgetTotal =
                              parseNum(budgetTithes) +
                              parseNum(budgetOfferings) +
                              parseNum(budgetHarambees);
                            const pct = budgetTotal > 0 ? Math.min(100, (totalIncome / budgetTotal) * 100) : 0;
                            return (
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-12 md:col-span-7 text-body-sm text-on-surface leading-relaxed">
                  {narrativeLoading ? (
                    <p className="italic text-on-surface-variant">Generating AI narrative…</p>
                  ) : narrative ? (
                    (() => {
                      const paras = narrative.split(/\n\s*\n/);
                      if (paras.length >= 2) {
                        return paras.slice(0, 2).map((p, i) => <p key={i} className="mb-2">{p}</p>);
                      }
                      // fallback: split at ~400 chars
                      if (narrative.length > 400) {
                        const cut = narrative.indexOf('. ', 400);
                        const idx = cut > 0 ? cut + 1 : 400;
                        return [
                          <p key="0" className="mb-2">{narrative.slice(0, idx).trim()}</p>,
                          <p key="1">{narrative.slice(idx).trim()}</p>,
                        ];
                      }
                      return <p>{narrative}</p>;
                    })()
                  ) : (
                    (() => {
                      const fb = buildFallbackNarrative(summary, language, periodStr);
                      const paras = fb.split(/\n\s*\n/);
                      return paras.map((p, i) => <p key={i} className="mb-2">{p}</p>);
                    })()
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2 — Statement of Financial Position */}
            <div className="px-8 py-6 break-inside-avoid">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-sm font-bold">2</span>
                <h3 className="text-headline-md text-on-surface">Statement of Financial Position</h3>
                <div className="flex-1 border-b-2 border-primary-fixed-dim" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <table className="w-full text-body-sm border border-outline-variant">
                  <thead className="bg-surface-container">
                    <tr><th className="px-3 py-2 text-left text-on-surface">Assets</th><th className="px-3 py-2 text-right text-on-surface">KES</th></tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-outline-variant">
                      <td className="px-3 py-2 text-on-surface-variant">Current Period Receipts</td>
                      <td className="px-3 py-2 text-right">{formatKES(totalIncome)}</td>
                    </tr>
                    <tr className="border-t border-outline-variant">
                      <td className="px-3 py-2 text-on-surface-variant">Less: Disbursements</td>
                      <td className="px-3 py-2 text-right text-error">({formatKES(totalExpenses)})</td>
                    </tr>
                    <tr className="border-t border-outline-variant bg-surface-container font-bold">
                      <td className="px-3 py-2">Net Period Assets</td>
                      <td className="px-3 py-2 text-right">{formatKES(netBalance)}</td>
                    </tr>
                  </tbody>
                </table>
                <table className="w-full text-body-sm border border-outline-variant">
                  <thead className="bg-surface-container">
                    <tr><th className="px-3 py-2 text-left text-on-surface">Liab. & Equity</th><th className="px-3 py-2 text-right text-on-surface">KES</th></tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-outline-variant">
                      <td className="px-3 py-2 text-on-surface-variant">Outstanding Liabilities</td>
                      <td className="px-3 py-2 text-right">—</td>
                    </tr>
                    <tr className="border-t border-outline-variant">
                      <td className="px-3 py-2 text-on-surface-variant">Opening Balance</td>
                      <td className="px-3 py-2 text-right">{formatKES(0)}</td>
                    </tr>
                    <tr className="border-t border-outline-variant">
                      <td className="px-3 py-2 text-on-surface-variant">Current Surplus</td>
                      <td className="px-3 py-2 text-right">{formatKES(netBalance)}</td>
                    </tr>
                    <tr className="border-t border-outline-variant bg-surface-container font-bold">
                      <td className="px-3 py-2">Total Liab. & Equity</td>
                      <td className="px-3 py-2 text-right">{formatKES(netBalance)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3 — Statement of Activities — removed */}

            {/* SECTION 4 — Detailed Income Statement */}
            <div className="px-8 py-6 break-before-page break-inside-avoid">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-sm font-bold">4</span>
                <h3 className="text-headline-md text-on-surface">Detailed Income Statement</h3>
                <div className="flex-1 border-b-2 border-primary-fixed-dim" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-label-md font-bold text-primary mb-2">Revenue</p>
                  <table className="w-full text-body-sm">
                    <tbody>
                      {incomeAggRows.map((r, i) => (
                        <tr key={i} className="border-b border-outline-variant">
                          <td className="py-1 text-on-surface-variant">{r.category}</td>
                          <td className="py-1 text-right">{formatKES(r.actual)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t-2 border-outline-variant">
                        <td className="py-1">Total Revenue</td>
                        <td className="py-1 text-right text-primary">{formatKES(totalIncome)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <p className="text-label-md font-bold text-error mb-2">Expenditure</p>
                  <table className="w-full text-body-sm">
                    <tbody>
                      {expenseAggRows.map((r, i) => (
                        <tr key={i} className="border-b border-outline-variant">
                          <td className="py-1 text-on-surface-variant">{r.category.replace(/^Expense — /, '')}</td>
                          <td className="py-1 text-right">({formatKES(r.actual)})</td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t-2 border-outline-variant">
                        <td className="py-1">Total Expenditure</td>
                        <td className="py-1 text-right text-error">({formatKES(totalExpenses)})</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div
                className="mt-4 px-4 py-3 flex items-center justify-between rounded"
                style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
              >
                <span className="font-bold">NET SURPLUS / (DEFICIT)</span>
                <span className="font-bold text-headline-md">{formatKES(netBalance)}</span>
              </div>
            </div>

            {/* SECTION 5 — Cash Flow */}
            <div className="px-8 py-6 break-inside-avoid">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-sm font-bold">5</span>
                <h3 className="text-headline-md text-on-surface">Cash Flow Statement</h3>
                <div className="flex-1 border-b-2 border-primary-fixed-dim" />
              </div>
              <div className="grid grid-cols-3 gap-4 text-body-sm">
                <div className="bg-surface-container-low p-3 rounded border border-outline-variant">
                  <p className="font-bold text-primary mb-2">Operating</p>
                  <div className="flex justify-between"><span className="text-on-surface-variant">Receipts</span><span>{formatKES(totalIncome)}</span></div>
                  <div className="flex justify-between"><span className="text-on-surface-variant">Payments</span><span className="text-error">({formatKES(totalExpenses)})</span></div>
                  <div className="flex justify-between border-t border-outline-variant mt-1 pt-1 font-bold"><span>Net</span><span>{formatKES(netBalance)}</span></div>
                </div>
                <div className="bg-surface-container-low p-3 rounded border border-outline-variant">
                  <p className="font-bold text-primary mb-2">Investing</p>
                  <div className="flex justify-between"><span className="text-on-surface-variant">Equipment</span><span>{formatKES(0)}</span></div>
                  <div className="flex justify-between"><span className="text-on-surface-variant">Maintenance</span><span>{formatKES(0)}</span></div>
                  <div className="flex justify-between border-t border-outline-variant mt-1 pt-1 font-bold"><span>Net</span><span>{formatKES(0)}</span></div>
                </div>
                <div className="bg-surface-container-low p-3 rounded border border-outline-variant">
                  <p className="font-bold text-primary mb-2">Financing</p>
                  <div className="flex justify-between"><span className="text-on-surface-variant">Loans</span><span>{formatKES(0)}</span></div>
                  <div className="flex justify-between"><span className="text-on-surface-variant">Interest</span><span>{formatKES(0)}</span></div>
                  <div className="flex justify-between border-t border-outline-variant mt-1 pt-1 font-bold"><span>Net</span><span>{formatKES(0)}</span></div>
                </div>
              </div>
              <div className="mt-4 bg-surface-container rounded p-3 flex items-center justify-between text-body-sm">
                <span>Opening: <strong>{formatKES(0)}</strong></span>
                <span>+ Net Flow: <strong>{formatKES(netBalance)}</strong></span>
                <span>= Closing: <strong>{formatKES(netBalance)}</strong></span>
              </div>
            </div>

            {/* SECTION 6 — Budget Performance */}
            <div className="px-8 py-6 break-inside-avoid">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-sm font-bold">6</span>
                <h3 className="text-headline-md text-on-surface">Budget Performance</h3>
                <div className="flex-1 border-b-2 border-primary-fixed-dim" />
              </div>
              {!budgetEnabled ? (
                <p className="text-body-sm text-on-surface-variant">Budget comparison was not configured for this report.</p>
              ) : (
                <table className="w-full text-body-sm border border-outline-variant">
                  <thead className="bg-surface-container">
                    <tr>
                      <th className="px-3 py-2 text-left">Line Item</th>
                      <th className="px-3 py-2 text-right">Budget</th>
                      <th className="px-3 py-2 text-right">Actual</th>
                      <th className="px-3 py-2 text-right">Variance</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows = [
                        { label: 'Tithes', budget: parseNum(budgetTithes), actual: Number(summary.tithes) || 0, kind: 'income' },
                        { label: 'Offerings', budget: parseNum(budgetOfferings), actual: Number(summary.offerings) || 0, kind: 'income' },
                        { label: 'Harambees', budget: parseNum(budgetHarambees), actual: Number(summary.harambees) || 0, kind: 'income' },
                        { label: 'Expenses', budget: parseNum(budgetExpenseCap), actual: Number(summary.expenses) || 0, kind: 'expense' },
                      ];
                      return rows.map((r) => {
                        const variance = r.actual - r.budget;
                        let badge, badgeText;
                        if (r.kind === 'income') {
                          if (r.actual >= r.budget && r.budget > 0) { badge = 'bg-secondary-container text-on-secondary-container'; badgeText = 'ON BUDGET'; }
                          else if (r.actual >= r.budget * 0.9) { badge = 'bg-tertiary-fixed text-on-tertiary-fixed-variant'; badgeText = 'NEAR'; }
                          else { badge = 'bg-error-container text-on-error-container'; badgeText = 'UNDER'; }
                        } else {
                          if (r.actual <= r.budget || r.budget === 0) { badge = 'bg-secondary-container text-on-secondary-container'; badgeText = 'UNDER CAP'; }
                          else { badge = 'bg-error-container text-on-error-container'; badgeText = 'OVER'; }
                        }
                        return (
                          <tr key={r.label} className="border-t border-outline-variant">
                            <td className="px-3 py-2">{r.label}</td>
                            <td className="px-3 py-2 text-right">{formatKES(r.budget)}</td>
                            <td className="px-3 py-2 text-right">{formatKES(r.actual)}</td>
                            <td className={`px-3 py-2 text-right ${variance >= 0 ? 'text-secondary' : 'text-error'}`}>
                              {variance >= 0 ? '+' : ''}{formatKES(variance)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${badge}`}>{badgeText}</span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              )}
            </div>

            {/* SECTION 7 — Critical Administrative Notes */}
            <div className="px-8 py-6 break-inside-avoid">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-sm font-bold">7</span>
                <h3 className="text-headline-md text-on-surface">Critical Administrative Notes</h3>
                <div className="flex-1 border-b-2 border-primary-fixed-dim" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {/* Note 1 — Harambee */}
                <div className="bg-surface-container-low border border-outline-variant rounded p-3 text-body-sm">
                  <p className="text-label-sm font-bold text-primary mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span> INFO
                  </p>
                  <p className="text-on-surface">
                    {summary.harambeeCount > 0
                      ? `${summary.harambeeCount} harambee contribution${summary.harambeeCount === 1 ? '' : 's'} totalling ${formatKES(summary.harambees)} were recorded.`
                      : 'No harambee contributions were recorded for this period.'}
                  </p>
                </div>
                {/* Note 2 — Expense utilisation */}
                {(() => {
                  const cap = parseNum(budgetExpenseCap);
                  const util = cap > 0 ? (totalExpenses / cap) * 100 : 0;
                  const warning = cap > 0 && util > 80;
                  return (
                    <div
                      className="border rounded p-3 text-body-sm"
                      style={{
                        background: warning ? 'var(--color-tertiary-fixed)' : 'var(--color-surface-container-low)',
                        color: warning ? 'var(--color-on-tertiary-fixed-variant)' : 'var(--color-on-surface)',
                        borderColor: 'var(--color-outline-variant)',
                      }}
                    >
                      <p className="text-label-sm font-bold mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{warning ? 'warning' : 'info'}</span>
                        {warning ? ' WARNING' : ' INFO'}
                      </p>
                      <p>
                        {cap > 0
                          ? `Expenses of ${formatKES(totalExpenses)} represent ${util.toFixed(1)}% of the ${formatKES(cap)} expense cap.`
                          : 'No expense cap configured — expense utilisation cannot be evaluated.'}
                      </p>
                    </div>
                  );
                })()}
                {/* Note 3 — Transactions */}
                <div className="bg-surface-container-low border border-outline-variant rounded p-3 text-body-sm">
                  <p className="text-label-sm font-bold text-primary mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span> INFO
                  </p>
                  <p className="text-on-surface">
                    {summary.transactionCount || 0} total transactions were processed. Income sources: tithes {summary.titheCount || 0}, offerings {summary.offeringCount || 0}, harambees {summary.harambeeCount || 0}.
                  </p>
                </div>
              </div>
            </div>

            {/* FOOTER — signatures */}
            <div
              className="mt-6 px-8 py-6"
              style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            >
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-label-sm uppercase tracking-widest opacity-80 mb-8">Prepared By</p>
                  <div className="border-t border-white/40 pt-2 text-body-sm">
                    {user?.firstName || ''} {user?.lastName || ''}
                  </div>
                </div>
                <div>
                  <p className="text-label-sm uppercase tracking-widest opacity-80 mb-8">Reviewed By (Treasurer)</p>
                  <div className="border-t border-white/40 pt-2 text-body-sm">&nbsp;</div>
                </div>
                <div>
                  <p className="text-label-sm uppercase tracking-widest opacity-80 mb-8">Approved By (Session)</p>
                  <div className="border-t border-white/40 pt-2 text-body-sm">&nbsp;</div>
                </div>
              </div>
            </div>
            <div className="bg-surface-container-highest text-center py-2 text-label-sm text-on-surface-variant tracking-widest uppercase">
              Confidential — For Church Leadership Use Only
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
