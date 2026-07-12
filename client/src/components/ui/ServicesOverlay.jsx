import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ServiceCard({ service }) {
  const hasDate = Boolean(service.serviceDate);
  const dateObj = hasDate ? new Date(service.serviceDate) : null;
  const isPast = dateObj ? dateObj < new Date() : false;
  const statusColor = {
    SCHEDULED: 'bg-primary-container text-on-primary-container',
    COMPLETED: 'bg-secondary-container text-on-secondary-container',
    INCOMPLETE: 'bg-error-container text-on-error-container',
    CANCELLED: 'bg-surface-container text-on-surface-variant',
  }[service.status] || 'bg-surface-container text-on-surface-variant';

  return (
    <div className={`bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 card-shadow flex flex-col gap-2 ${isPast ? 'opacity-75' : ''}`}>
      {/* Date badge + status */}
      <div className="flex items-start justify-between gap-2">
        {dateObj ? (
          <div className="flex flex-col items-center bg-primary-container text-on-primary-container rounded-lg px-2.5 py-1.5 text-center min-w-[44px] shrink-0">
            <span className="text-[10px] font-bold uppercase leading-none">
              {MONTH_NAMES[dateObj.getMonth()].slice(0, 3)}
            </span>
            <span className="text-headline-md font-bold leading-none">
              {dateObj.getDate().toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] text-on-primary-container/70 leading-none">
              {service.dayOfWeek?.slice(0, 3)}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center bg-surface-container text-on-surface-variant rounded-lg px-2.5 py-1.5 text-center min-w-[44px] shrink-0">
            <span className="text-[10px] font-bold uppercase leading-none">TBD</span>
          </div>
        )}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${statusColor}`}>
          {service.status}
        </span>
      </div>

      {/* Name + time */}
      <div>
        <p className="text-label-md font-semibold text-on-surface leading-tight">{service.name}</p>
        {service.time && (
          <p className="text-body-sm text-on-surface-variant">{service.time}</p>
        )}
      </div>

      {/* Topic */}
      {service.topic && (
        <p className="text-body-sm text-on-surface-variant/80 italic truncate">{service.topic}</p>
      )}

      {/* Speaker */}
      {service.speaker && (
        <div className="flex items-center gap-1.5 text-label-sm text-on-surface-variant mt-auto pt-1 border-t border-outline-variant/20">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
          <span className="truncate">{service.speaker}</span>
        </div>
      )}
    </div>
  );
}

export default function ServicesOverlay({ isOpen, onClose }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Month slider: index into a generated list of months centred on today
  const today = new Date();
  const currentMonthIndex = 6; // always position today at index 6 of a 13-month window
  const [monthOffset, setMonthOffset] = useState(0); // -6 to +6

  const viewYear = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1).getFullYear();
  const viewMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1).getMonth(); // 0-indexed

  const fetchServices = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/services', { params: { limit: 100 } });
      setServices(res.data?.services || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Filter services by the currently viewed month/year
  const visibleServices = services.filter((s) => {
    if (!s.serviceDate) return false;
    const d = new Date(s.serviceDate);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).sort((a, b) => new Date(a.serviceDate) - new Date(b.serviceDate));

  // Upcoming (today or future) and past for this month
  const upcomingServices = visibleServices.filter((s) => new Date(s.serviceDate) >= new Date(today.toDateString()));
  const pastServices = visibleServices.filter((s) => new Date(s.serviceDate) < new Date(today.toDateString()));

  const isCurrentMonth = monthOffset === 0;
  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-surface z-50 flex flex-col shadow-2xl border-l border-outline-variant overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Church Services"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container" style={{ fontSize: 20 }}>church</span>
            </div>
            <div>
              <h2 className="text-title-lg font-bold text-on-surface">Church Services</h2>
              <p className="text-body-sm text-on-surface-variant">Upcoming & past services</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Close services panel"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        {/* Month slider */}
        <div className="flex items-center justify-between px-6 py-3 bg-surface-container-low border-b border-outline-variant shrink-0">
          <button
            type="button"
            onClick={() => setMonthOffset((o) => Math.max(o - 1, -6))}
            disabled={monthOffset <= -6}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span>
          </button>

          <div className="flex flex-col items-center">
            <span className="text-label-lg font-bold text-on-surface">{monthLabel}</span>
            {isCurrentMonth && (
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Current</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMonthOffset((o) => Math.min(o + 1, 6))}
            disabled={monthOffset >= 6}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next month"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="material-symbols-outlined text-on-surface-variant animate-spin" style={{ fontSize: 36 }}>progress_activity</span>
              <p className="text-body-sm text-on-surface-variant">Loading services…</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-error-container text-on-error-container rounded-xl p-4 flex items-center gap-3">
              <span className="material-symbols-outlined shrink-0" style={{ fontSize: 20 }}>error</span>
              <p className="text-body-sm">{error}</p>
            </div>
          )}

          {!loading && !error && visibleServices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: 48 }}>event_busy</span>
              <p className="text-body-md text-on-surface-variant">No services in {monthLabel}</p>
            </div>
          )}

          {!loading && !error && upcomingServices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>upcoming</span>
                <h3 className="text-label-lg font-bold text-on-surface uppercase tracking-wide">
                  {isCurrentMonth ? 'Upcoming' : 'Scheduled'}
                </h3>
                <span className="text-label-sm text-on-surface-variant">({upcomingServices.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcomingServices.map((s) => (
                  <ServiceCard key={s.id} service={s} />
                ))}
              </div>
            </div>
          )}

          {!loading && !error && pastServices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>history</span>
                <h3 className="text-label-lg font-bold text-on-surface-variant uppercase tracking-wide">Past</h3>
                <span className="text-label-sm text-on-surface-variant">({pastServices.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pastServices.map((s) => (
                  <ServiceCard key={s.id} service={s} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
