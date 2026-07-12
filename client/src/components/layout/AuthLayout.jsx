import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#E8F5E9' }}>
      <div className="w-full max-w-md mx-4">
        <Outlet />
      </div>
    </div>
  );
}