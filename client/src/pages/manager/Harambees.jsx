import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { formatKES, formatDate } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function Harambees() {
  const { showError } = useToast();
  const [harambees, setHarambees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    targetAmount: '',
    startDate: '',
    endDate: '',
  });
  const [creating, setCreating] = useState(false);

  // Contribution form (modal)
  const [selectedHarambee, setSelectedHarambee] = useState(null);
  const [contribForm, setContribForm] = useState({
    contributorName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    mpesaReceiptNo: '',
    bankName: '',
    chequeNumber: '',
    notes: '',
  });
  const [contributing, setContributing] = useState(false);
  const [contribSuccess, setContribSuccess] = useState(false);
  const contribTimeoutRef = useRef(null);

  // Manage modal state
  const [managingHarambee, setManagingHarambee] = useState(null);
  const [manageForm, setManageForm] = useState({
    title: '',
    description: '',
    targetAmount: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE',
  });
  const [managing, setManaging] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchHarambees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/harambees');
      setHarambees(res.data.harambees || []);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to fetch harambees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHarambees();
  }, [fetchHarambees]);

  const handleCreateChange = (e) => {
    setCreateForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(createForm.targetAmount);
    if (!createForm.targetAmount || isNaN(parsed) || parsed <= 0) {
      showError('Please enter a valid target amount greater than 0.');
      return;
    }
    if (createForm.endDate && createForm.startDate && new Date(createForm.endDate) <= new Date(createForm.startDate)) {
      showError('End date must be after start date.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/harambees', {
        title: createForm.title,
        description: createForm.description,
        targetAmount: parsed,
        startDate: createForm.startDate,
        endDate: createForm.endDate,
      });
      setShowCreateForm(false);
      setCreateForm({ title: '', description: '', targetAmount: '', startDate: '', endDate: '' });
      fetchHarambees();
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to create harambee');
    } finally {
      setCreating(false);
    }
  };

  const openContribution = (h) => {
    clearTimeout(contribTimeoutRef.current);
    setSelectedHarambee(h);
    setContribForm({
      contributorName: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      mpesaReceiptNo: '',
      bankName: '',
      chequeNumber: '',
      notes: '',
    });
    setContribSuccess(false);
  };

  const handleContribChange = (e) => {
    setContribForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleContribSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHarambee) return;
    const parsed = parseFloat(contribForm.amount);
    if (!contribForm.amount || isNaN(parsed) || parsed <= 0) {
      showError('Please enter a valid amount greater than 0.');
      return;
    }
    setContributing(true);
    try {
      await api.post(`/harambees/${selectedHarambee.id}/contributions`, {
        contributorName: contribForm.contributorName,
        amount: parsed,
        date: contribForm.date,
        paymentMethod: contribForm.paymentMethod === 'bank' ? 'BANK_TRANSFER' : contribForm.paymentMethod.toUpperCase(),
        mpesaReceiptNo: contribForm.mpesaReceiptNo || null,
        bankName: contribForm.bankName || null,
        chequeNumber: contribForm.chequeNumber || null,
        notes: contribForm.notes || null,
      });
      setContribSuccess(true);
      setContribForm({
        contributorName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        mpesaReceiptNo: '',
        bankName: '',
        chequeNumber: '',
        notes: '',
      });
      fetchHarambees();
      contribTimeoutRef.current = setTimeout(() => {
        setContribSuccess(false);
        setSelectedHarambee(null);
      }, 2000);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to record contribution');
    } finally {
      setContributing(false);
    }
  };

  const openManage = (h) => {
    setManagingHarambee(h);
    setManageForm({
      title: h.title,
      description: h.description || '',
      targetAmount: h.targetAmount,
      startDate: h.startDate ? h.startDate.split('T')[0] : '',
      endDate: h.endDate ? h.endDate.split('T')[0] : '',
      status: h.status || 'ACTIVE',
    });
  };

  const handleManageChange = (e) => {
    setManageForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleManageSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(manageForm.targetAmount);
    if (!manageForm.targetAmount || isNaN(parsed) || parsed <= 0) {
      showError('Please enter a valid target amount greater than 0.');
      return;
    }
    setManaging(true);
    try {
      await api.put(`/harambees/${managingHarambee.id}`, { ...manageForm, targetAmount: parsed });
      setManagingHarambee(null);
      fetchHarambees();
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to update harambee');
    } finally {
      setManaging(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/harambees/${confirmDeleteId}`);
      setConfirmDeleteId(null);
      fetchHarambees();
    } catch (err) {
      setConfirmDeleteId(null);
      showError(err?.response?.data?.message || 'Failed to delete harambee');
    }
  };

  const getDaysLeft = (endDate) => {
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 'Ended';
  };

  const getProgress = (h) => {
    const current = h.currentAmount || 0;
    const target = h.targetAmount || 1;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-headline-lg-mobile md:text-headline-lg text-primary">Harambees</h2>
          <p className="text-body-sm text-on-surface-variant">Fundraising contributions and community collections</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <span className="material-symbols-outlined">add</span>
          Create New Harambee
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
        </div>
      ) : (
        <div className="space-y-4">
          {harambees.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-on-surface-variant mb-3 block" style={{ fontSize: 48 }}>groups</span>
              <p className="text-body-lg text-on-surface-variant">No harambees yet. Create one to get started.</p>
            </div>
          )}
          {harambees.map((h) => {
            const progress = getProgress(h);
            const daysLeft = getDaysLeft(h.endDate);
            const contributorCount = h.contributionCount ?? 0;
            return (
              <Card key={h.id} hover className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-headline-md text-on-surface font-bold">{h.title}</h3>
                    <p className="text-body-sm text-on-surface-variant mt-1">{h.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="secondary" size="sm" onClick={() => openContribution(h)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                      Contribute
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openManage(h)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>settings</span>
                      Manage
                    </Button>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-label-sm text-secondary font-semibold">
                      {formatKES(h.currentAmount || 0)} of {formatKES(h.targetAmount || 0)} ({progress}%)
                    </span>
                    <span className="text-label-sm text-on-surface-variant">
                      {formatDate(h.startDate)} — {h.endDate ? formatDate(h.endDate) : 'Open-ended'}
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-secondary h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {daysLeft !== null && (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 text-label-sm rounded-full ${
                      daysLeft === 'Ended'
                        ? 'bg-surface-container text-on-surface-variant'
                        : 'bg-tertiary-fixed text-on-tertiary-fixed'
                    }`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>alarm</span>
                      {daysLeft === 'Ended' ? 'Ended' : `${daysLeft} days left`}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-fixed text-on-secondary-fixed text-label-sm rounded-full">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>groups</span>
                    {contributorCount} Contributors
                  </span>
                  {h.status && (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 text-label-sm rounded-full font-bold ${
                      h.status === 'ACTIVE' ? 'bg-[#E8F5E9] text-secondary' :
                      h.status === 'COMPLETED' ? 'bg-secondary-container text-on-secondary-container' :
                      h.status === 'CANCELLED' ? 'bg-error-container text-on-error-container' :
                      'bg-[#FFF8E1] text-[#F9A825]'
                    }`}>
                      {h.status === 'ACTIVE' ? 'Active' :
                       h.status === 'COMPLETED' ? 'Completed' :
                       h.status === 'CANCELLED' ? 'Cancelled' :
                       h.status.charAt(0).toUpperCase() + h.status.slice(1).toLowerCase()}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Harambee Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface-container-lowest rounded-xl p-8 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-headline-md text-primary font-bold">Create New Harambee</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Input label="Title" name="title" value={createForm.title} onChange={handleCreateChange} placeholder="e.g. Sanctuary Roof Repair" required />
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1.5">Description</label>
                <textarea
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateChange}
                  placeholder="Describe the purpose..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary resize-none"
                />
              </div>
              <Input label="Target Amount (KES)" name="targetAmount" type="number" value={createForm.targetAmount} onChange={handleCreateChange} placeholder="0.00" required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Start Date" name="startDate" type="date" value={createForm.startDate} onChange={handleCreateChange} required />
                <Input label="End Date" name="endDate" type="date" value={createForm.endDate} onChange={handleCreateChange} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                <Button type="submit" loading={creating} className="flex-1">Create Harambee</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution Modal */}
      {selectedHarambee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface-container-lowest rounded-xl p-8 w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-headline-md text-primary font-bold">Record Contribution</h3>
              <button onClick={() => { clearTimeout(contribTimeoutRef.current); setSelectedHarambee(null); }} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Harambee Preview */}
            <div className="bg-secondary-container/20 p-4 rounded-xl mb-6 border border-secondary/20">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-label-md text-primary font-bold">{selectedHarambee.title}</h4>
                <span className="text-label-sm bg-primary text-on-primary px-2 py-0.5 rounded-full">
                  Progress: {getProgress(selectedHarambee)}%
                </span>
              </div>
              <p className="text-body-sm text-on-surface mb-2">
                <span className="font-semibold">{formatKES(selectedHarambee.currentAmount || 0)}</span> of {formatKES(selectedHarambee.targetAmount || 0)}
              </p>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${getProgress(selectedHarambee)}%` }}
                />
              </div>
            </div>

            {contribSuccess ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-secondary text-5xl mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <p className="text-headline-md text-on-surface">Contribution Recorded!</p>
                <p className="text-body-sm text-on-surface-variant mt-1">Thank you for your generosity.</p>
              </div>
            ) : (
              <form onSubmit={handleContribSubmit} className="space-y-4">
                <Input label="Contributor Name" name="contributorName" value={contribForm.contributorName} onChange={handleContribChange} placeholder="Enter name or group" icon="person" required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Amount (KES)" name="amount" type="number" value={contribForm.amount} onChange={handleContribChange} placeholder="0.00" required />
                  <div className="space-y-3">
                    <label className="text-label-md text-on-surface-variant block">Payment Method</label>
                    <div className="flex p-1 bg-surface-container rounded-xl">
                      <button type="button" onClick={() => setContribForm((p) => ({ ...p, paymentMethod: 'cash' }))} className={`flex-1 py-2 rounded-lg font-bold text-label-sm transition-all ${contribForm.paymentMethod === 'cash' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}>
                        Cash
                      </button>
                      <button type="button" onClick={() => setContribForm((p) => ({ ...p, paymentMethod: 'mpesa' }))} className={`flex-1 py-2 rounded-lg font-bold text-label-sm transition-all ${contribForm.paymentMethod === 'mpesa' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}>
                        M-Pesa
                      </button>
                      <button type="button" onClick={() => setContribForm((p) => ({ ...p, paymentMethod: 'bank' }))} className={`flex-1 py-2 rounded-lg font-bold text-label-sm transition-all ${contribForm.paymentMethod === 'bank' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}>
                        Bank
                      </button>
                    </div>
                  </div>
                </div>
                <Input label="Contribution Date" name="date" type="date" value={contribForm.date} onChange={handleContribChange} required />
                {contribForm.paymentMethod === 'mpesa' && (
                  <Input label="M-Pesa Receipt" name="mpesaReceiptNo" value={contribForm.mpesaReceiptNo} onChange={handleContribChange} placeholder="Receipt number" />
                )}
                {contribForm.paymentMethod === 'bank' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Bank Name" name="bankName" value={contribForm.bankName} onChange={handleContribChange} placeholder="e.g. Equity Bank" />
                    <Input label="Cheque Number" name="chequeNumber" value={contribForm.chequeNumber} onChange={handleContribChange} placeholder="Cheque / ref no." />
                  </div>
                )}
                <div>
                  <label className="block text-label-md text-on-surface-variant mb-1.5">Notes</label>
                  <textarea name="notes" value={contribForm.notes} onChange={handleContribChange} placeholder="Optional details..." rows={2} className="w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setSelectedHarambee(null)}>Cancel</Button>
                  <Button type="submit" loading={contributing} className="flex-1">
                    <span className="material-symbols-outlined">save</span>
                    Record Contribution
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Manage Harambee Modal */}
      {managingHarambee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface-container-lowest rounded-xl p-8 w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-headline-md text-primary font-bold">Manage Harambee</h3>
              <button onClick={() => setManagingHarambee(null)} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleManageSubmit} className="space-y-4">
              <Input label="Title" name="title" value={manageForm.title} onChange={handleManageChange} required />
              <Input label="Target Amount (KES)" name="targetAmount" type="number" value={manageForm.targetAmount} onChange={handleManageChange} required />
              <Input label="Start Date" name="startDate" type="date" value={manageForm.startDate} onChange={handleManageChange} required />
              <Input label="End Date (Optional)" name="endDate" type="date" value={manageForm.endDate} onChange={handleManageChange} />
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1.5">Description</label>
                <textarea
                  name="description"
                  value={manageForm.description}
                  onChange={handleManageChange}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary resize-none"
                />
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1.5">Status</label>
                <select
                  name="status"
                  value={manageForm.status}
                  onChange={handleManageChange}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border rounded-lg text-body-lg text-on-surface outline-none transition-colors border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <hr className="border-outline-variant" />

              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteId(managingHarambee.id);
                  setManagingHarambee(null);
                }}
                className="w-full flex items-center justify-center gap-2 border border-error text-error rounded-lg px-4 py-2.5 hover:bg-error-container transition-colors text-body-lg font-bold"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                Delete Harambee
              </button>

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setManagingHarambee(null)}>Cancel</Button>
                <Button type="submit" loading={managing} className="flex-1">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete Harambee"
        message="Are you sure you want to permanently delete this harambee and all its contribution records? This action cannot be undone."
        confirmText="Delete"
        danger
        onConfirm={handleDelete}
        onClose={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
