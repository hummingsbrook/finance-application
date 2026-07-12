import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { formatKES } from '../../lib/utils';
import Button from '../../components/ui/Button';

const PAYMENT_TYPES = [
  { value: 'TITHE', label: 'Tithe', description: 'Your faithful 10% giving' },
  { value: 'OFFERING', label: 'Offering', description: 'Freewill offering to the Lord' },
  { value: 'HARAMBEE', label: 'Harambee', description: 'Building fund contribution' },
];

const QUICK_AMOUNTS = [100, 500, 1000];

export default function MakePayment() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [step, setStep] = useState(1);
  const [paymentType, setPaymentType] = useState('TITHE');
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone?.replace(/^(\+?254|0)/, '') || '');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [harambees, setHarambees] = useState([]);
  const [selectedHarambeeId, setSelectedHarambeeId] = useState('');
  const [errors, setErrors] = useState({});

  // STK push simulation state
  const [stkInitiated, setStkInitiated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [countdown, setCountdown] = useState(120);

  // Fetch harambees
  useEffect(() => {
    async function fetchHarambees() {
      try {
        const res = await api.get('/harambees');
        setHarambees(res.data?.harambees || res.data || []);
      } catch {
        // Harambees are optional
      }
    }
    fetchHarambees();
  }, []);

  // Countdown timer for STK push
  useEffect(() => {
    if (!stkInitiated) return;
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [stkInitiated, countdown]);

  function validateStep(s) {
    const errs = {};
    if (s === 1) {
      if (paymentType === 'HARAMBEE' && !selectedHarambeeId) {
        errs.harambee = 'Please select a harambee project.';
      }
    }
    if (s === 2) {
      const num = parseFloat(amount);
      if (!amount || isNaN(num) || num <= 0) {
        errs.amount = 'Please enter a valid amount.';
      }
      if (num > 0 && num < 1) {
        errs.amount = 'Minimum amount is KES 1.';
      }
    }
    if (s === 3 && paymentMethod === 'mpesa') {
      const phone = phoneNumber.replace(/\s/g, '');
      if (!phone || !/^[17]\d{8}$/.test(phone)) {
        errs.phone = 'Enter a valid Safaricom number (e.g. 712 345 678).';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goStep(s) {
    if (s > step && !validateStep(step)) return;
    setStep(s);
    setErrors({});
  }

  function handleQuickAmount(val) {
    setAmount(String(val));
  }

  async function handleSubmit() {
    if (!validateStep(3)) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        amount: parseFloat(amount),
        paymentType,
        paymentMethod,
      };

      if (paymentMethod === 'mpesa') {
        payload.phoneNumber = '254' + phoneNumber.replace(/\s/g, '');
      }

      if (paymentType === 'HARAMBEE') {
        payload.harambeeId = selectedHarambeeId;
      }

      const res = await api.post('/payments', payload);
      const payment = res.data;

      if (paymentMethod === 'mpesa') {
        // Show STK push simulation, then redirect
        setStkInitiated(true);
      } else {
        // Cash payment: redirect immediately
        navigate(`/partner/payment-status/${payment.id}`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to initiate payment. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function formatCountdown(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function handleCancel() {
    setStkInitiated(false);
    setCountdown(120);
  }

  const progressPercent = (step / 4) * 100;

  // STK Push Simulation Overlay
  if (stkInitiated) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-outline-variant/30 p-10 text-center relative">
          {/* Animated progress ring */}
          <div className="relative inline-flex items-center justify-center mb-8">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle className="text-surface-container-high" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="8" />
              <circle
                className="text-primary"
                cx="80" cy="80" fill="transparent" r="70"
                stroke="currentColor"
                strokeDasharray="440"
                strokeDashoffset={countdown > 0 ? (440 * (countdown / 120)) : 0}
                strokeLinecap="round"
                strokeWidth="8"
                style={{
                  transition: 'stroke-dashoffset 1s linear',
                  transformOrigin: '50% 50%',
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
          <p className="text-on-surface-variant text-body-lg mb-4 max-w-[280px] mx-auto">
            Enter your M-Pesa PIN to complete the payment.
          </p>
          <p className="text-label-sm text-on-surface-variant mb-8">
            Auto-refreshing in {formatCountdown(countdown)}
          </p>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-secondary-container/50 border border-secondary-container rounded-full mb-10">
            <span className="w-2.5 h-2.5 bg-secondary rounded-full animate-pulse" />
            <span className="text-label-md text-on-secondary-container">Awaiting authorization...</span>
          </div>

          {/* Action Links */}
          <div className="pt-6 border-t border-outline-variant/20 flex flex-col gap-4">
            <button
              onClick={() => navigate('/partner/dashboard')}
              className="text-primary text-label-md hover:underline transition-all cursor-pointer"
            >
              Return to Dashboard
            </button>
            <button
              onClick={handleCancel}
              className="text-on-surface-variant/70 text-label-sm hover:text-error transition-all cursor-pointer"
            >
              Cancel Transaction
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 flex items-center justify-center gap-8 opacity-60">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified_user</span>
              <span className="text-label-sm">Secured by SSL</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
              <span className="text-label-sm">End-to-end encrypted</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] relative overflow-hidden">
      {/* Atmospheric Background Elements */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-primary opacity-5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-secondary opacity-5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-surface-container-lowest shadow-sm rounded-xl overflow-hidden border border-outline-variant/30 flex flex-col relative z-10">
        {/* Progress Indicator */}
        <div className="w-full h-1.5 bg-surface-container-high flex">
          <div
            className="h-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="mb-8 text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-container text-on-primary-container mb-4">
              <span className="material-symbols-outlined">volunteer_activism</span>
            </span>
            <h2 className="text-headline-lg text-on-surface">Secure Stewardship Giving</h2>
            <p className="text-body-sm text-on-surface-variant mt-2">
              Your contribution supports our shared mission and community growth.
            </p>
          </div>

          {/* Error Display */}
          {submitError && (
            <div className="mb-6 p-4 bg-error-container rounded-lg flex items-center gap-3">
              <span className="material-symbols-outlined text-error" style={{ fontSize: 20 }}>error</span>
              <p className="text-body-sm text-on-error-container">{submitError}</p>
            </div>
          )}

          {/* Step 1: Purpose */}
          {step === 1 && (
            <section>
              <label className="block text-label-md text-on-surface mb-2">Purpose of Giving</label>

              {/* Payment Type Cards */}
              <div className="space-y-3">
                {PAYMENT_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    onClick={() => setPaymentType(pt.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
                      paymentType === pt.value
                        ? 'border-primary bg-primary-fixed/20'
                        : 'border-outline-variant hover:border-primary'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      paymentType === pt.value ? 'border-primary bg-primary' : 'border-outline-variant'
                    }`}>
                      {paymentType === pt.value && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-label-md text-on-surface font-bold">{pt.label}</p>
                      <p className="text-label-sm text-on-surface-variant">{pt.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Harambee dropdown */}
              {paymentType === 'HARAMBEE' && (
                <div className="mt-4">
                  <label className="block text-label-md text-on-surface-variant mb-2">Select Harambee Project</label>
                  <div className="relative">
                    <select
                      value={selectedHarambeeId}
                      onChange={(e) => setSelectedHarambeeId(e.target.value)}
                      className="w-full h-12 px-4 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary appearance-none cursor-pointer text-body-lg text-on-surface"
                    >
                      <option value="">-- Choose a project --</option>
                      {harambees.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} — {formatKES(h.targetAmount)} goal
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-3 text-on-surface-variant pointer-events-none">
                      expand_more
                    </span>
                  </div>
                  {errors.harambee && (
                    <p className="mt-1 text-label-sm text-error">{errors.harambee}</p>
                  )}
                </div>
              )}

              <Button fullWidth className="mt-8" onClick={() => goStep(2)}>
                Continue to Amount
              </Button>
            </section>
          )}

          {/* Step 2: Amount */}
          {step === 2 && (
            <section>
              <label className="block text-label-md text-on-surface mb-4">Amount to Give (KES)</label>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    onClick={() => handleQuickAmount(val)}
                    className={`h-12 border rounded-lg text-label-md transition-colors ${
                      String(amount) === String(val)
                        ? 'border-primary text-primary bg-primary-fixed/20'
                        : 'border-outline-variant hover:border-primary hover:text-primary'
                    }`}
                  >
                    {val.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-on-surface-variant font-bold text-body-lg">KES</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  className="w-full h-12 pl-16 pr-4 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-lg text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-colors"
                />
              </div>
              {errors.amount && (
                <p className="mt-2 text-label-sm text-error">{errors.amount}</p>
              )}

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => goStep(1)}
                  className="flex-1 border border-outline text-on-surface h-touch-target-min rounded-lg font-bold hover:bg-surface-container-high active:scale-95 transition-all"
                >
                  Back
                </button>
                <Button
                  variant="primary"
                  className="flex-[2] h-touch-target-min"
                  onClick={() => goStep(3)}
                >
                  Continue to Payment
                </Button>
              </div>
            </section>
          )}

          {/* Step 3: Payment Method & Phone */}
          {step === 3 && (
            <section>
              {/* Payment Method Toggle */}
              <label className="block text-label-md text-on-surface mb-3">Payment Method</label>
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setPaymentMethod('mpesa')}
                  className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border text-label-md font-bold transition-all ${
                    paymentMethod === 'mpesa'
                      ? 'border-primary bg-primary-fixed/20 text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:border-primary'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>smartphone</span>
                  M-Pesa
                </button>
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border text-label-md font-bold transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-primary bg-primary-fixed/20 text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:border-primary'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>payments</span>
                  Cash at Church
                </button>
              </div>

              {/* Phone Number (M-Pesa only) */}
              {paymentMethod === 'mpesa' && (
                <>
                  <label className="block text-label-md text-on-surface mb-2">M-Pesa Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-on-surface-variant font-bold text-body-lg">+254</span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="712 345 678"
                      maxLength={12}
                      className="w-full h-12 pl-16 pr-4 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-lg text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-colors"
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-label-sm text-error">{errors.phone}</p>
                  )}
                  <p className="text-label-sm text-on-surface-variant mt-3 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                    Enter the number registered with Safaricom M-Pesa
                  </p>
                </>
              )}

              {paymentMethod === 'cash' && (
                <div className="bg-secondary-container/30 border border-secondary-container rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-secondary" style={{ fontSize: 20 }}>info</span>
                    <span className="text-label-md text-secondary font-bold">Cash Payment</span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">
                    Please deliver the cash to the church treasurer. Your payment will be confirmed once recorded.
                  </p>
                </div>
              )}

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => goStep(2)}
                  className="flex-1 border border-outline text-on-surface h-touch-target-min rounded-lg font-bold hover:bg-surface-container-high active:scale-95 transition-all"
                >
                  Back
                </button>
                <Button
                  variant="primary"
                  className="flex-[2] h-touch-target-min"
                  onClick={handleSubmit}
                  loading={submitting}
                >
                  {paymentMethod === 'mpesa' ? 'Pay Now via M-Pesa' : 'Record Cash Payment'}
                </Button>
              </div>
            </section>
          )}

          {/* Step 4: Review & Confirm (bypassed — we submit directly from step 3) */}
        </div>
      </div>

      {/* Decorative Cards (XL screens) */}
      <div className="absolute right-12 bottom-12 w-64 p-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-white hidden xl:block">
        <h4 className="text-label-md text-secondary mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
          Monthly Goal
        </h4>
        <p className="text-label-sm text-on-surface-variant mb-4">Our Building Fund goal for this month is nearly reached!</p>
        <div className="w-full bg-surface-container rounded-full h-2 mb-2">
          <div className="bg-secondary h-full rounded-full" style={{ width: '82%' }} />
        </div>
        <div className="flex justify-between text-label-sm font-bold">
          <span>82% Complete</span>
          <span>KES 4.1M</span>
        </div>
      </div>

      <div className="absolute left-12 bottom-12 w-64 p-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-white hidden xl:block">
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-primary">verified_user</span>
          <span className="text-label-md text-primary">Transparency</span>
        </div>
        <p className="text-label-sm text-on-surface-variant leading-relaxed">
          ChurchFinance Pro ensures every shilling is tracked. You can view your complete giving statement anytime in the Dashboard.
        </p>
      </div>
    </div>
  );
}