import { useState, useEffect } from 'react';
import Input from './Input';
import useDuplicateCheck from '../../hooks/useDuplicateCheck';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function TitheEditOverlay({ isOpen, tithe, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const { duplicateError, checkDuplicate, clearDuplicateError } = useDuplicateCheck('tithes');

  // Populate form whenever the overlay opens or the tithe changes
  useEffect(() => {
    if (isOpen && tithe) {
      const method = (tithe.paymentMethod || 'CASH').toLowerCase();
      setForm({
        contributorName: tithe.contributorName || '',
        amount: tithe.amount != null ? String(tithe.amount) : '',
        date: tithe.date ? tithe.date.split('T')[0] : '',
        paymentMethod: method === 'bank_transfer' ? 'bank' : method,
        mpesaReceiptNo: tithe.mpesaReceiptNo || '',
        bankName: tithe.bankName || '',
        chequeNumber: tithe.chequeNumber || '',
        idNumber: tithe.idNumber || '',
        notes: tithe.notes || '',
        status: tithe.status || 'CONFIRMED',
      });
      setErrors({});
      clearDuplicateError();
    }
  }, [isOpen, tithe, clearDuplicateError]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.contributorName?.trim()) errs.contributorName = 'Contributor name is required.';
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount greater than 0.';
    if (!form.date) errs.date = 'Date is required.';
    if (form.paymentMethod === 'mpesa' && !form.mpesaReceiptNo?.trim())
      errs.mpesaReceiptNo = 'M-Pesa receipt number is required.';
    if (form.paymentMethod === 'bank') {
      if (!form.bankName?.trim()) errs.bankName = 'Bank name is required.';
      if (!form.chequeNumber?.trim()) errs.chequeNumber = 'Cheque number is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(tithe.id, {
        contributorName: form.contributorName,
        amount: parseFloat(form.amount),
        date: form.date,
        paymentMethod: form.paymentMethod === 'bank' ? 'BANK_TRANSFER' : form.paymentMethod.toUpperCase(),
        mpesaReceiptNo: form.mpesaReceiptNo || null,
        bankName: form.bankName || null,
        chequeNumber: form.chequeNumber || null,
        idNumber: form.idNumber || null,
        notes: form.notes || null,
        status: form.status,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const dateLabel = form.date
    ? (() => {
        const d = new Date(form.date + 'T00:00:00');
        return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      })()
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Edit Tithe Record"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: 20 }}>
                edit
              </span>
            </div>
            <div>
              <h2 className="text-title-lg font-bold text-on-surface">Edit Tithe Record</h2>
              {dateLabel && (
                <p className="text-body-sm text-on-surface-variant">{dateLabel}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-6">

          {/* Contributor */}
          <Input
            label="Contributor Name"
            name="contributorName"
            value={form.contributorName}
            onChange={handleChange}
            placeholder="Full name"
            icon="person"
            required
            error={errors.contributorName}
          />

          {/* Amount + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Amount (KES)"
              name="amount"
              type="number"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              required
              error={errors.amount}
            />
            <Input
              label="Contribution Date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              required
              error={errors.date}
            />
          </div>

          {/* ID Number */}
          <Input
            label="ID Number (Optional)"
            name="idNumber"
            value={form.idNumber}
            onChange={handleChange}
            placeholder="National ID or Passport number"
            icon="badge"
          />

          {/* Payment Method */}
          <div className="space-y-3">
            <label className="text-label-md text-on-surface-variant block">Payment Method</label>
            <div className="flex p-1 bg-surface-container rounded-xl w-full">
              {[
                { value: 'cash', label: 'Cash' },
                { value: 'mpesa', label: 'M-Pesa' },
                { value: 'bank', label: 'Bank' },
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

          {/* M-Pesa receipt */}
          {form.paymentMethod === 'mpesa' && (
            <Input
              label="M-Pesa Receipt Number"
              name="mpesaReceiptNo"
              value={form.mpesaReceiptNo}
              onChange={handleChange}
              onBlur={() => checkDuplicate(form.mpesaReceiptNo, 'mpesaReceiptNo', tithe?.id)}
              placeholder="e.g. RJH8945KL3"
              error={errors.mpesaReceiptNo || (duplicateError && form.mpesaReceiptNo ? duplicateError : undefined)}
            />
          )}

          {/* Bank fields */}
          {form.paymentMethod === 'bank' && (
            <div className="space-y-4 p-4 bg-surface-container rounded-xl border border-outline-variant/50">
              <p className="text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">Bank Payment Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Bank Name"
                  name="bankName"
                  value={form.bankName}
                  onChange={handleChange}
                  placeholder="e.g. Equity Bank"
                  icon="account_balance"
                  required
                  error={errors.bankName}
                />
                <Input
                  label="Cheque Number"
                  name="chequeNumber"
                  value={form.chequeNumber}
                  onChange={handleChange}
                  onBlur={() => checkDuplicate(form.chequeNumber, 'chequeNumber', tithe?.id)}
                  placeholder="e.g. 000123456"
                  icon="receipt"
                  required
                  error={errors.chequeNumber || (duplicateError && form.chequeNumber ? duplicateError : undefined)}
                />
              </div>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <label className="text-label-md text-on-surface-variant block">Status</label>
            <div className="flex p-1 bg-surface-container rounded-xl w-full">
              {[
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'REVERSED', label: 'Reversed' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, status: value }))}
                  className={`flex-1 px-3 py-2 rounded-lg font-bold text-label-sm transition-all ${
                    form.status === value
                      ? value === 'REVERSED'
                        ? 'bg-error text-on-error shadow-sm'
                        : value === 'PENDING'
                        ? 'bg-tertiary-container text-on-tertiary-container shadow-sm'
                        : 'bg-secondary-container text-on-secondary-container shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-variant/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1.5">Notes (Optional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Additional details about this contribution..."
              rows={3}
              className="w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-md text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary resize-none"
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-outline-variant px-6 py-4 flex items-center justify-end gap-3 bg-surface-container-low">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface text-label-md font-semibold hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-on-primary text-label-md font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>sync</span>
                Saving…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
