import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../../context/AuthContext';

const ROUTE_TITLES = {
  '/partner/dashboard': 'My Dashboard',
  '/partner/give': 'Make a Payment',
  '/partner/payment-status': 'Payment Status',
  '/partner/settings': 'Settings',
  '/manager/overview': 'Overview',
  '/manager/tithes': 'Tithes',
  '/manager/offerings': 'Offerings',
  '/manager/harambees': 'Harambees',
  '/manager/expenses': 'Expenses',
  '/manager/services': 'Church Services',
  '/manager/messages': 'Messages',
  '/manager/reports': 'Reports',
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/users': 'User Management',
  '/admin/login-history': 'Login History',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/database': 'Database Management',
  '/admin/expense-oversight': 'Expense Oversight',
};

function getRouteTitle(pathname) {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  // Then try prefix match (for routes with params like /partner/payment-status/xxx)
  const match = Object.entries(ROUTE_TITLES).find(([path]) => pathname.startsWith(path));
  return match ? match[1] : 'Dashboard';
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHealthOverlay, setShowHealthOverlay] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const showHealthBtn = (user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN') &&
    location.pathname.startsWith('/manager');
  const title = getRouteTitle(location.pathname);

  const outletContext = {
    showHealthOverlay,
    onOpenHealth: () => setShowHealthOverlay(true),
    onCloseHealth: () => setShowHealthOverlay(false),
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />
      <TopBar
        title={title}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onHealthClick={showHealthBtn ? () => setShowHealthOverlay(true) : undefined}
        sidebarCollapsed={sidebarCollapsed}
      />
      <main id="main-scroll" className={`pt-touch-target-min min-h-screen overflow-y-auto custom-scrollbar transition-all duration-200 ease-in-out ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'}`}>
        <div className="p-4 md:p-edge-padding-desktop space-y-stack-lg max-w-[1400px] mx-auto">
          <Outlet context={outletContext} />
        </div>
      </main>
    </div>
  );
}
