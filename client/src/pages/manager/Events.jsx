import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatKES, formatDate } from '../../lib/utils';
import UniversalTable from '../../components/ui/UniversalTable';
import ReactECharts from 'echarts-for-react';
import {
  CHURCH_EVENT_TYPES, MONEY_PURPOSES, PROGRAMME_ROLES,
  IN_KIND_CATEGORIES, CONTRIBUTION_TYPE_BADGE, PAYMENT_METHOD_BADGE,
} from '../../constants/eventConstants';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Helper: format a Decimal/number as KES
function fmtKES(val) {
  const n = Number(val || 0);
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper: parse a date string as local time (avoid UTC off-by-one)
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  return dateStr.length === 10 ? new Date(dateStr + 'T00:00:00') : new Date(dateStr);
}

// Helper: get preset event metadata by value
function getPresetByValue(value) {
  return CHURCH_EVENT_TYPES.find((e) => e.value === value);
}

// Compute the auto-filled date for a preset event in the given year.
// For events with fixed month/day, returns YYYY-MM-DD.
// For moveable events (no fixed date), returns '' (user must enter).
function getPresetDateForYear(preset, year) {
  if (!preset.date || !preset.date.month) return '';
  const y = Number(year) || new Date().getFullYear();
  const m = String(preset.date.month).padStart(2, '0');
  const d = String(preset.date.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================================================
// Component
// ============================================================================
export default function Events() {
  const { showError, showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState('record');

  // ─── Shared state ───────────────────────────────────────────────────────
  const [recentContributions, setRecentContributions] = useState([]);

  // ─── Record tab state ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    contributorName: '',
    contributionType: 'MONEY',
    purpose: '',
    amount: '',
    paymentMethod: 'CASH',
    mpesaReceiptNo: '',
    bankName: '',
    accountNo: '',
    idNumber: '',
    inKindCategory: '',
    inKindDescription: '',
    inKindOtherType: '',
    eventType: 'CHRISTMAS',
    eventName: 'Christmas Day',
    eventDate: getPresetDateForYear(getPresetByValue('CHRISTMAS'), new Date().getFullYear()),
    notes: '',
  });
  const [programmeTeam, setProgrammeTeam] = useState([{ name: '', role: '' }]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ─── Records tab state ─────────────────────────────────────────────────
  const [summary, setSummary] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [total, setTotal] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [chartMode, setChartMode]   = useState('monthly');
  const [chartYear, setChartYear]   = useState(new Date().getFullYear());
  const [chartMonth, setChartMonth] = useState(new Date().getMonth() + 1);
  const [chartEvent, setChartEvent] = useState('');
  const [filterYear, setFilterYear]   = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterType, setFilterType]   = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const LIMIT = 10;

  // Edit modal
  const [editItem, setEditItem]   = useState(null);
  const [editOpen, setEditOpen]   = useState(false);

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // ─── Fetchers ──────────────────────────────────────────────────────────
  const fetchRecent = useCallback(async () => {
    try {
      const res = await api.get('/events', { params: { limit: 5 } });
      setRecentContributions(res.data?.contributions || []);
    } catch { /* silent */ }
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const params = chartMode === 'monthly'
        ? { year: chartYear, month: chartMonth }
        : { year: chartYear };
      const endpoint = chartMode === 'monthly' ? '/events/summary' : '/events/summary/yearly';
      const res = await api.get(endpoint, { params });
      setSummary(res.data.summary);
    } catch (err) {
      showError('Failed to load event summary.');
    } finally {
      setSummaryLoading(false);
    }
  }, [chartMode, chartYear, chartMonth, showError]);

  const fetchContributions = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await api.get('/events', {
        params: {
          page, limit: LIMIT,
          year: filterYear, month: filterMonth,
          contributionType: filterType || undefined,
          paymentMethod: filterMethod || undefined,
          eventType: filterEvent || undefined,
          search: search || undefined,
        },
      });
      setContributions(res.data.contributions || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      showError('Failed to load contributions.');
    } finally {
      setTableLoading(false);
    }
  }, [page, filterYear, filterMonth, filterType, filterMethod, filterEvent, search, showError]);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  useEffect(() => {
    if (activeTab === 'records') {
      fetchSummary();
      fetchContributions();
    }
  }, [activeTab, fetchSummary, fetchContributions]);

  // Reset page to 1 when any table filter changes
  useEffect(() => {
    if (activeTab === 'records') setPage(1);
  }, [filterYear, filterMonth, filterType, filterMethod, filterEvent, search, activeTab]);

  // ─── Record tab handlers ───────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));

    // When event type changes, auto-fill name and date for presets
    if (name === 'eventType') {
      const preset = getPresetByValue(value);
      if (preset && value !== 'CUSTOM') {
        const autoDate = getPresetDateForYear(preset, new Date().getFullYear());
        setForm((p) => ({
          ...p,
          eventType: value,
          eventName: preset.label,
          eventDate: autoDate || p.eventDate,
        }));
      }
    }
  };

  const handleProgrammeTeamChange = (idx, field, value) => {
    setProgrammeTeam((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const addTeamMember = () => setProgrammeTeam((p) => [...p, { name: '', role: '' }]);

  const removeTeamMember = (idx) => {
    if (programmeTeam.length <= 1) return;
    setProgrammeTeam((p) => p.filter((_, i) => i !== idx));
  };

  const validateForm = () => {
    const errors = {};
    if (!form.contributorName.trim()) errors.contributorName = 'Contributor name is required.';
    if (!form.eventType) errors.eventType = 'Event type is required.';
    if (!form.eventName.trim()) errors.eventName = 'Event name is required.';
    if (!form.eventDate) errors.eventDate = 'Event date is required.';

    if (form.contributionType === 'MONEY') {
      if (!form.purpose) errors.purpose = 'Please select a purpose.';
      const amt = parseFloat(form.amount);
      if (!form.amount || isNaN(amt) || amt <= 0) errors.amount = 'Enter a valid amount greater than 0.';
      if (form.paymentMethod === 'MPESA' && !form.mpesaReceiptNo.trim()) {
        errors.mpesaReceiptNo = 'M-Pesa receipt number is required.';
      }
      if (form.paymentMethod === 'BANK_TRANSFER') {
        if (!form.bankName.trim()) errors.bankName = 'Bank name is required.';
        if (!form.accountNo.trim()) errors.accountNo = 'Account number is required.';
      }
    } else if (form.contributionType === 'IN_KIND') {
      if (!form.inKindCategory) errors.inKindCategory = 'Please select a category.';
      if (!form.inKindDescription.trim()) errors.inKindDescription = 'Description is required.';
      if (form.inKindCategory === 'OTHERS' && !form.inKindOtherType.trim()) {
        errors.inKindOtherType = 'Please specify the donation type.';
      }
    }

    return errors;
  };

  const resetForm = () => {
    setForm({
      contributorName: '',
      contributionType: 'MONEY',
      purpose: '',
      amount: '',
      paymentMethod: 'CASH',
      mpesaReceiptNo: '',
      bankName: '',
      accountNo: '',
      idNumber: '',
      inKindCategory: '',
      inKindDescription: '',
      inKindOtherType: '',
      eventType: 'CHRISTMAS',
      eventName: 'Christmas Day',
      eventDate: getPresetDateForYear(getPresetByValue('CHRISTMAS'), new Date().getFullYear()),
      notes: '',
    });
    setProgrammeTeam([{ name: '', role: '' }]);
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitSuccess(false);
    try {
      await api.post('/events', {
        contributorName: form.contributorName,
        contributionType: form.contributionType,
        purpose: form.contributionType === 'MONEY' ? form.purpose : null,
        amount: form.contributionType === 'MONEY' ? parseFloat(form.amount) : null,
        paymentMethod: form.contributionType === 'MONEY' ? form.paymentMethod : null,
        mpesaReceiptNo: form.contributionType === 'MONEY' ? form.mpesaReceiptNo || null : null,
        bankName: form.contributionType === 'MONEY' ? form.bankName || null : null,
        accountNo: form.contributionType === 'MONEY' ? form.accountNo || null : null,
        idNumber: form.contributionType === 'MONEY' ? form.idNumber || null : null,
        inKindCategory: form.contributionType === 'IN_KIND' ? form.inKindCategory : null,
        inKindDescription: form.contributionType === 'IN_KIND' ? form.inKindDescription : null,
        inKindOtherType: form.contributionType === 'IN_KIND' && form.inKindCategory === 'OTHERS' ? form.inKindOtherType : null,
        eventType: form.eventType,
        eventName: form.eventName,
        eventDate: form.eventDate,
        programmeTeam,
        notes: form.notes || null,
      });
      setSubmitSuccess(true);
      resetForm();
      fetchRecent();
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to record event contribution';
      showError(msg);
      if (err?.response?.data?.code === 'VALIDATION_ERROR') {
        setFieldErrors({ form: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Records tab handlers ──────────────────────────────────────────────
  const handleEdit = (row) => {
    setEditItem(row);
    setEditOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete contribution from "${row.contributorName}" for ${row.eventName}?`)) return;
    try {
      await api.delete(`/events/${row.id}`);
      showSuccess('Contribution deleted.');
      fetchContributions();
      fetchSummary();
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to delete contribution.');
    }
  };

  // ─── Render helpers ────────────────────────────────────────────────────
  const contributionBadge = (type) => {
    const cfg = CONTRIBUTION_TYPE_BADGE[type] || CONTRIBUTION_TYPE_BADGE.MONEY;
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    );
  };

  const paymentBadge = (method) => {
    if (!method) return <span className="text-on-surface-variant">—</span>;
    const cfg = PAYMENT_METHOD_BADGE[method] || PAYMENT_METHOD_BADGE.CASH;
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    );
  };

  // ─── Render: Tab strip ─────────────────────────────────────────────────
  const renderTabs = () => (
    <div className="flex border-b border-outline-variant mb-6">
      {[
        { key: 'record', label: 'Record Contribution', icon: 'add_circle' },
        { key: 'records', label: 'Event Records', icon: 'history' },
      ].map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setActiveTab(t.key)}
          className={`flex items-center gap-2 px-6 py-3 text-label-md font-medium border-b-2 transition-colors ${
            activeTab === t.key
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );

  // ─── Render: Record Contribution tab ───────────────────────────────────
  const renderRecordTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
      {/* Main form */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 space-y-6">

          {/* Contributor name */}
          <div>
            <label className="text-label-md text-on-surface-variant">Contributor Name</label>
            <input
              type="text"
              name="contributorName"
              value={form.contributorName}
              onChange={handleChange}
              placeholder="e.g. John Mwangi"
              className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors ${fieldErrors.contributorName ? 'border-error focus:border-error focus:ring-1 focus:ring-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
            />
            {fieldErrors.contributorName && <p className="text-label-sm text-error mt-1">{fieldErrors.contributorName}</p>}
          </div>

          {/* Contribution type segmented toggle */}
          <div>
            <label className="text-label-md text-on-surface-variant block mb-2">Contribution Type</label>
            <div className="grid grid-cols-2 bg-surface-container-high p-xs rounded-full">
              {['MONEY', 'IN_KIND'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, contributionType: t }))}
                  className={`flex items-center justify-center gap-2 py-2 rounded-full text-label-md font-medium transition-all ${
                    form.contributionType === t
                      ? 'bg-surface-container-lowest text-primary shadow-sm'
                      : 'text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {t === 'MONEY' ? 'payments' : 'volunteer_activism'}
                  </span>
                  {t === 'MONEY' ? 'Money' : 'In-Kind'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Money section ── */}
          {form.contributionType === 'MONEY' && (
            <div className="space-y-4 p-4 bg-secondary-container/10 rounded-lg border border-secondary/20">
              <p className="text-label-md font-bold text-secondary uppercase tracking-wider">Money Contribution Details</p>

              {/* Purpose */}
              <div>
                <label className="text-label-md text-on-surface-variant">Purpose</label>
                <div className="relative mt-1.5">
                  <select
                    name="purpose"
                    value={form.purpose}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors appearance-none ${fieldErrors.purpose ? 'border-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
                  >
                    <option value="">Select purpose</option>
                    {MONEY_PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style={{ fontSize: 20 }}>expand_more</span>
                </div>
                {fieldErrors.purpose && <p className="text-label-sm text-error mt-1">{fieldErrors.purpose}</p>}
              </div>

              {/* Amount + Payment method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-label-md text-on-surface-variant">Amount (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors ${fieldErrors.amount ? 'border-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
                  />
                  {fieldErrors.amount && <p className="text-label-sm text-error mt-1">{fieldErrors.amount}</p>}
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant">Payment Method</label>
                  <div className="relative mt-1.5">
                    <select
                      name="paymentMethod"
                      value={form.paymentMethod}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-lg text-on-surface outline-none transition-colors appearance-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                    >
                      <option value="CASH">Cash</option>
                      <option value="MPESA">M-Pesa</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style={{ fontSize: 20 }}>expand_more</span>
                  </div>
                </div>
              </div>

              {/* M-Pesa receipt */}
              {form.paymentMethod === 'MPESA' && (
                <div>
                  <label className="text-label-md text-on-surface-variant">M-Pesa Receipt No.</label>
                  <input
                    type="text"
                    name="mpesaReceiptNo"
                    value={form.mpesaReceiptNo}
                    onChange={handleChange}
                    placeholder="e.g. QGH7X9P2K4"
                    className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors ${fieldErrors.mpesaReceiptNo ? 'border-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
                  />
                  {fieldErrors.mpesaReceiptNo && <p className="text-label-sm text-error mt-1">{fieldErrors.mpesaReceiptNo}</p>}
                </div>
              )}

              {/* Bank transfer fields */}
              {form.paymentMethod === 'BANK_TRANSFER' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-label-md text-on-surface-variant">Bank Name</label>
                    <input
                      type="text"
                      name="bankName"
                      value={form.bankName}
                      onChange={handleChange}
                      placeholder="e.g. Equity Bank"
                      className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors ${fieldErrors.bankName ? 'border-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
                    />
                    {fieldErrors.bankName && <p className="text-label-sm text-error mt-1">{fieldErrors.bankName}</p>}
                  </div>
                  <div>
                    <label className="text-label-md text-on-surface-variant">Account No.</label>
                    <input
                      type="text"
                      name="accountNo"
                      value={form.accountNo}
                      onChange={handleChange}
                      placeholder="e.g. 0123456789"
                      className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors ${fieldErrors.accountNo ? 'border-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
                    />
                    {fieldErrors.accountNo && <p className="text-label-sm text-error mt-1">{fieldErrors.accountNo}</p>}
                  </div>
                </div>
              )}

              {/* ID number (optional) */}
              <div>
                <label className="text-label-md text-on-surface-variant">ID Number (optional)</label>
                <input
                  type="text"
                  name="idNumber"
                  value={form.idNumber}
                  onChange={handleChange}
                  placeholder="e.g. 12345678"
                  className="mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-lg text-on-surface outline-none transition-colors focus:border-secondary focus:ring-1 focus:ring-secondary"
                />
              </div>
            </div>
          )}

          {/* ── In-Kind section ── */}
          {form.contributionType === 'IN_KIND' && (
            <div className="space-y-4 p-4 bg-primary-fixed/10 rounded-lg border border-primary/20">
              <p className="text-label-md font-bold text-primary uppercase tracking-wider">In-Kind Donation Details</p>

              {/* Category tiles */}
              <div>
                <label className="text-label-md text-on-surface-variant block mb-2">Category</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {IN_KIND_CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, inKindCategory: c.value }))}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        form.inKindCategory === c.value
                          ? 'border-primary bg-primary-container text-on-primary-container'
                          : 'border-outline-variant hover:border-primary/50 text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{c.icon}</span>
                      <span className="text-label-sm font-medium">{c.label}</span>
                    </button>
                  ))}
                </div>
                {fieldErrors.inKindCategory && <p className="text-label-sm text-error mt-1">{fieldErrors.inKindCategory}</p>}
              </div>

              {/* Other type (when OTHERS selected) */}
              {form.inKindCategory === 'OTHERS' && (
                <div>
                  <label className="text-label-md text-on-surface-variant">Specify Donation Type</label>
                  <input
                    type="text"
                    name="inKindOtherType"
                    value={form.inKindOtherType}
                    onChange={handleChange}
                    placeholder="e.g. Bibles, Chairs, Sound Equipment"
                    className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors ${fieldErrors.inKindOtherType ? 'border-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
                  />
                  {fieldErrors.inKindOtherType && <p className="text-label-sm text-error mt-1">{fieldErrors.inKindOtherType}</p>}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-label-md text-on-surface-variant">Description</label>
                <textarea
                  name="inKindDescription"
                  value={form.inKindDescription}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the donated items (quantity, condition, etc.)"
                  className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors resize-y ${fieldErrors.inKindDescription ? 'border-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
                />
                {fieldErrors.inKindDescription && <p className="text-label-sm text-error mt-1">{fieldErrors.inKindDescription}</p>}
              </div>
            </div>
          )}

          {/* ── Event details ── */}
          <div className="space-y-4 p-4 bg-surface-container-low rounded-lg border border-outline-variant/30">
            <p className="text-label-md font-bold text-on-surface uppercase tracking-wider">Event Details</p>

            {/* Event type */}
            <div>
              <label className="text-label-md text-on-surface-variant">Event Type</label>
              <div className="relative mt-1.5">
                <select
                  name="eventType"
                  value={form.eventType}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors appearance-none ${fieldErrors.eventType ? 'border-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
                >
                  {CHURCH_EVENT_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style={{ fontSize: 20 }}>expand_more</span>
              </div>
            </div>

            {/* Event name + date — read-only for presets, editable for CUSTOM */}
            {form.eventType === 'CUSTOM' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-label-md text-on-surface-variant">Event Name</label>
                  <input
                    type="text"
                    name="eventName"
                    value={form.eventName}
                    onChange={handleChange}
                    placeholder="e.g. Youth Sunday"
                    className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors ${fieldErrors.eventName ? 'border-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
                  />
                  {fieldErrors.eventName && <p className="text-label-sm text-error mt-1">{fieldErrors.eventName}</p>}
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant">Event Date</label>
                  <input
                    type="date"
                    name="eventDate"
                    value={form.eventDate}
                    onChange={handleChange}
                    className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors ${fieldErrors.eventDate ? 'border-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
                  />
                  {fieldErrors.eventDate && <p className="text-label-sm text-error mt-1">{fieldErrors.eventDate}</p>}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-label-md text-on-surface-variant">Event Name (auto-filled)</label>
                  <div className="mt-1.5 flex items-center gap-2 px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-body-lg text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>lock</span>
                    <span className="truncate">{form.eventName}</span>
                  </div>
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant">Event Date (auto-filled)</label>
                  <div className="mt-1.5 flex items-center gap-2 px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-body-lg text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>lock</span>
                    <span>{form.eventDate ? formatDate(form.eventDate) : '—'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Programme team ── */}
          <div className="space-y-3 p-4 bg-surface-container-low rounded-lg border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <p className="text-label-md font-bold text-on-surface uppercase tracking-wider">Programme Team</p>
              <button
                type="button"
                onClick={addTeamMember}
                className="flex items-center gap-1 text-label-sm text-primary hover:text-primary/80 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Add Team Member
              </button>
            </div>
            {programmeTeam.map((member, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => handleProgrammeTeamChange(idx, 'name', e.target.value)}
                  placeholder="Name"
                  className="w-full px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                />
                <select
                  value={member.role}
                  onChange={(e) => handleProgrammeTeamChange(idx, 'role', e.target.value)}
                  className="w-full px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface outline-none focus:border-secondary focus:ring-1 focus:ring-secondary appearance-none"
                >
                  <option value="">Select role</option>
                  {PROGRAMME_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => removeTeamMember(idx)}
                  disabled={programmeTeam.length <= 1}
                  className="p-2 text-error hover:bg-error-container/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Remove team member"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                </button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="text-label-md text-on-surface-variant">Notes (optional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Any additional notes..."
              className="mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-lg text-on-surface outline-none transition-colors focus:border-secondary focus:ring-1 focus:ring-secondary resize-y"
            />
          </div>

          {/* Form-level error */}
          {fieldErrors.form && (
            <div className="bg-error-container/60 border border-error/20 rounded-lg px-4 py-3">
              <p className="text-body-sm text-on-error-container">{fieldErrors.form}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-md rounded-full flex items-center justify-center gap-2 text-label-lg font-bold transition-all ${
              submitSuccess
                ? 'bg-secondary text-on-secondary'
                : 'bg-primary text-on-primary hover:bg-primary/90'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              {submitting ? 'sync' : submitSuccess ? 'check_circle' : 'volunteer_activism'}
            </span>
            {submitting ? 'Recording...' : submitSuccess ? 'Recorded!' : 'Record Contribution'}
          </button>
        </form>
      </div>

      {/* Sidebar — Recent Contributions */}
      <div className="lg:col-span-1">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 sticky top-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>history</span>
            <h3 className="text-headline-md text-primary">Recent Contributions</h3>
          </div>
          {recentContributions.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-on-surface-variant/30" style={{ fontSize: 48 }}>inbox</span>
              <p className="text-body-sm text-on-surface-variant mt-2">No contributions yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentContributions.map((c) => (
                <li key={c.id} className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-primary-container" style={{ fontSize: 20 }}>
                      {c.contributionType === 'MONEY' ? 'payments' : 'volunteer_activism'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-label-md font-semibold text-on-surface truncate">{c.contributorName}</p>
                    <p className="text-label-sm text-on-surface-variant truncate">{c.eventName}</p>
                    {c.contributionType === 'MONEY' ? (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container">
                        {fmtKES(c.amount)}
                      </span>
                    ) : (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-tertiary-fixed text-on-tertiary-fixed">
                        {c.inKindCategory || 'In-Kind'}
                      </span>
                    )}
                  </div>
                  <span className="text-label-sm text-on-surface-variant whitespace-nowrap">
                    {formatDate(c.eventDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Render: Event Records tab ─────────────────────────────────────────
  const renderRecordsTab = () => {
    const totalMoneyAmount = summary?.totalMoneyAmount || 0;
    const totalRecords = summary?.totalRecords || 0;
    const topEventName = summary?.topEvent?.name || '—';

    // Donut data: Money vs In-Kind
    const moneyCount = summary?.moneyCount || 0;
    const inKindCount = summary?.inKindCount || 0;
    const moneyPct = (moneyCount + inKindCount) > 0 ? (moneyCount / (moneyCount + inKindCount)) * 100 : 0;

    // Bar chart data: by event type
    const byEventType = summary?.byEventType || [];
    const barColors = ['#00450d', '#a0f499', '#ffddb5', '#533400', '#c0c9bb'];

    // In-kind breakdown
    const byInKindCategory = summary?.byInKindCategory || [];
    const totalInKind = byInKindCategory.reduce((s, r) => s + (r._count?.id || 0), 0);
    const inKindColors = {
      FOOD: 'bg-primary',
      CLOTHES: 'bg-secondary',
      SUPPLIES: 'bg-secondary-container',
      OTHERS: 'bg-surface-variant',
    };

    const columns = [
      { key: 'date',        label: 'Date' },
      { key: 'event',       label: 'Event' },
      { key: 'contributor', label: 'Contributor' },
      { key: 'type',        label: 'Type' },
      { key: 'amount',      label: 'Amount / Item' },
      { key: 'method',      label: 'Method' },
      { key: 'actions',     label: 'Actions', align: 'right' },
    ];

    return (
      <div className="space-y-6">
        {/* ── SECTION A — Chart Filter Bar ─────────────────────────────── */}
        <div className="bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Monthly / Yearly toggle */}
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

            {/* Month dropdown — hidden in yearly */}
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

            {/* Event dropdown */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" style={{ fontSize: 18 }}>celebration</span>
              <select
                value={chartEvent}
                onChange={(e) => setChartEvent(e.target.value)}
                className="w-full pl-8 pr-2 py-2 h-10 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:ring-0 appearance-none cursor-pointer hover:border-outline transition-colors"
              >
                <option value="">All Events</option>
                {CHURCH_EVENT_TYPES.map((ev) => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" style={{ fontSize: 18 }}>arrow_drop_down</span>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => { fetchSummary(); fetchContributions(); }}
              className="ml-auto p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
              aria-label="Refresh"
              title="Refresh"
            >
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>refresh</span>
            </button>
          </div>
        </div>

        {/* ── SECTION B — KPI Cards ───────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>payments</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total Contributions</p>
              <p className="text-headline-md text-on-surface font-bold">{fmtKES(totalMoneyAmount)}</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>list_alt</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total Records</p>
              <p className="text-headline-md text-on-surface font-bold">{totalRecords}</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>star</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Top Event</p>
              <p className="text-headline-md text-on-surface font-bold truncate">{topEventName}</p>
            </div>
          </div>
        </div>

        {/* ── SECTION C — Two Charts side by side ────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Donut: Money vs In-Kind */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 flex flex-col gap-4">
            <h3 className="text-headline-md text-primary">Money vs In-Kind</h3>
            {(moneyCount + inKindCount) === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-body-sm text-on-surface-variant">No data for this period.</p>
              </div>
            ) : (
              <ReactECharts
                notMerge={true}
                style={{ height: '300px', width: '100%' }}
                option={{
                  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                  legend: { bottom: 8, left: 'center', textStyle: { fontSize: 11 } },
                  series: [{
                    type: 'pie',
                    radius: ['55%', '75%'],
                    avoidLabelOverlap: false,
                    label: {
                      show: true, position: 'center',
                      formatter: () => `{a|${moneyPct.toFixed(0)}%}\n{b|Money}`,
                      rich: {
                        a: { fontSize: 24, fontWeight: 'bold', color: '#00450d' },
                        b: { fontSize: 11, color: '#5c6060' },
                      },
                    },
                    data: [
                      { value: moneyCount,  name: 'Money',   itemStyle: { color: '#00450d' } },
                      { value: inKindCount, name: 'In-Kind', itemStyle: { color: '#a0f499' } },
                    ],
                  }],
                }}
              />
            )}
          </div>

          {/* Bar: Contributions by Event */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 flex flex-col gap-4">
            <h3 className="text-headline-md text-primary">Contributions by Event</h3>
            {byEventType.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-body-sm text-on-surface-variant">No data for this period.</p>
              </div>
            ) : (
              <ReactECharts
                notMerge={true}
                style={{ height: '300px', width: '100%' }}
                option={{
                  grid: { left: 60, right: 24, top: 16, bottom: 60 },
                  tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    formatter: (params) => params[0] ? `${params[0].name}<br/>${params[0].value} contributions` : '',
                  },
                  xAxis: {
                    type: 'category',
                    data: byEventType.map((d) => d.eventName),
                    axisLine: { lineStyle: { color: '#c0c9bb' } },
                    axisTick: { show: false },
                    axisLabel: { color: '#41493e', fontSize: 10, rotate: 25, interval: 0 },
                    splitLine: { show: false },
                  },
                  yAxis: {
                    type: 'value',
                    axisLabel: { color: '#41493e', fontSize: 11 },
                    splitLine: { lineStyle: { color: '#f0eded' } },
                    axisLine: { show: false },
                  },
                  series: [{
                    name: 'Contributions',
                    type: 'bar',
                    data: byEventType.map((d, i) => ({
                      value: d._count?.id || 0,
                      itemStyle: { color: barColors[i % barColors.length], borderRadius: [4, 4, 0, 0] },
                    })),
                    barMaxWidth: 48,
                    label: {
                      show: true, position: 'top',
                      formatter: (p) => p.value > 0 ? String(p.value) : '',
                      fontSize: 10, color: '#41493e',
                    },
                  }],
                }}
              />
            )}
          </div>
        </div>

        {/* ── SECTION D — In-Kind Stacked Bar ────────────────────────── */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6">
          <h3 className="text-headline-md text-primary mb-4">In-Kind Donations Breakdown</h3>
          {totalInKind === 0 ? (
            <p className="text-body-sm text-on-surface-variant py-8 text-center">No in-kind donations for this period.</p>
          ) : (
            <>
              <div className="flex h-8 rounded-lg overflow-hidden bg-surface-container">
                {byInKindCategory.map((cat) => {
                  const catKey = cat.inKindCategory || 'OTHERS';
                  const count = cat._count?.id || 0;
                  const pct = (count / totalInKind) * 100;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={catKey}
                      className={`${inKindColors[catKey] || 'bg-surface-variant'} flex items-center justify-center text-[10px] font-bold text-on-surface`}
                      style={{ width: `${pct}%` }}
                      title={`${catKey}: ${count} (${pct.toFixed(1)}%)`}
                    >
                      {pct > 8 ? `${pct.toFixed(0)}%` : ''}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 justify-center">
                {byInKindCategory.map((cat) => {
                  const catKey = cat.inKindCategory || 'OTHERS';
                  const count = cat._count?.id || 0;
                  const pct = (count / totalInKind) * 100;
                  return (
                    <div key={catKey} className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-sm ${inKindColors[catKey] || 'bg-surface-variant'}`} />
                      <span className="text-label-sm text-on-surface-variant">
                        {catKey}: {count} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── SECTION E — Transaction Header + Filter Panel ──────────── */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-headline-md text-primary">All Event Contributions</h3>
              <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary text-label-sm font-bold">
                {total} {total === 1 ? 'record' : 'records'}
              </span>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" style={{ fontSize: 20 }}>search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by contributor, event name, or description..."
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-b-2 border-primary rounded-t-xl text-body-md text-on-surface outline-none focus:bg-surface-container placeholder:text-on-surface-variant/60"
              />
            </div>

            {/* Filter grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Year */}
              <div className="relative">
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface appearance-none cursor-pointer hover:border-outline transition-colors focus:border-primary focus:ring-0"
                >
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {/* Month */}
              <div className="relative">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface appearance-none cursor-pointer hover:border-outline transition-colors focus:border-primary focus:ring-0"
                >
                  <option value="">All Months</option>
                  {MONTH_NAMES.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                </select>
              </div>
              {/* Type */}
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface appearance-none cursor-pointer hover:border-outline transition-colors focus:border-primary focus:ring-0"
                >
                  <option value="">All Types</option>
                  <option value="MONEY">Money</option>
                  <option value="IN_KIND">In-Kind</option>
                </select>
              </div>
              {/* Method */}
              <div className="relative">
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface appearance-none cursor-pointer hover:border-outline transition-colors focus:border-primary focus:ring-0"
                >
                  <option value="">All Methods</option>
                  <option value="CASH">Cash</option>
                  <option value="MPESA">M-Pesa</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION F — Data Table ─────────────────────────────────── */}
        <UniversalTable
          columns={columns}
          data={contributions}
          loading={tableLoading}
          emptyMessage="No event contributions found."
          emptyIcon="celebration"
          page={page}
          pageSize={LIMIT}
          total={total}
          onPageChange={setPage}
          renderRow={(row, idx) => (
            <tr key={row.id || idx} className={`hover:bg-surface-container transition-colors ${idx % 2 === 1 ? 'bg-surface-container-low/30' : ''}`}>
              <td className="px-6 py-4 text-body-sm whitespace-nowrap">
                {row.eventDate ? formatDate(row.eventDate) : '—'}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>celebration</span>
                  <span className="text-body-sm text-on-surface">{row.eventName}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-body-sm text-on-surface">{row.contributorName}</td>
              <td className="px-6 py-4">{contributionBadge(row.contributionType)}</td>
              <td className="px-6 py-4 text-body-sm">
                {row.contributionType === 'MONEY' ? (
                  <span className="font-bold text-primary">{fmtKES(row.amount)}</span>
                ) : (
                  <span className="text-on-surface-variant">
                    {row.inKindCategory}
                    {row.inKindOtherType ? ` (${row.inKindOtherType})` : ''}
                  </span>
                )}
              </td>
              <td className="px-6 py-4">{row.contributionType === 'MONEY' ? paymentBadge(row.paymentMethod) : <span className="text-on-surface-variant">—</span>}</td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleEdit(row)}
                  className="p-1.5 text-primary hover:bg-primary-container/30 rounded-lg transition-colors"
                  aria-label="Edit"
                  title="Edit"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  className="p-1.5 text-error hover:bg-error-container/30 rounded-lg transition-colors"
                  aria-label="Delete"
                  title="Delete"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                </button>
              </td>
            </tr>
          )}
        />
      </div>
    );
  };

  // ─── Edit modal ────────────────────────────────────────────────────────
  const renderEditModal = () => {
    if (!editOpen || !editItem) return null;

    return (
      <EditEventModal
        item={editItem}
        onClose={() => { setEditOpen(false); setEditItem(null); }}
        onSuccess={() => {
          setEditOpen(false);
          setEditItem(null);
          fetchContributions();
          fetchSummary();
          fetchRecent();
        }}
      />
    );
  };

  return (
    <div className="space-y-6">
      {renderTabs()}
      {activeTab === 'record' ? renderRecordTab() : renderRecordsTab()}
      {renderEditModal()}
    </div>
  );
}

// ============================================================================
// Edit Modal — separate component for clarity
// ============================================================================
function EditEventModal({ item, onClose, onSuccess }) {
  const { showError, showSuccess } = useToast();
  const [editForm, setEditForm] = useState({
    contributorName: item.contributorName || '',
    contributionType: item.contributionType || 'MONEY',
    purpose: item.purpose || '',
    amount: item.amount ? String(item.amount) : '',
    paymentMethod: item.paymentMethod || 'CASH',
    mpesaReceiptNo: item.mpesaReceiptNo || '',
    bankName: item.bankName || '',
    accountNo: item.accountNo || '',
    idNumber: item.idNumber || '',
    inKindCategory: item.inKindCategory || '',
    inKindDescription: item.inKindDescription || '',
    inKindOtherType: item.inKindOtherType || '',
    eventType: item.eventType || 'CUSTOM',
    eventName: item.eventName || '',
    eventDate: item.eventDate ? String(item.eventDate).split('T')[0] : '',
    notes: item.notes || '',
  });
  const [editProgrammeTeam, setEditProgrammeTeam] = useState(() => {
    try {
      const parsed = item.programmeTeam ? JSON.parse(item.programmeTeam) : [];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ name: '', role: '' }];
    } catch {
      return [{ name: '', role: '' }];
    }
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm((p) => ({ ...p, [name]: value }));

    if (name === 'eventType') {
      const preset = getPresetByValue(value);
      if (preset && value !== 'CUSTOM') {
        const autoDate = getPresetDateForYear(preset, new Date().getFullYear());
        setEditForm((p) => ({
          ...p,
          eventType: value,
          eventName: preset.label,
          eventDate: autoDate || p.eventDate,
        }));
      }
    }
  };

  const handleTeamChange = (idx, field, value) => {
    setEditProgrammeTeam((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const addTeamMember = () => setEditProgrammeTeam((p) => [...p, { name: '', role: '' }]);

  const removeTeamMember = (idx) => {
    if (editProgrammeTeam.length <= 1) return;
    setEditProgrammeTeam((p) => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!editForm.contributorName.trim()) errs.contributorName = 'Required.';
    if (!editForm.eventName.trim()) errs.eventName = 'Required.';
    if (!editForm.eventDate) errs.eventDate = 'Required.';
    if (editForm.contributionType === 'MONEY') {
      if (!editForm.purpose) errs.purpose = 'Required.';
      const amt = parseFloat(editForm.amount);
      if (!editForm.amount || isNaN(amt) || amt <= 0) errs.amount = 'Invalid amount.';
    } else {
      if (!editForm.inKindCategory) errs.inKindCategory = 'Required.';
      if (!editForm.inKindDescription.trim()) errs.inKindDescription = 'Required.';
      if (editForm.inKindCategory === 'OTHERS' && !editForm.inKindOtherType.trim()) {
        errs.inKindOtherType = 'Required.';
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await api.put(`/events/${item.id}`, {
        ...editForm,
        amount: editForm.contributionType === 'MONEY' ? parseFloat(editForm.amount) : null,
        programmeTeam: editProgrammeTeam,
      });
      showSuccess('Event contribution updated.');
      onSuccess();
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to update contribution.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <div>
            <h2 className="text-headline-md text-on-surface">Update Event Record</h2>
            <p className="text-label-sm text-on-surface-variant">Edit the contribution details below</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Contributor name */}
          <div>
            <label className="text-label-md text-on-surface-variant">Contributor Name</label>
            <input
              type="text"
              name="contributorName"
              value={editForm.contributorName}
              onChange={handleChange}
              className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors ${errors.contributorName ? 'border-error' : 'border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary'}`}
            />
            {errors.contributorName && <p className="text-label-sm text-error mt-1">{errors.contributorName}</p>}
          </div>

          {/* Contribution type */}
          <div>
            <label className="text-label-md text-on-surface-variant block mb-2">Contribution Type</label>
            <div className="grid grid-cols-2 bg-surface-container-high p-xs rounded-full">
              {['MONEY', 'IN_KIND'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEditForm((p) => ({ ...p, contributionType: t }))}
                  className={`py-2 rounded-full text-label-md font-medium transition-all ${
                    editForm.contributionType === t ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'
                  }`}
                >
                  {t === 'MONEY' ? 'Money' : 'In-Kind'}
                </button>
              ))}
            </div>
          </div>

          {/* Money fields */}
          {editForm.contributionType === 'MONEY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary-container/10 rounded-lg border border-secondary/20">
              <div>
                <label className="text-label-md text-on-surface-variant">Purpose</label>
                <select
                  name="purpose"
                  value={editForm.purpose}
                  onChange={handleChange}
                  className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none appearance-none ${errors.purpose ? 'border-error' : 'border-outline-variant'}`}
                >
                  <option value="">Select purpose</option>
                  {MONEY_PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-label-md text-on-surface-variant">Amount (KES)</label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  value={editForm.amount}
                  onChange={handleChange}
                  className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none ${errors.amount ? 'border-error' : 'border-outline-variant'}`}
                />
              </div>
              <div>
                <label className="text-label-md text-on-surface-variant">Payment Method</label>
                <select
                  name="paymentMethod"
                  value={editForm.paymentMethod}
                  onChange={handleChange}
                  className="mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-lg text-on-surface outline-none appearance-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="MPESA">M-Pesa</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              {editForm.paymentMethod === 'MPESA' && (
                <div>
                  <label className="text-label-md text-on-surface-variant">M-Pesa Receipt No.</label>
                  <input
                    type="text"
                    name="mpesaReceiptNo"
                    value={editForm.mpesaReceiptNo}
                    onChange={handleChange}
                    className="mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-lg text-on-surface outline-none"
                  />
                </div>
              )}
              {editForm.paymentMethod === 'BANK_TRANSFER' && (
                <>
                  <div>
                    <label className="text-label-md text-on-surface-variant">Bank Name</label>
                    <input
                      type="text"
                      name="bankName"
                      value={editForm.bankName}
                      onChange={handleChange}
                      className="mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-lg text-on-surface outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-label-md text-on-surface-variant">Account No.</label>
                    <input
                      type="text"
                      name="accountNo"
                      value={editForm.accountNo}
                      onChange={handleChange}
                      className="mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-lg text-on-surface outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* In-Kind fields */}
          {editForm.contributionType === 'IN_KIND' && (
            <div className="space-y-3 p-4 bg-primary-fixed/10 rounded-lg border border-primary/20">
              <div>
                <label className="text-label-md text-on-surface-variant">Category</label>
                <select
                  name="inKindCategory"
                  value={editForm.inKindCategory}
                  onChange={handleChange}
                  className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none appearance-none ${errors.inKindCategory ? 'border-error' : 'border-outline-variant'}`}
                >
                  <option value="">Select category</option>
                  {IN_KIND_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              {editForm.inKindCategory === 'OTHERS' && (
                <div>
                  <label className="text-label-md text-on-surface-variant">Specify Donation Type</label>
                  <input
                    type="text"
                    name="inKindOtherType"
                    value={editForm.inKindOtherType}
                    onChange={handleChange}
                    className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none ${errors.inKindOtherType ? 'border-error' : 'border-outline-variant'}`}
                  />
                </div>
              )}
              <div>
                <label className="text-label-md text-on-surface-variant">Description</label>
                <textarea
                  name="inKindDescription"
                  value={editForm.inKindDescription}
                  onChange={handleChange}
                  rows={3}
                  className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none resize-y ${errors.inKindDescription ? 'border-error' : 'border-outline-variant'}`}
                />
              </div>
            </div>
          )}

          {/* Event details */}
          <div className="space-y-3 p-4 bg-surface-container-low rounded-lg border border-outline-variant/30">
            <div>
              <label className="text-label-md text-on-surface-variant">Event Type</label>
              <select
                name="eventType"
                value={editForm.eventType}
                onChange={handleChange}
                className="mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-lg text-on-surface outline-none appearance-none"
              >
                {CHURCH_EVENT_TYPES.map((ev) => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-label-md text-on-surface-variant">Event Name</label>
                <input
                  type="text"
                  name="eventName"
                  value={editForm.eventName}
                  onChange={handleChange}
                  disabled={editForm.eventType !== 'CUSTOM'}
                  className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none ${errors.eventName ? 'border-error' : 'border-outline-variant'} ${editForm.eventType !== 'CUSTOM' ? 'opacity-70' : ''}`}
                />
              </div>
              <div>
                <label className="text-label-md text-on-surface-variant">Event Date</label>
                <input
                  type="date"
                  name="eventDate"
                  value={editForm.eventDate}
                  onChange={handleChange}
                  disabled={editForm.eventType !== 'CUSTOM'}
                  className={`mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none ${errors.eventDate ? 'border-error' : 'border-outline-variant'} ${editForm.eventType !== 'CUSTOM' ? 'opacity-70' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Programme team */}
          <div className="space-y-3 p-4 bg-surface-container-low rounded-lg border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <p className="text-label-md font-bold text-on-surface uppercase tracking-wider">Programme Team</p>
              <button
                type="button"
                onClick={addTeamMember}
                className="flex items-center gap-1 text-label-sm text-primary hover:text-primary/80"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Add Member
              </button>
            </div>
            {editProgrammeTeam.map((member, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => handleTeamChange(idx, 'name', e.target.value)}
                  placeholder="Name"
                  className="w-full px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface outline-none focus:border-secondary"
                />
                <select
                  value={member.role}
                  onChange={(e) => handleTeamChange(idx, 'role', e.target.value)}
                  className="w-full px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface outline-none focus:border-secondary appearance-none"
                >
                  <option value="">Select role</option>
                  {PROGRAMME_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => removeTeamMember(idx)}
                  disabled={editProgrammeTeam.length <= 1}
                  className="p-2 text-error hover:bg-error-container/30 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Remove"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                </button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="text-label-md text-on-surface-variant">Notes</label>
            <textarea
              name="notes"
              value={editForm.notes}
              onChange={handleChange}
              rows={2}
              className="mt-1.5 w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-lg text-on-surface outline-none focus:border-secondary resize-y"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-primary text-on-primary rounded-full text-label-md font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {saving ? 'sync' : 'save'}
            </span>
            {saving ? 'Updating...' : 'Update Contribution'}
          </button>
        </div>
      </div>
    </div>
  );
}
