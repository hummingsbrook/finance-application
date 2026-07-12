import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { formatKES, formatDate, formatDateTime } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import UniversalTable from '../../components/ui/UniversalTable';
import ReactECharts from 'echarts-for-react';
import { useFormValidation } from '../../hooks/useFormValidation';
import { EXPENSE_CATEGORIES, CATEGORY_LABELS } from '../../constants/expenseCategories';

const TABS = [
  { key: 'record', label: 'Record Expense', icon: 'add_circle' },
  { key: 'records', label: 'Expense Records', icon: 'history' },
];

// Colour palette for categories — used in charts and badges
const CATEGORY_COLORS = {
  SALARIES:      '#00450d',
  UTILITIES:     '#1c6d24',
  MAINTENANCE:   '#a0f399',
  EVENTS:        '#f6bc6e',
  TRANSPORT:     '#362000',
  SUPPLIES:      '#ffddb5',
  MISCELLANEOUS: '#c0c9bb',
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function Expenses() {
  const [activeTab, setActiveTab] = useState('record');
  const { showError } = useToast();
  const [loading, setLoading]     = useState(false);

  // ─── Record form ───
  const [form, setForm] = useState({
    description:   '',
    amount:        '',
    date:          new Date().toISOString().split('T')[0],
    category:      '',
    paymentMethod: 'cash',
    recipientName: '',
    mpesaReceiptNo:'',
    bankName:      '',
    accountNo:     '',
    idNumber:      '',
    notes:         '',
  });
  const [submitting,    setSubmitting]    = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [recentExpenses, setRecentExpenses] = useState([]);

  // ─── Records tab ───
  const [expenses,  setExpenses]  = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [summary,   setSummary]   = useState(null);
  const [page,      setPage]      = useState(1);
  const LIMIT = 12;

  // ─── Chart-level filter (mirrors ManagerDashboard pattern, no Sort) ───
  const now = new Date();
  const [chartMode,  setChartMode]  = useState('monthly');  // 'monthly' | 'yearly'
  const [chartYear,  setChartYear]  = useState(now.getFullYear());
  const [chartMonth, setChartMonth] = useState(now.getMonth() + 1);
  const defaultChartYear  = now.getFullYear();
  const defaultChartMonth = now.getMonth() + 1;
  const hasChartActiveFilter =
    chartMode !== 'monthly' ||
    chartYear  !== defaultChartYear  ||
    chartMonth !== defaultChartMonth;

  // ─── Table-level filter (between stacked chart and table) ───
  // From the mockup: Year, Month, Category, Sort By, Search
  const [tableYear,       setTableYear]       = useState(now.getFullYear());
  const [tableMonth,      setTableMonth]      = useState('');
  const [tableCategory,   setTableCategory]   = useState('');
  const [tableSearch,     setTableSearch]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tableSortBy,     setTableSortBy]     = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(tableSearch), 400);
    return () => clearTimeout(t);
  }, [tableSearch]);

  const tableHasActive =
    tableYear     !== now.getFullYear() ||
    tableMonth    !== ''               ||
    tableCategory !== ''               ||
    tableSortBy   !== ''               ||
    tableSearch.trim() !== '';

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const { fieldErrors, validate, clearFieldError, clearAllErrors } = useFormValidation();

  // ─── Scroll preservation ───
  const saveScroll    = () => document.getElementById('main-scroll')?.scrollTop ?? 0;
  const restoreScroll = (pos) => {
    const el = document.getElementById('main-scroll');
    if (el) el.scrollTop = pos;
  };

  // ─── Fetch recent for Record tab sidebar ───
  const fetchRecentExpenses = useCallback(async () => {
    try {
      const res = await api.get('/expenses', { params: { limit: 5, status: 'CONFIRMED' } });
      setRecentExpenses(res.data?.expenses || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchRecentExpenses(); }, [fetchRecentExpenses]);

  // ─── Fetch summary (KPI + charts) ───
  const fetchSummary = useCallback(async () => {
    const pos = saveScroll();
    try {
      if (chartMode === 'yearly') {
        const res = await api.get('/expenses/summary', { params: { year: chartYear, mode: 'yearly' } });
        setSummary(res.data || null);
      } else {
        const res = await api.get('/expenses/summary', {
          params: { year: chartYear, month: chartMonth, mode: 'monthly' },
        });
        setSummary(res.data || null);
      }
    } catch { setSummary(null); }
    finally { restoreScroll(pos); }
  }, [chartMode, chartYear, chartMonth]);

  // ─── Fetch expenses list (table) ───
  const fetchExpenses = useCallback(async () => {
    const pos = saveScroll();
    setLoading(true);
    try {
      const params = { year: tableYear, limit: LIMIT, page };
      if (tableMonth)      params.month    = tableMonth;
      if (tableCategory)   params.category = tableCategory;
      if (debouncedSearch) params.search   = debouncedSearch;
      if (tableSortBy)     params.sortBy   = tableSortBy;
      const res = await api.get('/expenses', { params });
      setExpenses(res.data?.expenses || []);
      setTotalRows(res.data?.total   || 0);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
      restoreScroll(pos);
    }
  }, [tableYear, tableMonth, tableCategory, debouncedSearch, tableSortBy, page]);

  useEffect(() => {
    if (activeTab === 'records') { fetchSummary(); fetchExpenses(); }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch summary when chart filter changes
  useEffect(() => {
    if (activeTab !== 'records') return;
    fetchSummary();
  }, [chartMode, chartYear, chartMonth, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch table when table filter changes
  useEffect(() => {
    if (activeTab !== 'records') return;
    setPage(1);
    fetchExpenses();
  }, [tableYear, tableMonth, tableCategory, debouncedSearch, tableSortBy, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Paginate
  useEffect(() => {
    if (activeTab !== 'records') return;
    fetchExpenses();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Record form handlers ───
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!form.description?.trim()) errors.description = 'Description is required.';
    if (!form.category)            errors.category    = 'Please select a category.';
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) errors.amount = 'Enter a valid amount greater than 0.';
    if (!form.date) errors.date = 'Date is required.';
    if (form.paymentMethod === 'mpesa' && !form.mpesaReceiptNo?.trim())
      errors.mpesaReceiptNo = 'M-Pesa receipt number is required.';
    if (form.paymentMethod === 'bank_transfer') {
      if (!form.bankName?.trim())  errors.bankName  = 'Bank name is required.';
      if (!form.accountNo?.trim()) errors.accountNo = 'Account number is required.';
    }
    if (!validate(errors)) return;

    setSubmitting(true);
    setSubmitSuccess(false);
    try {
      await api.post('/expenses', {
        description:   form.description,
        amount:        parseFloat(form.amount),
        date:          form.date,
        category:      form.category,
        paymentMethod: form.paymentMethod.toUpperCase(),
        recipientName: form.recipientName  || null,
        mpesaReceiptNo:form.mpesaReceiptNo || null,
        bankName:      form.bankName       || null,
        accountNo:     form.accountNo      || null,
        idNumber:      form.idNumber       || null,
        notes:         form.notes          || null,
      });
      setSubmitSuccess(true);
      clearAllErrors();
      setForm({
        description:'', amount:'',
        date: new Date().toISOString().split('T')[0],
        category:'', paymentMethod:'cash', recipientName:'',
        mpesaReceiptNo:'', bankName:'', accountNo:'', idNumber:'', notes:'',
      });
      fetchRecentExpenses();
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to record expense');
    } finally { setSubmitting(false); }
  };

  // ─── Table filter helpers ───
  const clearTableFilters = () => {
    setTableYear(now.getFullYear());
    setTableMonth('');
    setTableCategory('');
    setTableSearch('');
    setTableSortBy('');
  };

  // ─── Display helpers ───
  const categoryBadge = (val) => {
    const color = CATEGORY_COLORS[val] || '#5c6060';
    return (
      <span
        className="inline-flex items-center rounded-full text-[10px] font-bold uppercase px-3 py-1"
        style={{ backgroundColor: color, color: '#fff' }}
      >
        {CATEGORY_LABELS[val] || val || 'General'}
      </span>
    );
  };

  const paymentBadge = (val) => {
    const label = val === 'MPESA' ? 'M-Pesa' : val === 'BANK_TRANSFER' ? 'Bank' : 'Cash';
    return (
      <span className="inline-flex items-center rounded-full text-[10px] font-bold uppercase px-3 py-1 bg-surface-container-high text-on-surface-variant">
        {label}
      </span>
    );
  };

  const statusBadge = (val) => {
    const s = val || 'PENDING';
    let cls = 'bg-amber-100 text-amber-800';
    if (s === 'CONFIRMED') cls = 'bg-secondary-container text-on-secondary-container';
    else if (s === 'REJECTED') cls = 'bg-error-container text-on-error-container';
    else if (s === 'FAILED') cls = 'bg-surface-container-high text-on-surface-variant';
    return (
      <span className={`inline-flex items-center rounded-full text-[10px] font-bold uppercase px-3 py-1 ${cls}`}>
        {s.charAt(0) + s.slice(1).toLowerCase()}
      </span>
    );
  };

  // ─── Chart helpers ───
  const trendLabel = chartMode === 'yearly' ? '4-Year Trend' : '6-Month Trend';
  const trendData  = (summary?.monthlyTrend || []).map((m) => ({ label: m.month, total: m.total || 0 }));
  const categoryTrend = summary?.categoryTrend || [];

  // KPI period label and mode-aware values
  const isYearly = chartMode === 'yearly';
  const kpiPeriodLabel = isYearly
    ? `Full Year ${chartYear}`
    : `${MONTH_NAMES[chartMonth - 1]} ${chartYear}`;

  const kpiTotal = summary?.totalAmount ?? 0;
  const kpiCount = summary?.count ?? 0;
  const kpiTopCat = summary?.mostFrequentCategory ?? null;



  const pageTotal = expenses.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const formatKESFull = (val) => {
    if (val == null || isNaN(val)) return 'KES 0.00';
    return `KES ${Number(val).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const [exportLoading, setExportLoading] = useState(false);

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      // Fetch ALL matching records across pages (server caps at 100 per request)
      const PAGE_SIZE = 100;
      let allRecords = [];
      let currentPage = 1;
      let fetchedTotal = 0;

      do {
        const params = { year: tableYear, limit: PAGE_SIZE, page: currentPage };
        if (tableMonth)      params.month    = tableMonth;
        if (tableCategory)   params.category = tableCategory;
        if (debouncedSearch) params.search   = debouncedSearch;
        if (tableSortBy)     params.sortBy   = tableSortBy;

        const res = await api.get('/expenses', { params });
        const data = res.data;
        const batch = data.expenses || [];
        allRecords = allRecords.concat(batch);
        fetchedTotal = data.total || 0;
        currentPage++;
      } while (allRecords.length < fetchedTotal);

      const headers = [
        'Date',
        'Category',
        'Description',
        'Recipient',
        'ID Number',
        'Payment Method',
        'M-Pesa Receipt No.',
        'Bank Name',
        'Account Number',
        'Amount (KES)',
        'Status',
        'Rejection Reason',
        'Notes',
        'Recorded By',
        'Approved By',
      ];
      const rows = allRecords.map((r) => [
        formatDate(r.date),
        CATEGORY_LABELS[r.category] || r.category || '',
        r.description || '',
        r.recipientName || '',
        r.idNumber || '',
        r.paymentMethod === 'MPESA' ? 'M-Pesa' : r.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Cash',
        r.mpesaReceiptNo || '',
        r.bankName || '',
        r.accountNo || '',
        r.amount != null ? Number(r.amount).toFixed(2) : '0.00',
        r.status || '',
        r.rejectionReason || '',
        r.notes || '',
        r.recordedByUser ? `${r.recordedByUser.firstName || ''} ${r.recordedByUser.lastName || ''}`.trim() : '',
        r.approvedByUser ? `${r.approvedByUser.firstName || ''} ${r.approvedByUser.lastName || ''}`.trim() : '',
      ]);
      const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`) .join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `expenses_${tableYear}${tableMonth ? '_' + String(tableMonth).padStart(2, '0') : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to export expenses');
    } finally {
      setExportLoading(false);
    }
  };


  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">Expenses</h2>
        <p className="text-body-lg text-on-surface-variant">Track and categorize church expenditure</p>
      </div>

      {/* Tabs */}
      <nav className="flex border-b border-outline-variant mb-8 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-label-md whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === tab.key
                ? 'border-b-2 border-primary text-primary font-bold'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ═══════════════════ RECORD TAB ═══════════════════ */}
      {activeTab === 'record' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Description"
                    name="description"
                    value={form.description}
                    onChange={(e) => { handleChange(e); clearFieldError('description'); }}
                    placeholder="e.g. Kenya Power, Alpha Supplies"
                    icon="receipt_long"
                    required
                    error={fieldErrors.description}
                  />

                  <div>
                    <label className="text-label-md text-on-surface-variant">Expense Category</label>
                    <div className="relative mt-1.5">
                      <select
                        name="category"
                        value={form.category}
                        onChange={(e) => { handleChange(e); clearFieldError('category'); }}
                        required
                        className={`w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors appearance-none ${fieldErrors.category ? 'border-error focus:border-error focus:ring-1 focus:ring-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
                      >
                        <option value="">Select category</option>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style={{ fontSize: 20 }}>expand_more</span>
                    </div>
                    {fieldErrors.category && <p className="text-label-sm text-error mt-1">{fieldErrors.category}</p>}
                  </div>

                  <Input
                    label="Amount (KES)"
                    name="amount"
                    type="number"
                    value={form.amount}
                    onChange={(e) => { handleChange(e); clearFieldError('amount'); }}
                    placeholder="0.00"
                    required
                    error={fieldErrors.amount}
                  />

                  <Input
                    label="Transaction Date"
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => { handleChange(e); clearFieldError('date'); }}
                    required
                    error={fieldErrors.date}
                  />
                </div>

                <Input
                  label="Recipient Name (Optional)"
                  name="recipientName"
                  value={form.recipientName}
                  onChange={handleChange}
                  placeholder="e.g. Kenya Power, vendor name"
                  icon="person"
                />

                {/* Payment Method — 3-way toggle */}
                <div className="space-y-3">
                  <label className="text-label-md text-on-surface-variant block">Payment Method</label>
                  <div className="flex p-1 bg-surface-container rounded-xl w-full">
                    {[
                      { value: 'cash',         label: 'Cash'   },
                      { value: 'mpesa',        label: 'M-Pesa' },
                      { value: 'bank_transfer',label: 'Bank'   },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, paymentMethod: value }))}
                        className={`flex-1 px-4 py-2 rounded-lg font-bold text-label-md transition-all ${
                          form.paymentMethod === value
                            ? 'bg-surface-container-lowest text-primary shadow-sm'
                            : 'text-on-surface-variant hover:bg-surface-variant/50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* M-Pesa fields */}
                {form.paymentMethod === 'mpesa' && (
                  <Input
                    label="M-Pesa Receipt Number"
                    name="mpesaReceiptNo"
                    value={form.mpesaReceiptNo}
                    onChange={(e) => { handleChange(e); clearFieldError('mpesaReceiptNo'); }}
                    placeholder="e.g. REC-98234"
                    error={fieldErrors.mpesaReceiptNo}
                  />
                )}

                {/* Bank Transfer fields */}
                {form.paymentMethod === 'bank_transfer' && (
                  <div className="space-y-4 p-4 bg-surface-container rounded-xl border border-outline-variant/50">
                    <p className="text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">Bank Payment Details</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Bank Name"
                        name="bankName"
                        value={form.bankName}
                        onChange={(e) => { handleChange(e); clearFieldError('bankName'); }}
                        placeholder="e.g. KCB, Equity, NCBA"
                        icon="account_balance"
                        required
                        error={fieldErrors.bankName}
                      />
                      <Input
                        label="Account Number"
                        name="accountNo"
                        value={form.accountNo}
                        onChange={(e) => { handleChange(e); clearFieldError('accountNo'); }}
                        placeholder="e.g. 1234567890"
                        required
                        error={fieldErrors.accountNo}
                      />
                    </div>
                    <Input
                      label="ID Number (Optional)"
                      name="idNumber"
                      value={form.idNumber}
                      onChange={handleChange}
                      placeholder="National ID or Passport No."
                      icon="badge"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-label-md text-on-surface-variant mb-1.5">Additional Notes</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Optional details about this expense..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  loading={submitting}
                  fullWidth
                  className={`py-4 text-body-lg rounded-full ${
                    submitSuccess
                      ? '!bg-tertiary !text-on-tertiary'
                      : 'bg-primary-container text-on-primary hover:opacity-90'
                  } shadow-md`}
                >
                  {submitSuccess ? (
                    <><span className="material-symbols-outlined">check_circle</span>Recorded Successfully</>
                  ) : (
                    <><span className="material-symbols-outlined">save</span>Record Expense</>
                  )}
                </Button>
              </form>
            </Card>
          </div>

          {/* Sidebar — Recent Submissions */}
          <div className="lg:col-span-1">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-headline-md text-on-surface">Recent Submissions</h3>
                <button onClick={() => setActiveTab('records')} className="text-secondary font-bold text-label-sm hover:underline">View All</button>
              </div>
              <div className="space-y-3">
                {recentExpenses.length === 0 && (
                  <p className="text-body-sm text-on-surface-variant">No recent submissions</p>
                )}
                {recentExpenses.map((exp, i) => (
                  <div key={exp.id || i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low">
                    <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center">
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>payments</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-bold truncate">{exp.description || '—'}</p>
                      <p className="text-label-sm text-on-surface-variant">{formatDateTime(exp.date || exp.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-body-sm font-bold text-primary">{formatKES(exp.amount)}</p>
                      <p className="text-label-sm text-on-surface-variant">
                        {exp.paymentMethod === 'MPESA' ? 'M-Pesa' : exp.paymentMethod === 'BANK_TRANSFER' ? 'Bank' : 'Cash'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════ RECORDS TAB ═══════════════════ */}
      {activeTab === 'records' && (
        <div className="space-y-6">

          {/* ── A. CHART-LEVEL FILTER (between tab slider and KPI cards) ── */}
          {/* Design from mockup: Year dropdown, Month dropdown (hidden in yearly), Refresh */}
          <div className="bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
            {/* Active filter badge row */}
            {hasChartActiveFilter && (
              <div className="flex justify-end mb-3">
                <div className="flex items-center gap-1">
                  <span className="bg-primary/10 text-primary rounded px-2 py-0.5 font-bold text-label-sm">
                    1 Filter Active
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setChartMode('monthly');
                      setChartYear(defaultChartYear);
                      setChartMonth(defaultChartMonth);
                    }}
                    className="text-outline hover:text-error transition-colors p-1 rounded-full hover:bg-surface-container"
                    aria-label="Clear chart filter"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                </div>
              </div>
            )}

            {/* Controls row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Monthly / Yearly segmented toggle */}
              <div className="inline-flex bg-surface-container-low rounded-lg p-1 h-10">
                {['monthly', 'yearly'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setChartMode(mode)}
                    className={`px-5 rounded-md text-label-md font-medium capitalize transition-all ${
                      chartMode === mode
                        ? 'bg-primary text-on-primary font-bold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              {/* Year dropdown */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" style={{ fontSize: 18 }}>calendar_today</span>
                <select
                  value={chartYear}
                  onChange={(e) => setChartYear(Number(e.target.value))}
                  className="w-full pl-8 pr-2 py-2 h-10 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:ring-0 appearance-none cursor-pointer hover:border-outline transition-colors"
                >
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" style={{ fontSize: 18 }}>arrow_drop_down</span>
              </div>

              {/* Month dropdown — hidden in yearly mode */}
              {chartMode === 'monthly' && (
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-primary pointer-events-none" style={{ fontSize: 18 }}>event</span>
                  <select
                    value={chartMonth}
                    onChange={(e) => setChartMonth(Number(e.target.value))}
                    className="w-full pl-8 pr-2 py-2 h-10 bg-surface border-2 border-primary rounded-lg font-bold text-label-md text-primary focus:ring-0 appearance-none cursor-pointer"
                  >
                    {MONTH_NAMES.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-primary pointer-events-none" style={{ fontSize: 18 }}>arrow_drop_down</span>
                </div>
              )}

              {/* Refresh */}
              <button
                type="button"
                onClick={fetchSummary}
                className="ml-auto p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
                aria-label="Refresh"
                title="Refresh"
              >
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>refresh</span>
              </button>
            </div>
          </div>

          {/* ── B. KPI CARDS ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard
              icon="payments"
              iconBg="bg-primary-container text-on-primary"
              label={isYearly ? 'Total Expenses This Year' : 'Total Expenses'}
              value={formatKES(kpiTotal)}
              subLabel={kpiPeriodLabel}
            />
            <KpiCard
              icon="receipt_long"
              iconBg="bg-secondary-container text-on-secondary-container"
              label={isYearly ? 'Expense Count This Year' : 'Expense Count'}
              value={String(kpiCount)}
              subLabel={kpiPeriodLabel}
            />
            <KpiCard
              icon="category"
              iconBg="bg-tertiary-container text-on-tertiary-container"
              label="Top Category"
              value={kpiTopCat ? (CATEGORY_LABELS[kpiTopCat] || kpiTopCat) : '—'}
              subLabel={isYearly ? `Full year ${chartYear}` : 'By record count'}
            />
          </div>

          {/* ── C. CATEGORY BREAKDOWN + TREND CHART (side by side) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie — Category Breakdown */}
            <div className="bg-surface-container-lowest rounded-xl card-shadow border border-outline-variant/30 p-6 flex flex-col gap-4">
              <h3 className="text-headline-md text-primary">Category Breakdown</h3>
              {(() => {
                const bc = summary?.byCategory || [];
                if (!bc.length) return <div className="h-64 flex items-center justify-center"><p className="text-body-sm text-on-surface-variant">No expense data for this period.</p></div>;
                return (
                  <ReactECharts
                    notMerge={true}
                    style={{ height: '300px', width: '100%' }}
                    option={{
                      tooltip: {
                        trigger: 'item',
                        formatter: (p) => `${p.name}<br/>KES ${Number(p.value).toLocaleString('en-KE', { minimumFractionDigits: 2 })} (${p.percent}%)`,
                      },
                      legend: { orient: 'vertical', right: 8, top: 'middle', textStyle: { color: '#41493e', fontSize: 11 } },
                      series: [{
                        type: 'pie',
                        radius: ['0%', '60%'],
                        center: ['38%', '50%'],
                        avoidLabelOverlap: true,
                        label: { show: true, formatter: (p) => `${p.name}\n${p.percent}%`, fontSize: 11, color: '#41493e' },
                        labelLine: { show: true, length: 10, length2: 12 },
                        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
                        data: bc.map((item) => ({
                          name: CATEGORY_LABELS[item.category] || item.category,
                          value: item.totalAmount,
                          itemStyle: { color: CATEGORY_COLORS[item.category] || '#5c6060' },
                        })),
                      }],
                    }}
                  />
                );
              })()}
            </div>

            {/* Bar — Trend (6-month or 4-year) */}
            <div className="bg-surface-container-lowest rounded-xl card-shadow border border-outline-variant/30 p-6 flex flex-col gap-4">
              <h3 className="text-headline-md text-primary">{trendLabel}</h3>
              {(() => {
                if (!trendData.length) return <div className="h-64 flex items-center justify-center"><p className="text-body-sm text-on-surface-variant">No trend data available.</p></div>;
                return (
                  <ReactECharts
                    notMerge={true}
                    style={{ height: '300px', width: '100%' }}
                    option={{
                      grid: { left: 72, right: 24, top: 16, bottom: 48 },
                      tooltip: {
                        trigger: 'axis',
                        axisPointer: { type: 'shadow' },
                        formatter: (params) => `${params[0].name}<br/>KES ${Number(params[0].value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
                      },
                      xAxis: {
                        type: 'category',
                        data: trendData.map((d) => d.label),
                        axisLine: { lineStyle: { color: '#c0c9bb' } },
                        axisTick: { show: false },
                        axisLabel: { color: '#41493e', fontSize: 11 },
                        splitLine: { show: false },
                      },
                      yAxis: {
                        type: 'value',
                        axisLabel: { color: '#41493e', fontSize: 11, formatter: (v) => `KES ${(v / 1000).toFixed(0)}k` },
                        splitLine: { lineStyle: { color: '#f0eded' } },
                        axisLine: { show: false },
                      },
                      series: [{
                        name: 'Expenses',
                        type: 'bar',
                        data: trendData.map((d) => d.total),
                        itemStyle: { color: '#b71c1c', borderRadius: [4, 4, 0, 0] },
                        barMaxWidth: 48,
                        label: {
                          show: true, position: 'top',
                          formatter: (p) => p.value > 0 ? `KES ${(p.value / 1000).toFixed(0)}k` : '',
                          fontSize: 10, color: '#41493e',
                        },
                      }],
                    }}
                  />
                );
              })()}
            </div>
          </div>

          {/* ── D. STACKED CATEGORY TREND CHART (new — between chart pair and table) ── */}
          {/* From mockup: a stacked bar chart showing expense categories over the trend period */}
          <div className="bg-surface-container-lowest rounded-xl card-shadow border border-outline-variant/30 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-headline-md text-primary">Expense Category Trend</h3>
              <div className="flex items-center gap-3 flex-wrap">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[cat] }}></span>
                    <span className="text-label-sm text-on-surface-variant">{CATEGORY_LABELS[cat]}</span>
                  </div>
                ))}
              </div>
            </div>
            {(() => {
              if (!categoryTrend.length) {
                return (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-body-sm text-on-surface-variant">No category trend data for this period.</p>
                  </div>
                );
              }
              return (
                <ReactECharts
                  notMerge={true}
                  style={{ height: '300px', width: '100%' }}
                  option={{
                    grid: { left: 72, right: 24, top: 16, bottom: 24 },
                    tooltip: {
                      trigger: 'axis',
                      axisPointer: { type: 'shadow' },
                      formatter: (params) => {
                        const header = `${params[0].axisValue}<br/>`;
                        const rows = params
                          .filter((p) => p.value > 0)
                          .map((p) => `${p.marker} ${p.seriesName}: KES ${Number(p.value).toLocaleString('en-KE', { minimumFractionDigits: 2 })}<br/>`)
                          .join('');
                        return header + (rows || 'No data');
                      },
                    },
                    xAxis: {
                      type: 'category',
                      data: categoryTrend.map((d) => d.label),
                      axisLine: { lineStyle: { color: '#c0c9bb' } },
                      axisTick: { show: false },
                      axisLabel: { color: '#41493e', fontSize: 11 },
                      splitLine: { show: false },
                    },
                    yAxis: {
                      type: 'value',
                      axisLabel: { color: '#41493e', fontSize: 11, formatter: (v) => `KES ${(v / 1000).toFixed(0)}k` },
                      splitLine: { lineStyle: { color: '#f0eded' } },
                      axisLine: { show: false },
                    },
                    series: EXPENSE_CATEGORIES.map((cat) => ({
                      name: CATEGORY_LABELS[cat],
                      type: 'bar',
                      stack: 'total',
                      data: categoryTrend.map((d) => d[cat] || 0),
                      itemStyle: { color: CATEGORY_COLORS[cat] || '#ccc' },
                      emphasis: { focus: 'series' },
                    })),
                  }}
                />
              );
            })()}
          </div>

          {/* ── TRANSACTIONS HEADER PANEL ── */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 card-shadow px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="font-headline-md text-on-surface">All Expense Transactions</h4>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  {totalRows} record{totalRows !== 1 ? 's' : ''} found
                </p>
              </div>
              <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={expenses.length === 0 || exportLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-outline-variant text-on-surface text-label-md font-semibold hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className={`material-symbols-outlined${exportLoading ? ' animate-spin' : ''}`} style={{ fontSize: 18 }}>
                    {exportLoading ? 'sync' : 'download'}
                  </span>
                  {exportLoading ? 'Exporting…' : 'Download CSV'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('record')}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary text-label-md font-semibold hover:bg-primary/90 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                  New Expense
                </button>
              </div>
            </div>
          </div>

          {/* ── E. TABLE-LEVEL FILTER ── */}
          <section className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl card-shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">filter_alt</span>
                <h3 className="font-headline-md text-lg text-on-surface">Filter Records</h3>
              </div>
              <button
                type="button"
                onClick={clearTableFilters}
                className="text-secondary font-label-md hover:underline decoration-2 underline-offset-4"
              >
                Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Year */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Year</label>
                <select
                  value={tableYear}
                  onChange={(e) => setTableYear(Number(e.target.value))}
                  className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none text-on-surface"
                >
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Month */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Month</label>
                <select
                  value={tableMonth}
                  onChange={(e) => setTableMonth(e.target.value)}
                  className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none text-on-surface"
                >
                  <option value="">All Months</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Category</label>
                <select
                  value={tableCategory}
                  onChange={(e) => setTableCategory(e.target.value)}
                  className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none text-on-surface"
                >
                  <option value="">All Categories</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Sort By</label>
                <select
                  value={tableSortBy}
                  onChange={(e) => setTableSortBy(e.target.value)}
                  className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none text-on-surface"
                >
                  <option value="">Date Newest</option>
                  <option value="date_asc">Date Oldest</option>
                  <option value="amount_desc">Amount High–Low</option>
                  <option value="amount_asc">Amount Low–High</option>
                </select>
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
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search by description or recipient..."
                  className="w-full bg-surface-container-low border-none rounded-lg pl-10 py-3 text-body-sm focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setTableSearch(tableSearch)}
                className="bg-primary text-on-primary rounded-lg px-4 py-3 text-label-md font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
                Search
              </button>
            </div>
          </section>

                    {/* ── F. DATA TABLE ── */}
          <UniversalTable
            columns={[
              { key: 'date',          label: 'Date' },
              { key: 'category',      label: 'Category' },
              { key: 'description',   label: 'Description' },
              { key: 'recipientName', label: 'Recipient' },
              { key: 'amount',        label: 'Amount',     align: 'right' },
              { key: 'paymentMethod', label: 'Method' },
              { key: 'status',        label: 'Status' },
              { key: 'recordedBy',    label: 'Recorded By', align: 'center' },
            ]}
            data={expenses}
            loading={loading}
            emptyMessage="No expense records found for this period."
            page={page}
            pageSize={LIMIT}
            total={totalRows}
            onPageChange={setPage}
            footerLeft={
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-label-sm text-on-surface-variant">
                  Page total:{' '}
                  <span className="font-bold text-primary">{formatKESFull(pageTotal)}</span>
                  <span className="text-on-surface-variant ml-1">({totalRows} records)</span>
                </span>
              </div>
            }
            renderRow={(row, idx) => (
              <tr key={row.id || idx} className={`hover:bg-surface-container transition-colors ${idx % 2 === 1 ? 'bg-surface-container-low/30' : ''}`}>
                <td className="px-6 py-4 text-body-sm">{formatDate(row.date)}</td>
                <td className="px-6 py-4">{categoryBadge(row.category)}</td>
                <td className="px-6 py-4 text-body-sm">{row.description || '—'}</td>
                <td className="px-6 py-4 text-body-sm">{row.recipientName || '—'}</td>
                <td className="px-6 py-4 text-right font-bold text-primary">{formatKES(row.amount)}</td>
                <td className="px-6 py-4">{paymentBadge(row.paymentMethod)}</td>
                <td className="px-6 py-4">{statusBadge(row.status)}</td>
                <td className="px-6 py-4 text-center text-body-sm text-on-surface-variant">
                  {row.recordedByUser
                    ? `${row.recordedByUser.firstName || ''} ${row.recordedByUser.lastName || ''}`.trim()
                    : '—'}
                </td>
              </tr>
            )}
          />
        </div>
      )}
    </div>
  );
}
