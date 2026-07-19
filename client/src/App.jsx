import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './components/layout/AuthLayout';
import DashboardLayout from './components/layout/DashboardLayout';

// Auth pages
import SignIn from './pages/auth/SignIn';
import ResetPassword from './pages/auth/ResetPassword';
import ForgotPassword from './pages/auth/ForgotPassword';

import ManagerDashboard from './pages/manager/ManagerDashboard';
import Tithes from './pages/manager/Tithes';
import Offerings from './pages/manager/Offerings';
import Harambees from './pages/manager/Harambees';
import Expenses from './pages/manager/Expenses';
import Events from './pages/manager/Events';
import ChurchServices from './pages/manager/ChurchServices';
import Reports from './pages/manager/Reports';

import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AuditLogs from './pages/admin/AuditLogs';
import LoginHistory from './pages/admin/LoginHistory';
import DatabaseManagement from './pages/admin/DatabaseManagement';
import ExpenseOversight from './pages/admin/ExpenseOversight';

import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Routes>
        {/* Public auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* Manager routes — MANAGER and SUPER_ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'SUPER_ADMIN']}><DashboardLayout /></ProtectedRoute>}>
          <Route path="/manager" element={<Navigate to="/manager/overview" />} />
          <Route path="/manager/overview" element={<ManagerDashboard />} />
          <Route path="/manager/tithes" element={<Tithes />} />
          <Route path="/manager/offerings" element={<Offerings />} />
          <Route path="/manager/harambees" element={<Harambees />} />
          <Route path="/manager/expenses" element={<Expenses />} />
          <Route path="/manager/events" element={<Events />} />
          <Route path="/manager/services" element={<ChurchServices />} />
          <Route path="/manager/reports" element={<Reports />} />
        </Route>

        {/* Admin routes — SUPER_ADMIN only */}
        <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><DashboardLayout /></ProtectedRoute>}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/login-history" element={<LoginHistory />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/database" element={<DatabaseManagement />} />
          <Route path="/admin/expense-oversight" element={<ExpenseOversight />} />
        </Route>

        {/* Catch-all */}
        <Route path="/" element={<Navigate to="/signin" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}