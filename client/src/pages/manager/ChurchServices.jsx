import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday',
                      'Thursday','Friday','Saturday'];
const SERVICE_STATUSES = ['SCHEDULED','INCOMPLETE','COMPLETED'];

function ServiceCard({ service, onEdit, onToggleActive, onDelete }) {
  const statusColor = {
    SCHEDULED: 'bg-primary',
    INCOMPLETE: 'bg-tertiary',
    COMPLETED: 'bg-outline-variant',
  };

  const statusBadge = {
    SCHEDULED: 'bg-primary-container text-on-primary-container',
    INCOMPLETE: 'bg-tertiary-container text-on-tertiary-container',
    COMPLETED: 'bg-surface-container-high text-on-surface-variant',
  };

  const roles = [
    { key: 'speaker', icon: 'record_voice_over', label: 'SPEAKER' },
    { key: 'programmer', icon: 'assignment_ind', label: 'PROGRAMMER' },
    { key: 'leadMinistrant', icon: 'church', label: 'SPIRITUAL LEAD' },
    { key: 'reader', icon: 'menu_book', label: 'READER' },
  ];

  const hasAnyRole = roles.some((r) => service[r.key]);

  // Parse a service date string as LOCAL time to avoid UTC off-by-one issues.
  // Plain YYYY-MM-DD (10 chars) gets 'T00:00:00' appended so JS parses it as local.
  const parseServiceDate = (dateStr) => {
    if (!dateStr) return null;
    return dateStr.length === 10 ? new Date(dateStr + 'T00:00:00') : new Date(dateStr);
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden
      border border-outline-variant/50 hover:-translate-y-1 hover:shadow-md
      transition-all duration-300">

      {/* Top accent bar */}
      <div className={`h-1.5 ${statusColor[service.status] || 'bg-primary'} w-full`} />

      <div className="p-4 space-y-4">

        {/* Top row: date badge + status badge */}
        <div className="flex justify-between items-start">
          <div className="bg-surface-container-low px-3 py-2 rounded-lg flex flex-col
            items-center min-w-[60px] border border-outline-variant/30 text-center">
            {service.serviceDate ? (
              <>
                <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                  {parseServiceDate(service.serviceDate).toLocaleDateString('en-KE',{month:'short'}).toUpperCase()}
                </span>
                <span className="text-2xl font-black text-primary leading-none">
                  {parseServiceDate(service.serviceDate).getDate().toString().padStart(2,'0')}
                </span>
              </>
            ) : (
              <>
                <span className="text-label-sm font-bold text-on-surface-variant uppercase">
                  {service.dayOfWeek.slice(0,3).toUpperCase()}
                </span>
                <span className="text-label-md text-primary font-bold">{service.time}</span>
              </>
            )}
          </div>

          <span className={`px-3 py-1 rounded-full text-label-sm font-bold uppercase tracking-wider
            border border-outline-variant/20 ${statusBadge[service.status] || 'bg-surface-container-high text-on-surface-variant'}`}>
            {service.status}
          </span>
        </div>

        {/* Service name + topic */}
        <div className="mb-2">
          <h3 className="text-headline-md text-on-surface">{service.name}</h3>
          {service.topic && (
            <div className="flex items-center gap-1.5 text-on-surface-variant mt-1">
              <span className="material-symbols-outlined" style={{fontSize:14}}>auto_awesome</span>
              <p className="text-body-sm italic">&ldquo;{service.topic}&rdquo;</p>
            </div>
          )}
          {!service.topic && service.status === 'INCOMPLETE' && (
            <div className="flex items-center gap-1.5 text-on-surface-variant/40 mt-1">
              <span className="material-symbols-outlined" style={{fontSize:14}}>auto_awesome</span>
              <p className="text-body-sm italic">Topic: TBA</p>
            </div>
          )}
        </div>

        {/* Role grid */}
        {hasAnyRole && (
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t border-outline-variant/20 pt-4">
            {roles.map(({ key, icon, label }) => {
              const value = service[key];
              if (!value) {
                if (service.status === 'INCOMPLETE' && (key === 'speaker' || key === 'programmer')) {
                  return (
                    <div key={key} className="space-y-0.5">
                      <p className="text-label-sm text-on-surface-variant/60 uppercase tracking-widest font-bold">
                        {label}
                      </p>
                      <p className="text-body-sm italic text-on-surface-variant opacity-50">Not yet assigned</p>
                    </div>
                  );
                }
                return null;
              }
              return (
                <div key={key} className="space-y-0.5">
                  <p className="text-label-sm text-on-surface-variant/60 uppercase tracking-widest font-bold">
                    {label}
                  </p>
                  <p className="text-body-sm text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary" style={{fontSize:16}}>{icon}</span>
                    {value}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-outline-variant/20" />

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {service.status === 'INCOMPLETE' ? (
            <>
              <button
                onClick={() => onEdit(service)}
                className="flex-1 bg-primary text-on-primary px-4 py-2 rounded-lg text-label-md
                  font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                Assign Roles
              </button>
              <button
                onClick={() => onDelete(service)}
                className="text-error hover:bg-error-container/20 p-2 rounded-lg transition-colors"
                title="Delete"
              >
                <span className="material-symbols-outlined" style={{fontSize:20}}>cancel</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEdit(service)}
                className="flex-1 bg-surface-container-low px-4 py-2 rounded-lg text-label-md
                  font-medium text-on-surface flex items-center justify-center gap-2
                  hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined" style={{fontSize:18}}>edit</span>
                Edit
              </button>
              <button
                onClick={() => onToggleActive(service)}
                className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-lg transition-colors"
                title={service.isActive ? 'Deactivate' : 'Activate'}
              >
                <span className="material-symbols-outlined" style={{fontSize:20}}>toggle_off</span>
              </button>
              <button
                onClick={() => onDelete(service)}
                className="text-error hover:bg-error-container/20 p-2 rounded-lg transition-colors"
                title="Delete"
              >
                <span className="material-symbols-outlined" style={{fontSize:20}}>cancel</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChurchServices() {
  const { showError } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    name: '', dayOfWeek: 'Sunday', time: '09:00',
    serviceDate: '', topic: '', speaker: '', programmer: '',
    leadMinistrant: '', reader: '', notes: '',
    status: 'SCHEDULED', isActive: true,
  });

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/services');
      setServices(res.data.services || []);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingServices = services.filter(s => {
    if (s.isActive === false) return false;
    if (!s.serviceDate) return s.status !== 'COMPLETED';
    const d = new Date(s.serviceDate);
    return !isNaN(d.getTime()) && d >= today;
  }).sort((a, b) => {
    const da = a.serviceDate ? new Date(a.serviceDate) : new Date('9999-12-31');
    const db = b.serviceDate ? new Date(b.serviceDate) : new Date('9999-12-31');
    return da - db;
  });

  const pastServices = services.filter(s => {
    if (!s.serviceDate) return false;
    return new Date(s.serviceDate) < today;
  }).sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setForm({
      name: '', dayOfWeek: 'Sunday', time: '09:00',
      serviceDate: '', topic: '', speaker: '', programmer: '',
      leadMinistrant: '', reader: '', notes: '',
      status: 'SCHEDULED', isActive: true,
    });
    setEditingService(null);
    setShowForm(false);
  };

  const startEdit = (service) => {
    setEditingService(service);
    setForm({
      name: service.name || '',
      dayOfWeek: service.dayOfWeek || 'Sunday',
      time: service.time || '09:00',
      serviceDate: service.serviceDate
        ? new Date(service.serviceDate).toISOString().split('T')[0]
        : '',
      topic: service.topic || '',
      speaker: service.speaker || '',
      programmer: service.programmer || '',
      leadMinistrant: service.leadMinistrant || '',
      reader: service.reader || '',
      notes: service.notes || '',
      status: service.status || 'SCHEDULED',
      isActive: service.isActive ?? true,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showError('Service name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        dayOfWeek: form.dayOfWeek,
        time: form.time,
        serviceDate: form.serviceDate || null,
        topic: form.topic || null,
        speaker: form.speaker || null,
        programmer: form.programmer || null,
        leadMinistrant: form.leadMinistrant || null,
        reader: form.reader || null,
        notes: form.notes || null,
        status: form.status,
        isActive: Boolean(form.isActive),
      };

      if (editingService) {
        await api.put(`/services/${editingService.id}`, payload);
      } else {
        await api.post('/services', payload);
      }
      resetForm();
      fetchServices();
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (service) => {
    setDeleteTarget(service);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/services/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchServices();
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to delete service');
    }
  };

  const handleToggleActive = async (service) => {
    try {
      await api.put(`/services/${service.id}`, { isActive: !service.isActive });
      fetchServices();
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to update service');
    }
  };

  return (
    <div className="space-y-8">

      {/* ── HEADER ROW ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-primary">Church Services</h1>
          <p className="text-body-lg text-on-surface-variant">Schedule and manage weekly service programmes</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <span className="material-symbols-outlined">add_circle</span>
          Schedule New Service
        </Button>
      </div>

      {/* ── ERROR BANNER ── */}

      {/* ── LOADING STATE ── */}
      {loading && services.length === 0 && (
        <div className="flex justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
        </div>
      )}

      {/* ── SERVICE FORM MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-on-background/40 backdrop-blur-sm"
            onClick={resetForm}
          />

          {/* Modal container */}
          <div
            className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-[0px_24px_48px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-outline-variant/20"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}
            <header className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-container/10 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                    event_available
                  </span>
                </div>
                <h2 className="text-headline-md text-on-surface">
                  {editingService ? 'Edit Service' : 'Schedule New Service'}
                </h2>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-2 hover:bg-surface-container-low rounded-full transition-colors group"
              >
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-error">close</span>
              </button>
            </header>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-outline-variant [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">

              <form id="service-form" onSubmit={handleSubmit} className="space-y-6">

                {/* ══ SECTION 01: BASIC DETAILS ══ */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest whitespace-nowrap">01. Basic Details</span>
                    <div className="h-px flex-1 bg-outline-variant/30" />
                  </div>

                  {/* Row 1: Service Name + Topic */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-label-sm text-on-surface-variant">Service Name *</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Sunday Worship Service"
                        className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2.5 text-body-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-label-sm text-on-surface-variant">Topic / Theme</label>
                      <input
                        name="topic"
                        value={form.topic}
                        onChange={handleChange}
                        placeholder="e.g. The Power of Stewardship"
                        className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2.5 text-body-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Row 2: Date + Time + Day of Week */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-label-sm text-on-surface-variant">Date</label>
                      <input
                        type="date"
                        name="serviceDate"
                        value={form.serviceDate}
                        onChange={handleChange}
                        className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2.5 text-body-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-label-sm text-on-surface-variant">Time *</label>
                      <input
                        type="time"
                        name="time"
                        value={form.time}
                        onChange={handleChange}
                        required
                        className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2.5 text-body-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-label-sm text-on-surface-variant">Day of Week *</label>
                      <div className="relative">
                        <select
                          name="dayOfWeek"
                          value={form.dayOfWeek}
                          onChange={handleChange}
                          className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2.5 text-body-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                        >
                          {DAYS_OF_WEEK.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style={{ fontSize: 20 }}>expand_more</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ══ SECTION 02: MINISTRY ASSIGNMENTS ══ */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest whitespace-nowrap">02. Ministry Assignments</span>
                    <div className="h-px flex-1 bg-outline-variant/30" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {/* Speaker */}
                    <div className="flex items-center gap-3 p-3 bg-surface border border-outline-variant/40 rounded-xl hover:border-primary/50 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>record_voice_over</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter mb-0.5">Speaker</label>
                        <input
                          name="speaker"
                          value={form.speaker}
                          onChange={handleChange}
                          placeholder="e.g. Pastor James Kariuki"
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-label-md text-on-surface placeholder:text-on-surface-variant/40 outline-none"
                        />
                      </div>
                    </div>

                    {/* Programmer / MC */}
                    <div className="flex items-center gap-3 p-3 bg-surface border border-outline-variant/40 rounded-xl hover:border-primary/50 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>list_alt</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter mb-0.5">Programmer / MC</label>
                        <input
                          name="programmer"
                          value={form.programmer}
                          onChange={handleChange}
                          placeholder="e.g. Mercy Njeri"
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-label-md text-on-surface placeholder:text-on-surface-variant/40 outline-none"
                        />
                      </div>
                    </div>

                    {/* Spiritual Lead */}
                    <div className="flex items-center gap-3 p-3 bg-surface border border-outline-variant/40 rounded-xl hover:border-primary/50 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>auto_awesome</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter mb-0.5">Spiritual Lead</label>
                        <input
                          name="leadMinistrant"
                          value={form.leadMinistrant}
                          onChange={handleChange}
                          placeholder="e.g. Elder Peter Kingorá"
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-label-md text-on-surface placeholder:text-on-surface-variant/40 outline-none"
                        />
                      </div>
                    </div>

                    {/* Reader */}
                    <div className="flex items-center gap-3 p-3 bg-surface border border-outline-variant/40 rounded-xl hover:border-primary/50 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>menu_book</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter mb-0.5">Reader</label>
                        <input
                          name="reader"
                          value={form.reader}
                          onChange={handleChange}
                          placeholder="e.g. Alice Wangui"
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-label-md text-on-surface placeholder:text-on-surface-variant/40 outline-none"
                        />
                      </div>
                    </div>

                  </div>
                </section>

                {/* ══ SECTION 03: ADDITIONAL INFO ══ */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest whitespace-nowrap">03. Additional Info</span>
                    <div className="h-px flex-1 bg-outline-variant/30" />
                  </div>

                  {/* Status + Active toggle */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                    <div className="flex-1 space-y-1">
                      <label className="text-label-sm text-on-surface-variant">Status</label>
                      <div className="relative">
                        <select
                          name="status"
                          value={form.status}
                          onChange={handleChange}
                          className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2.5 text-body-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                        >
                          {SERVICE_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style={{ fontSize: 20 }}>expand_more</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pb-1">
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({...p, isActive: !p.isActive}))}
                        className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${form.isActive ? 'bg-primary' : 'bg-surface-container-high'}`}
                      >
                        <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="text-label-md text-on-surface">Active</span>
                    </div>
                  </div>

                  {/* Notes / Liturgical notes */}
                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant">Description / Liturgical Notes</label>
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Enter special instructions or service flow details..."
                      className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2.5 text-body-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                    />
                  </div>
                </section>

              </form>
            </div>

            {/* STICKY FOOTER */}
            <footer className="px-6 py-5 bg-surface-container-low/50 border-t border-outline-variant/50 flex items-center justify-end gap-4 shrink-0">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 rounded-lg border border-outline text-on-surface text-label-md font-label-md hover:bg-white hover:shadow-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="service-form"
                disabled={saving}
                className="px-8 py-2.5 rounded-lg bg-primary text-on-primary text-label-md font-label-md shadow-md hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>sync</span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                )}
                {editingService ? 'Update Service' : 'Schedule Service'}
              </button>
            </footer>

          </div>
        </div>
      )}

      {/* ── UPCOMING SERVICES SECTION ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-headline-md text-on-surface">Upcoming Services</h2>
          <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-sm">
            {upcomingServices.length}
          </span>
        </div>

        {upcomingServices.length === 0 && !loading && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-on-surface-variant block" style={{ fontSize: 48 }}>event_note</span>
            <p className="text-body-lg text-on-surface-variant mt-3">No upcoming services scheduled.</p>
            <p className="text-body-sm text-on-surface-variant/60 mt-1">Click &lsquo;Schedule New Service&rsquo; to add one.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {upcomingServices.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              onEdit={startEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </section>

      {/* ── PAST SERVICES SECTION ── */}
      <details className="group bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-hidden">
        <summary className="list-none cursor-pointer hover:bg-surface-container transition-colors p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
            <h2 className="text-headline-md text-on-surface">Past Services</h2>
            <span className="bg-white border border-outline-variant/20 px-3 py-1 rounded-full text-label-sm text-on-surface-variant">
              {pastServices.length}
            </span>
          </div>
          <span className="text-primary text-label-md">View All</span>
        </summary>

        <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/20">
          {pastServices.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant text-center py-4">No past services yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-label-sm text-on-surface-variant/60 uppercase tracking-wider border-b border-outline-variant/20">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Service Name</th>
                    <th className="pb-3 pr-4">Speaker</th>
                    <th className="pb-3 pr-4">Topic</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {pastServices.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3 pr-4 text-body-sm text-on-surface whitespace-nowrap">
                        {s.serviceDate
                          ? (s.serviceDate?.length === 10
                              ? new Date(s.serviceDate + 'T00:00:00')
                              : new Date(s.serviceDate)
                            ).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="py-3 pr-4 text-body-sm text-on-surface">{s.name}</td>
                      <td className="py-3 pr-4 text-body-sm text-on-surface">{s.speaker || '—'}</td>
                      <td className="py-3 pr-4 text-body-sm text-on-surface italic">{s.topic || '—'}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(s)}
                            className="text-primary hover:bg-primary-container/20 p-1.5 rounded-lg transition-colors"
                            title="View / Edit"
                          >
                            <span className="material-symbols-outlined" style={{fontSize:18}}>visibility</span>
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="text-error hover:bg-error-container/20 p-1.5 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined" style={{fontSize:18}}>delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>

      {/* ── CONFIRM DIALOG ── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Service"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        danger={true}
      />
    </div>
  );
}