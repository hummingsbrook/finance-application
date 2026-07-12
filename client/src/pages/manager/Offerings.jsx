import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { formatKES, formatDate } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import KpiCard from '../../components/ui/KpiCard';
import UniversalTable from '../../components/ui/UniversalTable';
import ReactECharts from 'echarts-for-react';
import { useFormValidation } from '../../hooks/useFormValidation';
import OfferingEditOverlay from '../../components/ui/OfferingEditOverlay';

const SERVICE_TYPES = ['Sunday Main', 'Sunday School'];

const TABS = [
  { key: 'record', label: 'Record Offering', icon: 'add_circle' },
  { key: 'records', label: 'Offering Records', icon: 'history' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pctChange(current, previous) {
  if (!previous || previous === 0) return null;
  return (((current - previous) / previous) * 100).toFixed(1);
}

export default function Offerings() {
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState('record');
  const [loading, setLoading] = useState(false);

  // ─── Record form ───
  const [form, setForm] = useState({
    contributorName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    serviceType: 'Sunday Main',
    paymentMethod: 'cash',
    mpesaReceiptNo: '',
    bankName: '',
    chequeNumber: '',
    idNumber: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [recentOfferings, setRecentOfferings] = useState([]);

  // ─── Records tab: table state ───
  const [offerings, setOfferings] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const tableLimit = 12;

  // ─── Chart-level filter (Monthly / Yearly / All) ───
  // This drives both the KPI summary and the Service Comparison chart.
  const [chartMode, setChartMode] = useState('monthly'); // 'monthly' | 'yearly'
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [chartMonth, setChartMonth] = useState(new Date().getMonth() + 1);
  const hasChartActiveFilter =
    chartMode !== 'monthly' ||
    chartYear !== new Date().getFullYear() ||
    chartMonth !== new Date().getMonth() + 1;

  // ─── Table-level filter (between chart and table) ───
  const currentYear = new Date().getFullYear();
  const [filterYear,        setFilterYear]        = useState(currentYear);
  const [filterMonth,       setFilterMonth]       = useState('');
  const [filterServiceType, setFilterServiceType] = useState('');
  const [filterSearch,      setFilterSearch]      = useState('');

  const tableHasActiveFilters =
    filterYear  !== currentYear ||
    filterMonth !== ''          ||
    filterServiceType !== ''    ||
    filterSearch !== '';

  const { fieldErrors, validate, clearFieldError, clearAllErrors } = useFormValidation();

  // ─── Scroll preservation (ref-based — no scroll-to-top on filter change) ───
  const scrollRef = useRef(null);
  const saveScroll = () => {
    const el = document.getElementById('main-scroll');
    scrollRef.current = el ? el.scrollTop : 0;
  };
  const restoreScroll = () => {
    const el = document.getElementById('main-scroll');
    if (el && scrollRef.current != null) el.scrollTop = scrollRef.current;
  };

  // ─── Summary (KPI + chart data) ───
  const [summary, setSummary] = useState(null);

  // ─── Edit overlay ───
  const [editingOffering, setEditingOffering] = useState(null);

  // ─── Delete ───
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // ─── Fetch recent offerings for the Record tab sidebar ───
  const fetchRecentOfferings = useCallback(async () => {
    try {
      const res = await api.get('/offerings', { params: { limit: 5 } });
      setRecentOfferings(res.data?.offerings || []);
    } catch {
      // silent — sidebar is non-critical
    }
  }, []);

  useEffect(() => {
    fetchRecentOfferings();
  }, [fetchRecentOfferings]);

  // ─── Fetch offerings list (table) ───
  const fetchOfferingsList = useCallback(async (usePage) => {
    saveScroll();
    setLoading(true);
    try {
      const params = {
        year:  filterYear,
        limit: tableLimit,
        page:  usePage,
      };
      if (filterMonth)       params.month       = filterMonth;
      if (filterServiceType) params.serviceType = filterServiceType;
      if (filterSearch)      params.search      = filterSearch;

      const res = await api.get('/offerings', { params });
      const data = res.data;
      setOfferings(data.offerings || []);
      setTotalRows(data.total || 0);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to fetch offerings');
    } finally {
      setLoading(false);
      requestAnimationFrame(restoreScroll);
    }
  }, [tableLimit, filterYear, filterMonth, filterServiceType, filterSearch]);

  // ─── Fetch summary (KPI cards + chart) ───
  const fetchSummaryData = useCallback(async () => {
    try {
      if (chartMode === 'yearly') {
        const res = await api.get('/offerings/summary/yearly', { params: { year: chartYear } });
        setSummary(res.data?.summary || null);
      } else {
        const res = await api.get('/offerings/summary', { params: { year: chartYear, month: chartMonth } });
        setSummary(res.data?.summary || null);
      }
    } catch {
      setSummary(null);
    }
  }, [chartMode, chartYear, chartMonth]);

  // ─── Auto-fetch on tab switch ───
  useEffect(() => {
    if (activeTab === 'records') {
      fetchOfferingsList(1);
      fetchSummaryData();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Re-fetch chart/KPI when chart filter changes ───
  useEffect(() => {
    if (activeTab !== 'records') return;
    fetchSummaryData();
  }, [chartMode, chartYear, chartMonth, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Re-fetch table when table filter changes ───
  useEffect(() => {
    if (activeTab !== 'records') return;
    setPage(1);
    fetchOfferingsList(1);
  }, [filterYear, filterMonth, filterServiceType, filterSearch, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Pagination ───
  useEffect(() => {
    if (activeTab !== 'records') return;
    fetchOfferingsList(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Record form handlers ───
  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!form.contributorName?.trim()) errors.contributorName = 'Contributor name is required.';
    const parsedAmount = parseFloat(form.amount);
    if (!form.amount || isNaN(parsedAmount) || parsedAmount <= 0)
      errors.amount = 'Enter a valid amount greater than 0.';
    if (!form.date) errors.date = 'Date is required.';
    if (form.paymentMethod === 'mpesa' && !form.mpesaReceiptNo?.trim())
      errors.mpesaReceiptNo = 'M-Pesa receipt number is required.';
    if (form.paymentMethod === 'bank_transfer') {
      if (!form.bankName?.trim()) errors.bankName = 'Bank name is required.';
      if (!form.chequeNumber?.trim()) errors.chequeNumber = 'Cheque number is required.';
    }
    if (!validate(errors)) return;

    setSubmitting(true);
    setSubmitSuccess(false);
    try {
      await api.post('/offerings', {
        contributorName: form.contributorName,
        amount: parseFloat(form.amount),
        date: form.date,
        serviceType: form.serviceType,
        paymentMethod: form.paymentMethod.toUpperCase(),
        mpesaReceiptNo: form.mpesaReceiptNo || null,
        bankName: form.bankName || null,
        chequeNumber: form.chequeNumber || null,
        idNumber: form.idNumber || null,
        notes: form.notes || null,
      });
      setSubmitSuccess(true);
      clearAllErrors();
      setForm({
        contributorName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        serviceType: 'Sunday Main',
        paymentMethod: 'cash',
        mpesaReceiptNo: '',
        bankName: '',
        chequeNumber: '',
        idNumber: '',
        notes: '',
      });
      fetchRecentOfferings();
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to record offering');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ───
  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/offerings/${confirmDeleteId}`);
      setConfirmDeleteId(null);
      fetchOfferingsList(page);
      fetchSummaryData();
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to delete offering');
      setConfirmDeleteId(null);
    }
  };

  // ─── Overlay edit save handler ───
  const handleEditSave = async (id, payload) => {
    await api.put(`/offerings/${id}`, payload);
    fetchOfferingsList(page);
    fetchSummaryData();
  };

  // ─── CSV Export ───
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
        const params = { year: filterYear, limit: PAGE_SIZE, page: currentPage };
        if (filterMonth)       params.month       = filterMonth;
        if (filterServiceType) params.serviceType = filterServiceType;
        if (filterSearch)      params.search      = filterSearch;

        const res = await api.get('/offerings', { params });
        const data = res.data;
        const batch = data.offerings || [];
        allRecords = allRecords.concat(batch);
        fetchedTotal = data.total || 0;
        currentPage++;
      } while (allRecords.length < fetchedTotal);

      const headers = [
        'Date',
        'Service Type',
        'Contributor',
        'ID Number',
        'Payment Method',
        'M-Pesa Receipt No.',
        'Bank Name',
        'Cheque Number',
        'Amount (KES)',
        'Status',
        'Notes',
        'Recorded By',
      ];
      const rows = allRecords.map((o) => [
        formatDate(o.date),
        o.serviceType || '',
        o.contributorName || '',
        o.idNumber || '',
        paymentMethodLabel(o.paymentMethod),
        o.mpesaReceiptNo || '',
        o.bankName || '',
        o.chequeNumber || '',
        o.amount != null ? Number(o.amount).toFixed(2) : '0.00',
        o.status || '',
        o.notes || '',
        o.recordedByUser
          ? `${o.recordedByUser.firstName || ''} ${o.recordedByUser.lastName || ''}`.trim()
          : '',
      ]);
      const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`) .join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `offerings_${filterYear}${filterMonth ? '_' + String(filterMonth).padStart(2, '0') : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to export offerings');
    } finally {
      setExportLoading(false);
    }
  };

  // ─── Display helpers ───
  const serviceTypeBadge = (type) => {
    switch (type) {
      case 'Sunday Main':
        return <span className="rounded-full text-[10px] font-bold uppercase px-3 py-1 bg-primary-container text-on-primary-container">MAIN SERVICE</span>;
      case 'Sunday School':
        return <span className="rounded-full text-[10px] font-bold uppercase px-3 py-1 bg-secondary-container text-on-secondary-container">SUNDAY SCHOOL</span>;
      default:
        return <span className="rounded-full text-[10px] font-bold uppercase px-3 py-1 bg-surface-container text-on-surface-variant">{type || 'N/A'}</span>;
    }
  };

  const paymentMethodLabel = (val) => {
    switch ((val || '').toUpperCase()) {
      case 'MPESA': return 'M-Pesa';
      case 'CASH': return 'Cash Offering';
      case 'BANK_TRANSFER': return 'Bank Transfer';
      default: return val || 'Cash Offering';
    }
  };

  const formatKESFull = (val) => {
    if (val == null || isNaN(val)) return 'KES 0.00';
    const formatted = Number(val).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `KES ${formatted}`;
  };

  // KPI values — mode-aware
  const isYearly = chartMode === 'yearly';

  const totalValue  = isYearly ? (summary?.totalThisYear  ?? 0) : (summary?.thisMonthTotal  ?? 0);
  const totalPrev   = isYearly ? (summary?.totalLastYear   ?? 0) : (summary?.lastMonthTotal  ?? 0);
  const mainValue   = isYearly
    ? (summary?.yearlyTrend?.at(-1)?.mainService  ?? 0)
    : (summary?.mainServiceThis ?? 0);
  const mainPrev    = isYearly
    ? (summary?.yearlyTrend?.at(-2)?.mainService  ?? 0)
    : (summary?.mainServiceLast ?? 0);
  const schoolValue = isYearly
    ? (summary?.yearlyTrend?.at(-1)?.sundaySchool ?? 0)
    : (summary?.sundaySchoolThis ?? 0);
  const schoolPrev  = isYearly
    ? (summary?.yearlyTrend?.at(-2)?.sundaySchool ?? 0)
    : (summary?.sundaySchoolLast ?? 0);

  const periodLabel = isYearly
    ? `vs. ${chartYear - 1}`
    : 'vs. Last Month';

  const totalPct  = pctChange(totalValue,  totalPrev);
  const mainPct   = pctChange(mainValue,   mainPrev);
  const schoolPct = pctChange(schoolValue, schoolPrev);

  // ─── Chart data derivation ───
  const getChartData = () => {
    if (chartMode === 'yearly') {
      const data = summary?.yearlyTrend || [];
      return {
        xLabels: data.map((d) => d.label),
        mainData: data.map((d) => d.mainService || 0),
        schoolData: data.map((d) => d.sundaySchool || 0),
      };
    }
    // monthly: show last 6 months
    const data = summary?.monthlyTrend || [];
    const sliced = data.slice(-6);
    return {
      xLabels: sliced.map((d) => d.label),
      mainData: sliced.map((d) => d.mainService || 0),
      schoolData: sliced.map((d) => d.sundaySchool || 0),
    };
  };

  const handleTableFilterChange = (key, value) => {
    if (key === 'year')         setFilterYear(Number(value));
    else if (key === 'month')   setFilterMonth(value);
    else if (key === 'serviceType') setFilterServiceType(value);
    else if (key === 'search')  setFilterSearch(value);
  };

  const handleTableFilterClear = () => {
    setFilterYear(currentYear);
    setFilterMonth('');
    setFilterServiceType('');
    setFilterSearch('');
  };

  // ─── Filtered offerings (client-side search filter) ───
  const filteredOfferings = filterSearch.trim()
    ? offerings.filter((o) =>
        (o.contributorName || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
        (o.notes || '').toLowerCase().includes(filterSearch.toLowerCase())
      )
    : offerings;

  // Page total — sum of amounts on the current page (for the table footer)
  const pageTotal = filteredOfferings.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">Offerings</h2>
        <p className="text-body-lg text-on-surface-variant">Track and manage service offerings</p>
      </div>

      {/* Tabs */}
      <nav className="flex border-b border-outline-variant mb-8 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-label-md whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === tab.key
                ? 'text-primary border-b-2 border-primary font-bold'
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
        <div className="grid grid-cols-12 gap-4 lg:gap-8">
          <section className="col-span-12 lg:col-span-7">
            <div className="bg-surface-container-lowest p-4 md:p-8 rounded-xl card-shadow border border-outline-variant/30">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Service Type */}
                <div className="space-y-2">
                  <label className="text-label-md text-on-surface-variant">Service Type</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-xl">
                    {SERVICE_TYPES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, serviceType: st }))}
                        className={`py-3 rounded-lg text-label-md transition-all ${
                          form.serviceType === st
                            ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                            : 'text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contributor Name"
                    name="contributorName"
                    value={form.contributorName}
                    onChange={(e) => { handleChange(e); clearFieldError('contributorName'); }}
                    placeholder="Enter name"
                    icon="person"
                    required
                    error={fieldErrors.contributorName}
                  />
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
                </div>

                <Input
                  label="Service Date"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => { handleChange(e); clearFieldError('date'); }}
                  required
                  error={fieldErrors.date}
                />

                {/* Payment Method — 3-way toggle: Cash | M-Pesa | Bank */}
                <div className="space-y-3">
                  <label className="text-label-md text-on-surface-variant block">Payment Method</label>
                  <div className="flex p-1 bg-surface-container rounded-xl w-full">
                    {[
                      { value: 'cash', label: 'Cash' },
                      { value: 'mpesa', label: 'M-Pesa' },
                      { value: 'bank_transfer', label: 'Bank' },
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
                    placeholder="e.g. RJH8945KL3"
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
                        label="Cheque Number"
                        name="chequeNumber"
                        value={form.chequeNumber}
                        onChange={(e) => { handleChange(e); clearFieldError('chequeNumber'); }}
                        placeholder="e.g. 000123456"
                        required
                        error={fieldErrors.chequeNumber}
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
                  <label className="block text-label-md text-on-surface-variant mb-1.5">Notes (Optional)</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Brief details about the offering..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary resize-none"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    loading={submitting}
                    fullWidth
                    className={`py-4 text-body-lg ${
                      submitSuccess
                        ? '!bg-tertiary !text-on-tertiary'
                        : 'bg-primary-container text-on-primary hover:opacity-90'
                    } shadow-md`}
                  >
                    {submitSuccess ? (
                      <>
                        <span className="material-symbols-outlined">check_circle</span>
                        Successfully Recorded!
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">save</span>
                        Record Offering
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-5 space-y-6">
            {/* Recent Submissions */}
            <div className="bg-surface-container-lowest p-4 md:p-6 rounded-xl border border-outline-variant/30 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-headline-md text-on-surface">Recent Submissions</h3>
                <button
                  onClick={() => setActiveTab('records')}
                  className="text-secondary font-bold text-label-sm hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {recentOfferings.length === 0 && (
                  <p className="text-body-sm text-on-surface-variant text-center py-4">No recent submissions</p>
                )}
                {recentOfferings.map((o, i) => (
                  <div key={o.id || i} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>volunteer_activism</span>
                      </div>
                      <div>
                        <p className="text-label-md text-on-surface font-medium">{o.contributorName || 'Anonymous'}</p>
                        <p className="text-body-sm text-on-surface-variant">{o.serviceType || 'Offering'} · {formatDate(o.date || o.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-label-md">{formatKES(o.amount)}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant uppercase">
                        {(o.paymentMethod || 'CASH') === 'MPESA' ? 'M-Pesa' : (o.paymentMethod || 'CASH') === 'BANK_TRANSFER' ? 'Bank' : 'Cash'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stewardship Card */}
            <div className="relative overflow-hidden bg-primary-container rounded-xl p-6 text-on-primary shadow-lg">
              <div className="absolute -right-12 -top-12 opacity-10">
                <span className="material-symbols-outlined text-[180px]">church</span>
              </div>
              <h3 className="text-headline-md mb-2 relative z-10">Every Gift Counts</h3>
              <p className="text-body-sm opacity-90 relative z-10 mb-6">
                Accurate offering records help the church plan, steward resources wisely, and honour every giver's contribution.
              </p>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg">
                  <p className="text-body-sm opacity-70">This Month</p>
                  <p className="text-headline-md font-bold">{formatKES(summary?.thisMonthTotal ?? 0)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg">
                  <p className="text-body-sm opacity-70">Entries</p>
                  <p className="text-headline-md font-bold">{recentOfferings.length > 0 ? recentOfferings.length + '+' : '0'}</p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/30">
              <h4 className="text-label-md text-primary mb-3">Recording Tips</h4>
              <ul className="space-y-3">
                {[
                  'Select the correct service type — Main Service and Sunday School are tracked separately.',
                  'Double-check the amount before submitting to avoid accounting discrepancies.',
                  'Always enter the M-Pesa code exactly as it appears in the confirmation SMS.',
                ].map((tip, i) => (
                  <li key={i} className="flex gap-3 text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary" style={{ fontSize: 16 }}>check_circle</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}

      {/* ═══════════════════ RECORDS TAB ═══════════════════ */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          {/* ─── CHART-LEVEL FILTER (Monthly / Yearly + Clear) ─── */}
          {/* Positioned between the tab slider and the KPI cards */}
          <div className="bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
            <div className="flex justify-end mb-3">
              {hasChartActiveFilter && (
                <div className="flex items-center gap-1">
                  <span className="bg-primary/10 text-primary rounded px-2 py-0.5 font-bold text-label-sm">
                    1 Filter Active
                  </span>
                  <button
                    type="button"
                    aria-label="Clear filter"
                    onClick={() => {
                      setChartMode('monthly');
                      setChartYear(new Date().getFullYear());
                      setChartMonth(new Date().getMonth() + 1);
                    }}
                    className="text-on-surface-variant hover:opacity-80 transition-opacity flex items-center"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                </div>
              )}
            </div>

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

              {/* Year selector — always visible */}
              <div className="flex items-center gap-2">
                <label className="text-label-sm text-on-surface-variant whitespace-nowrap">Year</label>
                <select
                  value={chartYear}
                  onChange={(e) => setChartYear(Number(e.target.value))}
                  className="h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Month selector — only when monthly mode */}
              {chartMode === 'monthly' && (
                <div className="flex items-center gap-2">
                  <label className="text-label-sm text-on-surface-variant whitespace-nowrap">Month</label>
                  <select
                    value={chartMonth}
                    onChange={(e) => setChartMonth(Number(e.target.value))}
                    className="h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={i + 1} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Refresh */}
              <button
                type="button"
                onClick={fetchSummaryData}
                className="ml-auto p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
                aria-label="Refresh"
                title="Refresh"
              >
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>refresh</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
            </div>
          ) : (
            <>
              {/* ─── KPI CARDS ─── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard
                  icon="payments"
                  iconBg="bg-primary-container text-on-primary"
                  label={isYearly ? 'Total Offerings This Year' : 'Total Offering Collected'}
                  value={formatKES(totalValue)}
                  subLabel={`${periodLabel}  KES ${Number(totalPrev).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
                  badge={totalPct !== null ? `${Number(totalPct) >= 0 ? '+' : ''}${totalPct}%` : undefined}
                  badgeColor={totalPct !== null ? (Number(totalPct) >= 0 ? 'text-secondary font-bold' : 'text-error font-bold') : undefined}
                />
                <KpiCard
                  icon="church"
                  iconBg="bg-secondary-container text-on-secondary-container"
                  label="Main Service"
                  value={formatKES(mainValue)}
                  subLabel={`${periodLabel}  KES ${Number(mainPrev).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
                  badge={mainPct !== null ? `${Number(mainPct) >= 0 ? '+' : ''}${mainPct}%` : undefined}
                  badgeColor={mainPct !== null ? (Number(mainPct) >= 0 ? 'text-secondary font-bold' : 'text-error font-bold') : undefined}
                />
                <KpiCard
                  icon="escalator_warning"
                  iconBg="bg-tertiary-fixed text-on-tertiary-fixed"
                  label="Sunday School"
                  value={formatKES(schoolValue)}
                  subLabel={`${periodLabel}  KES ${Number(schoolPrev).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
                  badge={schoolPct !== null ? `${Number(schoolPct) >= 0 ? '+' : ''}${schoolPct}%` : undefined}
                  badgeColor={schoolPct !== null ? (Number(schoolPct) >= 0 ? 'text-secondary font-bold' : 'text-error font-bold') : undefined}
                />
              </div>

              {/* ─── SERVICE COMPARISON CHART (ECharts) ─── */}
              <div className="bg-surface-container-lowest rounded-xl card-shadow border border-outline-variant/30 p-6 flex flex-col gap-4 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-headline-md text-primary">Service Comparison</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm bg-primary"></span>
                      <span className="text-sm text-on-surface-variant">Main Service</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm bg-secondary-container"></span>
                      <span className="text-sm text-on-surface-variant">Sunday School</span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const { xLabels, mainData, schoolData } = getChartData();
                  const isEmpty = !xLabels.length || (mainData.every((v) => v === 0) && schoolData.every((v) => v === 0));

                  if (isEmpty) {
                    return (
                      <div className="h-64 flex items-center justify-center">
                        <p className="text-body-sm text-on-surface-variant">No offering data for the selected period.</p>
                      </div>
                    );
                  }

                  return (
                    <ReactECharts
                      notMerge={true}
                      style={{ height: '300px', width: '100%' }}
                      option={{
                        grid: { left: 72, right: 24, top: 24, bottom: 48 },
                        tooltip: {
                          trigger: 'axis',
                          axisPointer: { type: 'shadow' },
                          formatter: (params) =>
                            params
                              .map((p) => `${p.marker} ${p.seriesName}: KES ${(p.value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`)
                              .join('<br/>'),
                        },
                        legend: {
                          data: ['Main Service', 'Sunday School'],
                          bottom: 0,
                          textStyle: { color: '#41493e', fontSize: 12 },
                        },
                        xAxis: {
                          type: 'category',
                          data: xLabels,
                          axisLine: { lineStyle: { color: '#c0c9bb' } },
                          axisTick: { show: false },
                          axisLabel: {
                            color: '#41493e',
                            fontSize: 11,
                            rotate: xLabels.length > 6 ? 30 : 0,
                          },
                          splitLine: { show: false },
                        },
                        yAxis: {
                          type: 'value',
                          axisLabel: {
                            color: '#41493e',
                            fontSize: 11,
                            formatter: (v) => `KES ${(v / 1000).toFixed(0)}k`,
                          },
                          splitLine: { lineStyle: { color: '#f0eded' } },
                          axisLine: { show: false },
                        },
                        series: [
                          {
                            name: 'Main Service',
                            type: 'bar',
                            data: mainData,
                            itemStyle: { color: '#00450d', borderRadius: [4, 4, 0, 0] },
                            barMaxWidth: 40,
                          },
                          {
                            name: 'Sunday School',
                            type: 'bar',
                            data: schoolData,
                            itemStyle: { color: '#a0f399', borderRadius: [4, 4, 0, 0] },
                            barMaxWidth: 40,
                          },
                        ],
                      }}
                    />
                  );
                })()}
              </div>

              {/* ─── TRANSACTIONS HEADER PANEL ─── */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 card-shadow px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="font-headline-md text-on-surface">All Offering Transactions</h4>
                    <p className="text-body-sm text-on-surface-variant mt-1">
                      {totalRows} record{totalRows !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={offerings.length === 0 || exportLoading}
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
                      New Offering
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── TABLE FILTER (between chart and table) ─── */}
              <section className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl card-shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">filter_alt</span>
                    <h3 className="font-headline-md text-lg text-on-surface">Filter Records</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleTableFilterClear}
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
                      value={filterYear}
                      onChange={(e) => handleTableFilterChange('year', e.target.value)}
                      className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none text-on-surface"
                    >
                      {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Month</label>
                    <select
                      value={filterMonth}
                      onChange={(e) => handleTableFilterChange('month', e.target.value)}
                      className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none text-on-surface"
                    >
                      <option value="">All Months</option>
                      {MONTH_NAMES.map((name, i) => (
                        <option key={i + 1} value={i + 1}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Service Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Service Type</label>
                    <select
                      value={filterServiceType}
                      onChange={(e) => handleTableFilterChange('serviceType', e.target.value)}
                      className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none text-on-surface"
                    >
                      <option value="">All Types</option>
                      {SERVICE_TYPES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  {/* Placeholder 4th column for grid alignment */}
                  <div className="hidden md:block" />
                </div>

                {/* Search */}
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                      manage_search
                    </span>
                    <input
                      type="text"
                      value={filterSearch}
                      onChange={(e) => handleTableFilterChange('search', e.target.value)}
                      placeholder="Search by contributor name or notes..."
                      className="w-full bg-surface-container-low border-none rounded-lg pl-10 py-3 text-body-sm focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTableFilterChange('search', filterSearch)}
                    className="bg-primary text-on-primary rounded-lg px-4 py-3 text-label-md font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
                    Search
                  </button>
                </div>
              </section>

              {/* ─── OFFERINGS TABLE ─── */}
              <UniversalTable
                columns={[
                  { key: 'date', label: 'Date' },
                  { key: 'serviceType', label: 'Service Type' },
                  { key: 'counter', label: 'Counter' },
                  { key: 'paymentMethod', label: 'Payment Method' },
                  { key: 'amount', label: 'Amount', align: 'right' },
                  { key: 'actions', label: 'Actions', align: 'center' },
                ]}
                data={filteredOfferings}
                loading={loading}
                emptyMessage="No offering records found for this period."
                page={page}
                pageSize={tableLimit}
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
                renderRow={(o, idx) => (
                  <tr key={o.id} className={`hover:bg-surface-container transition-colors ${idx % 2 === 1 ? 'bg-surface-container-low/30' : ''}`}>
                    <td className="px-6 py-4 text-body-sm">{formatDate(o.date)}</td>
                    <td className="px-6 py-4">{serviceTypeBadge(o.serviceType)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] font-bold">
                          {o.recordedByUser
                            ? `${(o.recordedByUser.firstName || '')[0] || '?'}${(o.recordedByUser.lastName || '')[0] || '?'}`
                            : '??'}
                        </div>
                        <span className="text-body-sm">
                          {o.recordedByUser
                            ? `${o.recordedByUser.firstName || ''} ${o.recordedByUser.lastName || ''}`.trim()
                            : 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body-sm">{paymentMethodLabel(o.paymentMethod)}</td>
                    <td className="px-6 py-4 text-right font-bold text-primary">{formatKESFull(o.amount)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => setEditingOffering(o)} className="p-2 hover:bg-surface-container-high rounded-lg text-primary" title="Edit">
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                        </button>
                        <button onClick={() => setConfirmDeleteId(o.id)} className="p-2 hover:bg-error-container/20 rounded-lg text-error" title="Delete">
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            </>
          )}
        </div>
      )}

      {/* ─── Edit overlay ─── */}
      <OfferingEditOverlay
        isOpen={!!editingOffering}
        offering={editingOffering}
        onClose={() => setEditingOffering(null)}
        onSave={handleEditSave}
      />

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete Offering"
        message="Are you sure you want to permanently delete this offering record? This action cannot be undone."
        confirmText="Delete"
        danger
        onConfirm={handleDelete}
        onClose={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
