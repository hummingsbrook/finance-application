import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = {
  MANAGER: [
    { label: 'Overview', icon: 'dashboard', path: '/manager/overview' },
    { label: 'Tithes', icon: 'payments', path: '/manager/tithes' },
    { label: 'Offerings', icon: 'volunteer_activism', path: '/manager/offerings' },
    { label: 'Harambees', icon: 'groups', path: '/manager/harambees' },
    { label: 'Events', icon: 'event', path: '/manager/events' },
    { label: 'Expenses', icon: 'account_balance_wallet', path: '/manager/expenses' },
    { label: 'Reports', icon: 'analytics', path: '/manager/reports' },
    { label: 'Services', icon: 'church', path: '/manager/services' },
  ],
  SUPER_ADMIN: [
    { label: 'Dashboard', icon: 'dashboard', path: '/admin/dashboard' },
    { label: 'Users', icon: 'people', path: '/admin/users' },
    { label: 'Login History', icon: 'manage_accounts', path: '/admin/login-history' },
    { label: 'Audit Logs', icon: 'fact_check', path: '/admin/audit-logs' },
    { label: 'Database', icon: 'storage', path: '/admin/database' },
    { label: 'Expense Oversight', icon: 'receipt_long', path: '/admin/expense-oversight' },
  ],
};

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const role = user?.role || 'MANAGER';
  const items = NAV_ITEMS[role] || [];

  const handleSignOut = () => {
    signOut();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Brand ── */}
      <div className={`flex items-center pb-4 pt-4 px-4 transition-all duration-200 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-primary-container" style={{ fontSize: 22 }}>church</span>
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1 className="font-label-md font-bold text-primary leading-tight truncate">ChurchFinance Pro</h1>
            <p className="text-label-sm text-on-surface-variant truncate">Stewardship Portal</p>
          </div>
        )}
      </div>

      {/* ── Collapse toggle (desktop only) ── */}
      <div className={`hidden md:flex px-2 pb-3 ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span
            className="material-symbols-outlined transition-transform duration-200"
            style={{ fontSize: 20 }}
          >
            {isCollapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {items.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/');
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center rounded-lg text-label-md transition-all ${
                isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined shrink-0" style={{ fontSize: 22 }}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* ── User section ── */}
      <div className="border-t border-outline-variant pt-3 px-2">
        <div className={`flex items-center px-3 py-2 mb-1 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div
            className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-label-sm shrink-0"
            title={isCollapsed ? `${user?.firstName} ${user?.lastName}` : undefined}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-label-md font-semibold text-on-surface truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-on-surface-variant truncate">{role.replace('_', ' ')}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className={`flex items-center w-full rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all ${
            isCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2 text-left'
          }`}
          aria-label="Sign out"
          title={isCollapsed ? 'Sign out' : undefined}
        >
          <span className="material-symbols-outlined text-error shrink-0" style={{ fontSize: 20 }}>logout</span>
          {!isCollapsed && <span className="text-label-md">Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      )}

      {/* Sidebar — drawer on mobile, collapsible rail on desktop */}
      <aside
        className={`fixed top-0 left-0 h-full bg-surface-container-lowest border-r border-outline-variant z-50 flex flex-col transition-all duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          ${isCollapsed ? 'md:w-16' : 'md:w-60'}
          w-72`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
