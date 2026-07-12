import { useState, useEffect } from 'react';
import ServicesOverlay from '../ui/ServicesOverlay';

export default function TopBar({ title, subtitle, onHealthClick, onMenuClick, sidebarCollapsed }) {
  const handleHealthClick = typeof onHealthClick === 'function' ? onHealthClick : () => {};

  // ── Dark mode toggle ──
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };
  
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else if (saved === 'light') {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);
  
  // ── Services overlay ──
  const [servicesOpen, setServicesOpen] = useState(false);

  // Compute left offset based on collapsed state (falls back gracefully if prop absent)
  const leftOffset = sidebarCollapsed ? 'md:left-16' : 'md:left-60';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 h-touch-target-min bg-surface border-b border-outline-variant shadow-sm flex items-center justify-between px-4 md:px-edge-padding-desktop z-20 transition-all duration-200 ease-in-out ${leftOffset}`}
      >
        {/* Left: hamburger (mobile only) + breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors shrink-0"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>menu</span>
            </button>
          )}
          <span className="text-label-sm text-on-surface-variant hidden sm:inline">Portal</span>
          <span className="material-symbols-outlined text-on-surface-variant hidden sm:inline" style={{ fontSize: 16 }}>
            chevron_right
          </span>
          <span className="text-body-sm text-on-surface font-medium truncate">
            {title || 'Dashboard'}
          </span>
          {subtitle && (
            <>
              <span className="material-symbols-outlined text-on-surface-variant hidden sm:inline" style={{ fontSize: 16 }}>
                chevron_right
              </span>
              <span className="text-body-sm text-on-surface-variant truncate hidden sm:inline">{subtitle}</span>
            </>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          {/*
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
	   /*}
          {/* Services / notification bell */}
          <button
            type="button"
            onClick={() => setServicesOpen(true)}
            className="relative p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
            aria-label="View church services"
            title="Church Services"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
          </button>

          {/* Financial health (admin/manager only — kept from original) */}
          {typeof onHealthClick === 'function' && (
            <button
              type="button"
              onClick={handleHealthClick}
              className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors hidden md:flex items-center"
              aria-label="Financial Health"
              title="Financial Health"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>monitoring</span>
            </button>
          )}
        </div>
      </header>

      {/* Services overlay — rendered outside header to avoid z-index nesting */}
      <ServicesOverlay isOpen={servicesOpen} onClose={() => setServicesOpen(false)} />
    </>
  );
}
