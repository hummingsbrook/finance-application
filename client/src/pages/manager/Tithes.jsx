import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { formatKES, formatDate, formatDateTime } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import KpiCard from '../../components/ui/KpiCard';
import UniversalTable from '../../components/ui/UniversalTable';
import TitheEditOverlay from '../../components/ui/TitheEditOverlay';
import ReactECharts from 'echarts-for-react';
import { useFormValidation } from '../../hooks/useFormValidation';

const TABS = [
  { key: 'record', label: 'Record Tithe', icon: 'add_circle' },
  { key: 'records', label: 'Tithe Records', icon: 'history' },
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatNumberTwoDecimals(val) {
  if (val == null || isNaN(val)) return '0.00';
  return Number(val).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Tithes() {
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState('record');
  const [loading, setLoading] = useState(false);

  // Record form state
  const [form, setForm] = useState({
    contributorName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    mpesaReceiptNo: '',
    bankName: '',
    chequeNumber: '',
    idNumber: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [recentTithes, setRecentTithes] = useState([]);

  // Records tab state
  const [tithes, setTithes] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const now = new Date();

  // Period filter — drives KPI cards and chart
  const [periodMode, setPeriodMode] = useState('Monthly');
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [periodHasActive, setPeriodHasActive] = useState(false);

  // Table filter — drives the tithes list independently
  const [tableSearch, setTableSearch] = useState('');
  const [tablePaymentMethod, setTablePaymentMethod] = useState('');
  const [tableYear, setTableYear]   = useState('');
  const [tableMonth, setTableMonth] = useState('');
  const [tableSortBy, setTableSortBy] = useState('date_desc');
  const [tablePage, setTablePage] = useState(1);

  const { fieldErrors, validate, clearFieldError, clearAllErrors } = useFormValidation();

  // ─── Scroll preservation using a ref — no page reload on filter change ───
  const scrollRef = useRef(null);
  const saveScroll = () => {
    const el = document.getElementById('main-scroll');
    scrollRef.current = el ? el.scrollTop : 0;
  };
  const restoreScroll = () => {
    const el = document.getElementById('main-scroll');
    if (el && scrollRef.current != null) el.scrollTop = scrollRef.current;
  };

  // Summary state for Records tab
  const [summary, setSummary] = useState(null);

  // Yearly summary state
  const [yearlySummary, setYearlySummary] = useState(null);

  // ─── Edit overlay state ───
  const [editingTithe, setEditingTithe] = useState(null);

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // ─── Fetch recent tithes for the Record tab sidebar ───
  const fetchRecentTithes = useCallback(async () => {
    try {
      const res = await api.get('/tithes', { params: { limit: 5 } });
      setRecentTithes(res.data?.tithes || []);
    } catch (err) {
      // silent — sidebar is non-critical
    }
  }, []);

  useEffect(() => {
    fetchRecentTithes();
  }, [fetchRecentTithes]);

  // ─── Fetch tithes list for Records tab ───
  const fetchTithesList = useCallback(async () => {
    saveScroll();
    setLoading(true);
    try {
      const params = { limit: 12, page: tablePage };
      if (tablePaymentMethod) params.paymentMethod = tablePaymentMethod;
      if (tableSearch.trim()) params.contributorName = tableSearch.trim();
      if (tableYear)  params.year  = tableYear;
      if (tableMonth) params.month = tableMonth;
      if (tableSortBy) params.sortBy = tableSortBy;

      const res = await api.get('/tithes', { params });
      const data = res.data;
      setTithes(data.tithes || []);
      setTotalRows(data.total || 0);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to fetch tithes');
    } finally {
      setLoading(false);
      // Use requestAnimationFrame so the DOM has painted before we scroll
      requestAnimationFrame(restoreScroll);
    }
  }, [tablePaymentMethod, tableSearch, tableYear, tableMonth, tableSortBy, tablePage]);

  // ─── Fetch summary for KPI cards and chart ───
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/tithes/summary', {
        params: { year: periodYear, month: periodMonth },
      });
      setSummary(res.data?.summary || null);
    } catch (err) {
      // non-critical
    }
  }, [periodYear, periodMonth]);

  // ─── Fetch yearly summary ───
  const fetchYearlySummary = useCallback(async () => {
    try {
      const res = await api.get('/tithes/summary/yearly', {
        params: { year: periodYear },
      });
      setYearlySummary(res.data?.summary || null);
    } catch {
      setYearlySummary(null);
    }
  }, [periodYear]);

  useEffect(() => {
    if (activeTab === 'records') {
      fetchSummary();
    }
  }, [activeTab, fetchSummary]);

  useEffect(() => {
    if (activeTab === 'records') {
      fetchTithesList();
    }
  }, [activeTab, fetchTithesList]);

  // Reset table page when table filters change (but not on page change itself)
  useEffect(() => {
    setTablePage(1);
  }, [tableSearch, tablePaymentMethod, tableYear, tableMonth, tableSortBy]);

  useEffect(() => {
    if (activeTab === 'records' && periodMode === 'Yearly') {
      fetchYearlySummary();
    }
  }, [activeTab, periodMode, periodYear, fetchYearlySummary]);

  useEffect(() => {
    const defaultYear = new Date().getFullYear();
    const defaultMonth = new Date().getMonth() + 1;
    setPeriodHasActive(
      periodMode !== 'Monthly' ||
      periodYear !== defaultYear ||
      periodMonth !== defaultMonth
    );
  }, [periodMode, periodYear, periodMonth]);

  // ─── Record tab: form handlers ───
  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
    if (form.paymentMethod === 'bank') {
      if (!form.bankName?.trim()) errors.bankName = 'Bank name is required.';
      if (!form.chequeNumber?.trim()) errors.chequeNumber = 'Cheque number is required.';
    }
    if (!validate(errors)) return;

    setSubmitting(true);
    setSubmitSuccess(false);
    try {
      await api.post('/tithes', {
        contributorName: form.contributorName,
        amount: parseFloat(form.amount),
        date: form.date,
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
        paymentMethod: 'cash',
        mpesaReceiptNo: '',
        bankName: '',
        chequeNumber: '',
        idNumber: '',
        notes: '',
      });
      fetchRecentTithes();
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to record tithe');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Records tab: delete handler ───
  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/tithes/${confirmDeleteId}`);
      setConfirmDeleteId(null);
      fetchTithesList();
      fetchSummary();
      fetchRecentTithes();
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to delete tithe');
      setConfirmDeleteId(null);
    }
  };

  // ─── Overlay edit save handler ───
  const handleEditSave = async (id, payload) => {
    await api.put(`/tithes/${id}`, payload);
    fetchTithesList();
    fetchSummary();
  };

  // ─── Chart helpers ───
  const buildChartData = () => {
    if (!summary?.monthlyTrend) return [];
    return summary.monthlyTrend.slice(-6).map((m) => ({
      label: m.month,
      total: m.total || 0,
    }));
  };

  const chartData = periodMode === 'Yearly'
    ? (yearlySummary?.yearlyTrend || []).map((y) => ({ label: y.label, total: y.total }))
    : buildChartData();

  const yearlyTotal  = yearlySummary?.totalThisYear  || 0;
  const yearlyCount  = yearlySummary?.countThisYear  || 0;
  const yearlyAvg    = yearlySummary?.avgThisYear    || 0;
  const lastYearTotal = yearlySummary?.totalLastYear || 0;

  const kpiTotal = periodMode === 'Yearly' ? yearlyTotal : (summary?.totalThisMonth || 0);
  const kpiCount = periodMode === 'Yearly' ? yearlyCount : (summary?.countThisMonth || 0);
  const kpiAvg   = periodMode === 'Yearly' ? yearlyAvg   : (summary?.avgThisMonth   || 0);

  const kpiLabel = periodMode === 'Yearly'
    ? `Total Tithes ${periodYear}`
    : `Total Tithes — ${MONTH_NAMES[periodMonth - 1]} ${periodYear}`;

  const kpiCountLabel = periodMode === 'Yearly'
    ? `Total Tithes Count ${periodYear}`
    : 'Total Tithes Count';

  const kpiCountSub = periodMode === 'Yearly'
    ? `Full year entries for ${periodYear}`
    : `Consolidated for ${MONTH_NAMES[periodMonth - 1]} ${periodYear}`;

  const kpiAvgSub = periodMode === 'Yearly'
    ? `Per transaction average for ${periodYear}`
    : 'Per transaction average';

  const thisMonthTotal = summary?.totalThisMonth || 0;
  const thisMonthCount = summary?.countThisMonth || 0;

  const sourceLabel = (method) => {
    switch ((method || '').toUpperCase()) {
      case 'MPESA': return 'M-Pesa';
      case 'CASH': return 'Cash';
      case 'BANK_TRANSFER': return 'Bank Transfer';
      default: return method || 'Cash';
    }
  };

  const categoryBadge = (notes) => {
    const isBuilding = notes && (notes || '').toLowerCase().includes('building');
    if (isBuilding) {
      return <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-tertiary-fixed text-on-tertiary-fixed-variant">Building</span>;
    }
    return <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-secondary-container text-on-secondary-container">Standard</span>;
  };

  const [exportLoading, setExportLoading] = useState(false);

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const PAGE_SIZE = 100;
      let allRecords = [];
      let currentPage = 1;
      let fetchedTotal = 0;

      do {
        const params = { limit: PAGE_SIZE, page: currentPage };
        if (tablePaymentMethod) params.paymentMethod = tablePaymentMethod;
        if (tableSearch.trim()) params.contributorName = tableSearch.trim();
        if (tableYear)  params.year  = tableYear;
        if (tableMonth) params.month = tableMonth;
        if (tableSortBy) params.sortBy = tableSortBy;

        const res = await api.get('/tithes', { params });
        const data = res.data;
        const batch = data.tithes || [];
        allRecords = allRecords.concat(batch);
        fetchedTotal = data.total || 0;
        currentPage++;
      } while (allRecords.length < fetchedTotal);

      const headers = [
        'Date', 'Contributor', 'ID Number', 'Payment Method',
        'M-Pesa Receipt No.', 'Bank Name', 'Cheque Number',
        'Amount (KES)', 'Status', 'Notes', 'Recorded By',
      ];
      const rows = allRecords.map((t) => [
        formatDate(t.date),
        t.contributorName || '',
        t.idNumber || '',
        t.paymentMethod || '',
        t.mpesaReceiptNo || '',
        t.bankName || '',
        t.chequeNumber || '',
        t.amount != null ? Number(t.amount).toFixed(2) : '0.00',
        t.status || '',
        t.notes || '',
        t.recordedByUser ? `${t.recordedByUser.firstName} ${t.recordedByUser.lastName}` : '',
      ]);
      const csv = [headers, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tithes_${tableYear || 'all'}${tableMonth ? '_' + String(tableMonth).padStart(2, '0') : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to export tithes');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-headline-md font-bold text-on-surface">Tithes</h2>
        <p className="text-body-sm text-on-surface-variant">Record and manage tithe contributions</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-8 mb-8 border-b border-outline-variant">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-4 flex items-center gap-2 transition-colors text-label-md ${
              activeTab === tab.key
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ RECORD TAB ═══════════════════ */}
      {activeTab === 'record' && (
        <div className="grid grid-cols-12 gap-4 lg:gap-8">
          <section className="col-span-12 lg:col-span-7">
            <div className="bg-surface-container-lowest p-4 md:p-8 rounded-xl card-shadow border border-outline-variant/30">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Input
                      label="Contributor Name"
                      name="contributorName"
                      value={form.contributorName}
                      onChange={(e) => { handleFormChange(e); clearFieldError('contributorName'); }}
                      placeholder="Search or enter name"
                      icon="person"
                      required
                      error={fieldErrors.contributorName}
                    />
                  </div>
                  <div>
                    <Input
                      label="Amount (KES)"
                      name="amount"
                      type="number"
                      value={form.amount}
                      onChange={(e) => { handleFormChange(e); clearFieldError('amount'); }}
                      placeholder="0.00"
                      required
                      error={fieldErrors.amount}
                    />
                  </div>
                  <div>
                    <Input
                      label="Contribution Date"
                      name="date"
                      type="date"
                      value={form.date}
                      onChange={(e) => { handleFormChange(e); clearFieldError('date'); }}
                      required
                      error={fieldErrors.date}
                    />
                  </div>
                </div>

                {/* Payment Method Toggle */}
                <div className="space-y-3">
                  <label className="text-label-md text-on-surface-variant block">Payment Method</label>
                  <div className="flex p-1 bg-surface-container rounded-xl w-full sm:w-fit">
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, paymentMethod: 'cash' }))}
                      className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-bold text-label-md transition-all ${
                        form.paymentMethod === 'cash'
                          ? 'bg-surface-container-lowest text-primary shadow-sm'
                          : 'text-on-surface-variant hover:bg-surface-variant/50'
                      }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, paymentMethod: 'mpesa' }))}
                      className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-bold text-label-md transition-all ${
                        form.paymentMethod === 'mpesa'
                          ? 'bg-surface-container-lowest text-primary shadow-sm'
                          : 'text-on-surface-variant hover:bg-surface-variant/50'
                      }`}
                    >
                      M-Pesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, paymentMethod: 'bank' }))}
                      className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-bold text-label-md transition-all ${
                        form.paymentMethod === 'bank'
                          ? 'bg-surface-container-lowest text-primary shadow-sm'
                          : 'text-on-surface-variant hover:bg-surface-variant/50'
                      }`}
                    >
                      Bank
                    </button>
                  </div>
                </div>

                {form.paymentMethod === 'mpesa' && (
                  <div>
                    <Input
                      label="M-Pesa Receipt Number"
                      name="mpesaReceiptNo"
                      value={form.mpesaReceiptNo}
                      onChange={(e) => { handleFormChange(e); clearFieldError('mpesaReceiptNo'); }}
                      placeholder="e.g. RJH8945KL3"
                      className="uppercase"
                      error={fieldErrors.mpesaReceiptNo}
                    />
                  </div>
                )}

                {form.paymentMethod === 'bank' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Name of Bank"
                        name="bankName"
                        value={form.bankName}
                        onChange={(e) => { handleFormChange(e); clearFieldError('bankName'); }}
                        placeholder="e.g. Equity Bank"
                        icon="account_balance"
                        required
                        error={fieldErrors.bankName}
                      />
                      <Input
                        label="Cheque Number"
                        name="chequeNumber"
                        value={form.chequeNumber}
                        onChange={(e) => { handleFormChange(e); clearFieldError('chequeNumber'); }}
                        placeholder="e.g. 000123456"
                        icon="receipt"
                        required
                        error={fieldErrors.chequeNumber}
                      />
                    </div>
                    <Input
                      label="ID Number (Optional)"
                      name="idNumber"
                      value={form.idNumber}
                      onChange={(e) => { handleFormChange(e); clearFieldError('idNumber'); }}
                      placeholder="National ID or Passport number"
                      icon="badge"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-label-md text-on-surface-variant mb-1.5">Notes (Optional)</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    placeholder="Additional details about this contribution..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary"
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
                        <span className="material-symbols-outlined">verified</span>
                        Record Tithe
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-5 space-y-6">
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
                {recentTithes.length === 0 && (
                  <p className="text-body-sm text-on-surface-variant text-center py-4">No recent submissions</p>
                )}
                {recentTithes.map((t, i) => (
                  <div key={t.id || i} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>payments</span>
                      </div>
                      <div>
                        <p className="text-label-md text-on-surface font-medium">{t.contributorName || 'Anonymous'}</p>
                        <p className="text-body-sm text-on-surface-variant">{formatDateTime(t.date || t.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-label-md">{formatKES(t.amount)}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant uppercase">
                        {t.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden bg-primary-container rounded-xl p-6 text-on-primary shadow-lg">
              <div className="absolute -right-12 -top-12 opacity-10">
                <span className="material-symbols-outlined text-[180px]">church</span>
              </div>
              <h3 className="text-headline-md mb-2 relative z-10">Transparency Matters</h3>
              <p className="text-body-sm opacity-90 relative z-10 mb-6">
                Each record entered here is vital for maintaining communal trust and supporting our church's ongoing projects.
              </p>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg">
                  <p className="text-body-sm opacity-70">Total This Month</p>
                  <p className="text-headline-md font-bold">{formatKES(thisMonthTotal)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg">
                  <p className="text-body-sm opacity-70">Entries</p>
                  <p className="text-headline-md font-bold">{thisMonthCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/30">
              <h4 className="text-label-md text-primary mb-3">Recording Tips</h4>
              <ul className="space-y-3">
                {[
                  'Verify the amount before submitting to avoid accounting errors.',
                  'Use the notes field for non-monetary attachments or special dedications.',
                  'Always enter the M-Pesa code exactly as it appears in the SMS.',
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
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
            </div>
          ) : (
            <>
              {/* ─── PERIOD FILTER ─── */}
              <div className="bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
                <div className="flex justify-end mb-3">
                  {periodHasActive && (
                    <div className="flex items-center gap-1">
                      <span className="bg-primary/10 text-primary rounded px-2 py-0.5 font-bold text-label-sm">
                        Filter Active
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPeriodMode('Monthly');
                          setPeriodYear(new Date().getFullYear());
                          setPeriodMonth(new Date().getMonth() + 1);
                        }}
                        className="text-on-surface-variant hover:opacity-80 transition-opacity flex items-center"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="inline-flex bg-surface-container-low rounded-lg p-1 h-10">
                    {['Monthly', 'Yearly'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPeriodMode(mode)}
                        className={`px-5 rounded-md text-label-md font-medium transition-all ${
                          periodMode === mode
                            ? 'bg-primary text-on-primary font-bold shadow-sm'
                            : 'text-on-surface-variant hover:bg-surface'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-label-sm text-on-surface-variant whitespace-nowrap">Year</label>
                    <select
                      value={periodYear}
                      onChange={(e) => setPeriodYear(Number(e.target.value))}
                      className="h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {periodMode === 'Monthly' && (
                    <div className="flex items-center gap-2">
                      <label className="text-label-sm text-on-surface-variant whitespace-nowrap">Month</label>
                      <select
                        value={periodMonth}
                        onChange={(e) => setPeriodMonth(Number(e.target.value))}
                        className="h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      >
                        {MONTH_NAMES.map((name, i) => (
                          <option key={i + 1} value={i + 1}>{name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── KPI CARDS ─── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard
                  icon="trending_up"
                  iconBg="bg-secondary-container text-on-secondary-container"
                  label={kpiLabel}
                  value={formatKES(kpiTotal)}
                  subLabel={
                    periodMode === 'Yearly'
                      ? lastYearTotal === 0
                        ? `No data for ${periodYear - 1}`
                        : (() => {
                            const pct = Math.round(((yearlyTotal - lastYearTotal) / lastYearTotal) * 100);
                            return `${pct >= 0 ? '+' : ''}${pct}% vs ${periodYear - 1}`;
                          })()
                      : summary?.totalLastMonth === 0
                        ? 'No data for last month'
                        : (() => {
                            const pct = Math.round(((summary?.totalThisMonth - summary?.totalLastMonth) / summary?.totalLastMonth) * 100);
                            return `${pct >= 0 ? '+' : ''}${pct}% vs last month`;
                          })()
                  }
                  subLabelColor={
                    periodMode === 'Yearly'
                      ? (yearlyTotal >= lastYearTotal ? 'text-secondary' : 'text-error')
                      : (summary?.totalThisMonth >= summary?.totalLastMonth ? 'text-secondary' : 'text-error')
                  }
                />
                <KpiCard
                  icon="receipt_long"
                  iconBg="bg-secondary-container text-on-secondary-container"
                  label={kpiCountLabel}
                  value={kpiCount}
                  subLabel={kpiCountSub}
                />
                <KpiCard
                  icon="calculate"
                  iconBg="bg-secondary-container text-on-secondary-container"
                  label="Average Tithe"
                  value={formatKES(kpiAvg)}
                  subLabel={kpiAvgSub}
                />
              </div>

              {/* ─── TITHE TRENDS CHART ─── */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-headline-md text-on-surface">Tithe Trends</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2a6b2c]"></span>
                    <span className="text-label-sm text-on-surface-variant">
                      {periodMode === 'Yearly' ? 'Last 5 Years' : 'Last 6 Months'}
                    </span>
                  </div>
                </div>
                <div>
                  {chartData.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <p className="text-body-sm text-on-surface-variant">No data for this period.</p>
                    </div>
                  ) : (
                    <ReactECharts
                      notMerge={true}
                      style={{ height: '300px', width: '100%' }}
                      option={{
                        grid: { left: 64, right: 24, top: 24, bottom: 48 },
                        tooltip: {
                          trigger: 'axis',
                          formatter: (params) => `${params[0].name}<br/>KES ${params[0].value?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
                        },
                        legend: {
                          data: ['Tithe Collections'],
                          bottom: 0,
                          textStyle: { color: '#41493e', fontSize: 12 },
                        },
                        xAxis: {
                          type: 'category',
                          data: chartData.map((d) => d.label),
                          axisLine: { lineStyle: { color: '#c0c9bb' } },
                          axisTick: { show: false },
                          axisLabel: { color: '#41493e', fontSize: 11 },
                          splitLine: { show: true, lineStyle: { color: '#f0eded', type: 'dashed' } },
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
                            name: 'Tithe Collections',
                            type: 'line',
                            data: chartData.map((d) => d.total),
                            smooth: true,
                            symbol: 'circle',
                            symbolSize: 7,
                            lineStyle: { color: '#1b6d24', width: 2.5 },
                            itemStyle: { color: '#1b6d24', borderColor: '#fff', borderWidth: 2 },
                            areaStyle: {
                              color: {
                                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                                colorStops: [
                                  { offset: 0, color: '#1b6d2440' },
                                  { offset: 1, color: '#1b6d2400' },
                                ],
                              },
                            },
                          },
                        ],
                      }}
                    />
                  )}
                </div>
              </div>

              {/* ─── TRANSACTIONS HEADER PANEL ─── */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 card-shadow px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="font-headline-md text-on-surface">All Tithe Transactions</h4>
                    <p className="text-body-sm text-on-surface-variant mt-1">
                      {totalRows} record{totalRows !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={tithes.length === 0 || exportLoading}
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
                      New Tithe
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── TABLE FILTER ─── */}
              <section className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl card-shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">filter_alt</span>
                    <h3 className="font-headline-md text-lg text-on-surface">Filter Records</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTableSearch('');
                      setTablePaymentMethod('');
                      setTableYear('');
                      setTableMonth('');
                      setTableSortBy('date_desc');
                    }}
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
                      onChange={(e) => setTableYear(e.target.value)}
                      className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none text-on-surface"
                    >
                      <option value="">All Years</option>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
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

                  {/* Source */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Source</label>
                    <select
                      value={tablePaymentMethod}
                      onChange={(e) => setTablePaymentMethod(e.target.value)}
                      className="bg-surface-container-low border-none rounded-lg text-body-sm focus:ring-1 focus:ring-primary w-full py-2.5 outline-none text-on-surface"
                    >
                      <option value="">All Sources</option>
                      <option value="CASH">Cash</option>
                      <option value="MPESA">M-Pesa</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
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
                      <option value="date_desc">Date (Newest First)</option>
                      <option value="date_asc">Date (Oldest First)</option>
                      <option value="amount_desc">Amount (Highest First)</option>
                      <option value="amount_asc">Amount (Lowest First)</option>
                      <option value="name_asc">Contributor (A–Z)</option>
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
                      placeholder="Search by contributor name..."
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

              {/* ─── DATA TABLE ─── */}
              <UniversalTable
                columns={[
                  { key: 'date', label: 'Date' },
                  { key: 'category', label: 'Category' },
                  { key: 'amount', label: 'Amount (KES)', align: 'right' },
                  { key: 'source', label: 'Source' },
                  { key: 'contributor', label: 'Contributor' },
                  { key: 'notes', label: 'Notes' },
                  { key: 'actions', label: 'Actions', align: 'center' },
                ]}
                data={tithes}
                loading={loading}
                emptyMessage="No tithe records found."
                page={tablePage}
                pageSize={12}
                total={totalRows}
                onPageChange={setTablePage}
                footerLeft={
                  <span className="text-label-sm text-on-surface-variant flex items-center gap-3">
                    Total: <span className="font-bold text-primary">
                      {formatKES(tithes.reduce((sum, t) => sum + (Number(t.amount) || 0), 0))}
                    </span>
                    <span className="text-on-surface-variant/50">({totalRows} records)</span>
                  </span>
                }
                renderRow={(t, idx) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-surface-container transition-colors ${
                      idx % 2 === 1 ? 'bg-surface-container-low/30' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-body-md text-on-surface">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-6 py-4">
                      {categoryBadge(t.notes)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-primary text-body-md whitespace-nowrap">
                      {formatNumberTwoDecimals(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface">
                      {sourceLabel(t.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 font-medium text-body-md text-on-surface">
                      {t.contributorName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-body-sm text-on-surface-variant truncate block max-w-[200px]">
                        {t.notes || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingTithe(t)}
                          className="p-2 hover:bg-surface-container-high rounded-lg text-primary"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-2 hover:bg-error-container/20 rounded-lg text-error"
                          title="Delete"
                        >
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
      <TitheEditOverlay
        isOpen={!!editingTithe}
        tithe={editingTithe}
        onClose={() => setEditingTithe(null)}
        onSave={handleEditSave}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete Tithe Record"
        message="Are you sure you want to permanently delete this tithe record? This action cannot be undone."
        confirmText="Delete"
        danger
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
