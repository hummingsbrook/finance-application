import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatKES, formatDateTime } from '../../lib/utils';
import Button from '../../components/ui/Button';

const STATUS_LABELS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  FAILED: 'Failed',
};

export default function PaymentStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayment = useCallback(async () => {
    try {
      setError(null);
      // Try dedicated endpoint first, fallback to list
      let data;
      try {
        const res = await api.get(`/payments/${id}`);
        data = res.data;
      } catch {
        const res = await api.get('/payments/my');
        const payments = res.data?.payments || [];
        data = payments.find((p) => String(p.id) === String(id)) || null;
      }
      setPayment(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payment details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  // Auto-refresh every 5 seconds while PENDING
  useEffect(() => {
    if (!payment) return;
    const status = (payment.status || '').toUpperCase();
    if (status !== 'PENDING') return;

    const interval = setInterval(() => {
      fetchPayment();
    }, 5000);
    return () => clearInterval(interval);
  }, [payment, fetchPayment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-primary mb-4 block" style={{ fontSize: 48 }}>
            sync
          </span>
          <p className="text-body-lg text-on-surface-variant">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="max-w-md w-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-10 text-center">
          <span className="material-symbols-outlined text-error mb-4 block" style={{ fontSize: 48 }}>error</span>
          <h2 className="text-headline-lg text-on-surface mb-2">Payment Not Found</h2>
          <p className="text-body-lg text-on-surface-variant mb-6">
            {error || 'We could not find a payment with this reference.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate('/partner/dashboard')}>Go to Dashboard</Button>
            <Button variant="ghost" onClick={() => navigate('/partner/give')}>Make a Payment</Button>
          </div>
        </div>
      </div>
    );
  }

  const status = (payment.status || '').toUpperCase();
  const amount = payment.amount || 0;
  const type = payment.paymentType || '';
  const dateStr = payment.createdAt || payment.date || '';
  const receiptNo = payment.receiptNumber || payment.mpesaRef || `CFP-${id}`;
  const failureReason = payment.failureReason || payment.rejectReason || 'Transaction could not be completed.';

  // ─── PENDING STATE ──────────────────────────────────────────────
  if (status === 'PENDING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] relative">
        {/* Atmospheric effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center items-center opacity-30">
          <div className="w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-secondary-fixed-dim blur-[120px] rounded-full mix-blend-multiply opacity-20 animate-pulse" />
        </div>

        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-outline-variant/30 p-10 text-center relative z-10">
          {/* Spinning Progress Ring */}
          <div className="relative inline-flex items-center justify-center mb-8">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle className="text-surface-container-high" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="8" />
              <circle
                className="text-primary"
                cx="80" cy="80" fill="transparent" r="70"
                stroke="currentColor"
                strokeDasharray="440"
                strokeLinecap="round"
                strokeWidth="8"
                style={{
                  animation: 'rotate-progress 3s linear infinite',
                  strokeDashoffset: '82',
                }}
              />
            </svg>
            <div className="absolute flex items-center justify-center w-24 h-24 bg-primary-container rounded-full shadow-lg">
              <span className="material-symbols-outlined text-on-primary-container" style={{ fontSize: 48 }}>
                smartphone
              </span>
            </div>
          </div>

          <h2 className="text-headline-lg text-on-surface mb-2">Check your phone now</h2>
          <p className="text-on-surface-variant text-body-lg mb-8 max-w-[280px] mx-auto">
            Enter your M-Pesa PIN to complete the payment.
          </p>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-secondary-container/50 border border-secondary-container rounded-full mb-10">
            <span className="w-2.5 h-2.5 bg-secondary rounded-full animate-pulse" />
            <span className="text-label-md text-on-secondary-container">Awaiting authorization...</span>
          </div>

          {/* Payment Details Summary */}
          <div className="bg-surface-container rounded-xl p-4 mb-8 border border-outline-variant/20 text-left">
            <div className="flex justify-between mb-2">
              <span className="text-body-sm text-on-surface-variant">Amount</span>
              <span className="text-label-md text-on-surface font-bold">{formatKES(amount)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-body-sm text-on-surface-variant">Type</span>
              <span className="text-body-sm text-on-surface">{type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-sm text-on-surface-variant">Reference</span>
              <span className="text-body-sm text-on-surface font-mono">{receiptNo}</span>
            </div>
          </div>

          {/* Auto-refresh note */}
          <p className="text-label-sm text-on-surface-variant mb-6">
            <span className="material-symbols-outlined align-middle" style={{ fontSize: 14 }}>sync</span>
            This page auto-refreshes every 5 seconds.
          </p>

          {/* Actions */}
          <div className="pt-6 border-t border-outline-variant/20 flex flex-col gap-4">
            <button
              onClick={() => navigate('/partner/dashboard')}
              className="text-primary text-label-md hover:underline transition-all cursor-pointer"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => navigate('/partner/give')}
              className="text-on-surface-variant/70 text-label-sm hover:text-error transition-all cursor-pointer"
            >
              Cancel and make a new payment
            </button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-6 flex items-center justify-center gap-8 opacity-60 relative z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified_user</span>
            <span className="text-label-sm">Secured by SSL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
            <span className="text-label-sm">End-to-end encrypted</span>
          </div>
        </div>

        {/* Inline keyframes for the progress ring animation */}
        <style>{`
          @keyframes rotate-progress {
            0% { stroke-dashoffset: 440; transform: rotate(-90deg); }
            50% { stroke-dashoffset: 100; transform: rotate(180deg); }
            100% { stroke-dashoffset: 440; transform: rotate(270deg); }
          }
        `}</style>
      </div>
    );
  }

  // ─── CONFIRMED / VERIFIED STATE ──────────────────────────────────
  if (status === 'CONFIRMED' || status === 'VERIFIED') {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="max-w-xl w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/30">
          {/* Green top bar */}
          <div className="h-2 w-full bg-secondary" />

          <div className="p-10 flex flex-col items-center text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full bg-[#E8F5E9] flex items-center justify-center mb-6">
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>

            <h2 className="text-headline-lg text-on-surface mb-2">Payment Successful!</h2>
            <p className="text-body-lg text-on-surface-variant max-w-sm mb-8">
              Your contribution has been received and recorded. Thank you for your faithful stewardship.
            </p>

            {/* Payment Details */}
            <div className="w-full grid grid-cols-2 gap-4 bg-surface-container-low p-6 rounded-lg border border-outline-variant mb-8 text-left">
              <div className="flex flex-col gap-1">
                <span className="text-label-sm text-on-surface-variant uppercase tracking-tight">Amount</span>
                <span className="text-headline-md text-primary font-bold">{formatKES(amount)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-label-sm text-on-surface-variant uppercase tracking-tight">Type</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                  <span className="text-label-md text-on-surface">{type}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-label-sm text-on-surface-variant uppercase tracking-tight">Date & Time</span>
                <span className="text-label-md text-on-surface">{formatDateTime(dateStr)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-label-sm text-on-surface-variant uppercase tracking-tight">Receipt No.</span>
                <span className="text-label-md text-on-surface font-mono">{receiptNo}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => navigate('/partner/give')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
                Give Again
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => navigate('/partner/dashboard')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>dashboard</span>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── REJECTED / FAILED STATE ────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="max-w-xl w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/30 transition-all duration-300 hover:shadow-md">
        {/* Red top bar */}
        <div className="h-2 w-full bg-error" />

        <div className="p-10 flex flex-col items-center text-center">
          {/* Error Icon with shake */}
          <div className="w-20 h-20 rounded-full bg-error-container flex items-center justify-center mb-6">
            <span
              className="material-symbols-outlined text-error"
              style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
          </div>

          <h2 className="text-headline-lg text-on-surface mb-2">Payment Failed</h2>
          <p className="text-body-lg text-on-surface-variant max-w-sm mb-6">
            {failureReason}
          </p>

          {/* Transaction Details */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-low p-6 rounded-lg border border-outline-variant mb-6 text-left">
            <div className="flex flex-col gap-1">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-tight">Reference ID</span>
              <span className="text-label-md text-on-surface font-mono">{receiptNo}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-tight">Fund Category</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-label-md text-on-surface">{type}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-tight">Attempt Date</span>
              <span className="text-label-md text-on-surface">{formatDateTime(dateStr)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-tight">Failure Reason</span>
              <span className="text-label-md text-error">{failureReason}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => navigate('/partner/give')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>refresh</span>
              Try Again
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => navigate('/partner/dashboard')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>dashboard</span>
              Go to Dashboard
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-outline-variant w-full">
            <p className="text-body-sm text-on-surface-variant text-center">© 2026 ChurchFinance Pro</p>
          </div>
        </div>
      </div>

      {/* Decorative element */}
      <div className="fixed bottom-0 right-0 p-6 opacity-10 pointer-events-none">
        <span className="material-symbols-outlined" style={{ fontSize: 120, fontVariationSettings: "'FILL' 1" }}>account_balance</span>
      </div>
    </div>
  );
}