import { useState, useEffect, useCallback, Fragment } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getInitials, formatDateTime } from '../../lib/utils';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import TableHeader from '../../components/ui/TableHeader';

const PAGE_SIZE = 10;

const ROLE_STYLES = {
  SUPER_ADMIN: { bg: 'bg-[#FFF8E1] text-[#7B3F00] border border-[#FFD54F]', label: 'Super Admin' },
  MANAGER: { bg: 'bg-primary/10 text-primary', label: 'Manager' },
};

const STATUS_STYLES = {
  ACTIVE: { bg: 'bg-secondary-container/30 text-secondary border border-secondary/20', dot: 'bg-secondary', label: 'Active' },
  INACTIVE: { bg: 'bg-surface-variant text-on-surface-variant border border-outline-variant/50', dot: 'bg-outline', label: 'Inactive' },
};

export default function UserManagement() {
  const { showError } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bulkAction, setBulkAction] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const showingFrom = total > 0 ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min(safePage * PAGE_SIZE, total);

  const fetchUsers = useCallback(async () => {
    const computedTotalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, computedTotalPages);
    setLoading(true);
    try {
      const res = await api.get('/users', {
        params: { search, role: roleFilter, status: statusFilter, page: safePage, limit: PAGE_SIZE },
      });
      const data = res.data;
      const usersList = data.users || (Array.isArray(data) ? data : []);
      setUsers(usersList);
      setTotal(data.total || usersList.length);
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  };

  const handleDeactivateSelected = async () => {
    setBulkAction(true);
    try {
      await api.post('/users/bulk-deactivate', { ids: Array.from(selected) });
      setSelected(new Set());
      setConfirmDeactivate(null);
      fetchUsers();
    } catch (err) {
      showError(err?.response?.data?.message || 'Action failed.');
      setConfirmDeactivate(null);
    } finally {
      setBulkAction(false);
    }
  };

  const handleExpand = (user) => {
    if (expandedId === user.id) {
      setExpandedId(null);
      setEditForm(null);
    } else {
      setExpandedId(user.id);
      setEditForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'MANAGER',
      });
    }
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async (userId) => {
    if (!editForm.firstName?.trim()) { showError('First name cannot be empty.'); return; }
    if (!editForm.lastName?.trim()) { showError('Last name cannot be empty.'); return; }
    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      showError('Invalid email address.'); return;
    }
    setSaving(true);
    try {
      await api.put(`/users/${userId}`, editForm);
      setExpandedId(null);
      setEditForm(null);
      fetchUsers();
    } catch (err) {
      showError(err?.response?.data?.message || 'Action failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateUser = async (userId) => {
    try {
      await api.put(`/users/${userId}`, { isActive: false });
      setExpandedId(null);
      setEditForm(null);
      setConfirmDeactivate(null);
      fetchUsers();
    } catch (err) {
      showError(err?.response?.data?.message || 'Action failed.');
      setConfirmDeactivate(null);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Error Banner */}

      <ConfirmDialog
        isOpen={!!confirmDeactivate}
        title="Confirm Deactivation"
        message={`Deactivate ${confirmDeactivate?.ids?.length || 1} account(s)? This will prevent them from logging in.`}
        confirmText={bulkAction ? 'Deactivating...' : 'Deactivate'}
        danger
        onConfirm={() => {
          if (confirmDeactivate?.single) {
            handleDeactivateUser(confirmDeactivate.ids[0]);
          } else {
            handleDeactivateSelected();
          }
        }}
        onClose={() => setConfirmDeactivate(null)}
      />

      {/* Page Header */}
      <div className="mb-2">
        <h2 className="text-headline-lg text-on-surface mb-2">User Management</h2>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Manage accounts, assign roles, and review access permissions across the portal.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-outline-variant overflow-x-auto">
        <button
          className="px-6 py-3 text-label-md text-primary border-b-2 border-primary whitespace-nowrap flex items-center gap-2 relative bg-surface-container-low/50 rounded-t-lg transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px] filled">group</span>
          All Users
          <span className="ml-2 bg-primary-container text-on-primary text-[10px] py-0.5 px-2 rounded-full font-bold">
            {total}
          </span>
        </button>
        <button
          onClick={() => navigate('/admin/login-history')}
          className="px-6 py-3 text-label-md text-on-surface-variant border-b-2 border-transparent hover:border-outline hover:text-on-surface whitespace-nowrap flex items-center gap-2 transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">history</span>
          Login History
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-6 border-b border-outline-variant/20 bg-surface-bright flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              person_search
            </span>
            <input
              className="w-full pl-10 pr-4 py-2 border border-outline-variant/50 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200 rounded-xl"
              placeholder="Search by name or email..."
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-outline-variant/50 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all rounded-full"
            >
              <option value="">All Roles</option>
              <option value="MANAGER">Manager</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-outline-variant/50 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all rounded-full"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            {selected.size > 0 && (
              <button
                onClick={() => setConfirmDeactivate({ ids: Array.from(selected), single: false })}
                disabled={bulkAction}
                className="flex items-center gap-2 px-4 py-2 bg-error/10 text-error font-label-md rounded-full hover:bg-error/20 transition-colors active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">block</span>
                Deactivate ({selected.size})
              </button>
            )}
            {selected.size > 0 && selected.size === users.length && total > users.length && (
              <span className="text-label-sm text-on-surface-variant">
                {selected.size} on this page.{' '}
                <button
                  className="text-primary underline"
                  onClick={async () => {
                    const res = await api.get('/users', { params: { limit: total } });
                    const allIds = (res.data?.users || []).map(u => u.id);
                    setSelected(new Set(allIds));
                  }}
                >
                  Select all {total}
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
                <th className="py-4 px-6 w-10">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selected.size === users.length}
                    onChange={toggleSelectAll}
                    className="rounded border-outline-variant"
                  />
                </th>
                <th className="py-4 px-6 font-semibold whitespace-nowrap">Name</th>
                <th className="py-4 px-6 font-semibold whitespace-nowrap">Email</th>
                <th className="py-4 px-6 font-semibold whitespace-nowrap">Role</th>
                <th className="py-4 px-6 font-semibold whitespace-nowrap">Status</th>
                <th className="py-4 px-6 font-semibold whitespace-nowrap">Last Login</th>
                <th className="py-4 px-6 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="text-body-sm text-on-surface divide-y divide-outline-variant/10">
              {users.length > 0 ? (
                users.map((user) => {
                  const isActive = user.isActive !== false;
                  const isExpanded = expandedId === user.id;
                  const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.MANAGER;
                  const statusStyle = isActive ? STATUS_STYLES.ACTIVE : STATUS_STYLES.INACTIVE;
                  const initials = getInitials(user.firstName, user.lastName);

                  return (
                    <Fragment key={user.id}>
                      <tr
                        className={`hover:bg-surface-container-low/30 transition-colors group ${
                          isExpanded ? 'bg-surface-container-low/20 border-l-4 border-primary' : ''
                        }`}
                      >
                        <td className="py-4 px-6">
                          <input
                            type="checkbox"
                            checked={selected.has(user.id)}
                            onChange={() => toggleSelect(user.id)}
                            className="rounded border-outline-variant"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3 whitespace-nowrap">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isExpanded
                                  ? 'bg-primary/10 text-primary'
                                  : isActive
                                  ? 'bg-secondary-container text-on-secondary-container'
                                  : 'bg-surface-variant text-on-surface-variant'
                              }`}
                            >
                              {initials}
                            </div>
                            <span className={`font-medium ${isExpanded ? 'text-primary' : ''}`}>
                              {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-on-surface-variant whitespace-nowrap">{user.email || '-'}</td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleStyle.bg}`}>
                            {roleStyle.label}
                          </span>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${statusStyle.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {statusStyle.label}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-on-surface-variant whitespace-nowrap tabular-nums">
                          {timeAgo(user.lastLogin || user.lastLoginAt)}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleExpand(user)}
                            className={`p-1 transition-colors rounded-full active:scale-90 ${
                              isExpanded
                                ? 'text-primary bg-primary/10'
                                : 'text-on-surface-variant hover:text-primary opacity-0 group-hover:opacity-100 focus:opacity-100'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {isExpanded ? 'expand_less' : 'edit'}
                            </span>
                          </button>
                        </td>
                      </tr>
                      {/* Expanded Edit Panel */}
                      {isExpanded && editForm && (
                        <tr className="bg-surface-container-low/50">
                          <td className="p-0" colSpan={7}>
                            <div className="p-8 border-x border-b border-primary/10 m-2 mt-0 bg-surface-container-lowest shadow-sm rounded-2xl">
                              <h4 className="text-title-lg text-primary mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[24px]">edit_square</span>
                                Edit User: {`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-label-sm text-on-surface-variant">First Name</label>
                                  <input
                                    className="w-full px-3 py-2 border border-outline-variant/50 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all rounded-xl"
                                    type="text"
                                    value={editForm.firstName}
                                    onChange={(e) => handleEditChange('firstName', e.target.value)}
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-label-sm text-on-surface-variant">Last Name</label>
                                  <input
                                    className="w-full px-3 py-2 border border-outline-variant/50 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all rounded-xl"
                                    type="text"
                                    value={editForm.lastName}
                                    onChange={(e) => handleEditChange('lastName', e.target.value)}
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-label-sm text-on-surface-variant">Email Address</label>
                                  <input
                                    className="w-full px-3 py-2 border border-outline-variant/50 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all rounded-xl"
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => handleEditChange('email', e.target.value)}
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-label-sm text-on-surface-variant">Phone (Optional)</label>
                                  <input
                                    className="w-full px-3 py-2 border border-outline-variant/50 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all rounded-xl"
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={(e) => handleEditChange('phone', e.target.value)}
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-4">
                                  <label className="text-label-sm text-on-surface-variant">Role</label>
                                  <div className="relative">
                                    <select
                                      value={editForm.role}
                                      onChange={(e) => handleEditChange('role', e.target.value)}
                                      className="w-full max-w-xs px-3 py-2 border border-outline-variant/50 bg-surface text-body-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all appearance-none rounded-xl pr-10"
                                    >
                                      <option value="MANAGER">Manager</option>
                                      <option value="SUPER_ADMIN">Super Admin</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-on-surface-variant">
                                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between border-t border-outline-variant/20 pt-6 mt-4">
                                <button
                                  onClick={() => setConfirmDeactivate({ ids: [user.id], single: true })}
                                  className="px-4 py-2 text-error hover:bg-error-container hover:text-on-error-container text-label-md transition-colors flex items-center gap-2 rounded-full active:scale-95"
                                >
                                  <span className="material-symbols-outlined text-[18px]">block</span>
                                  Deactivate Account
                                </button>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => {
                                      setExpandedId(null);
                                      setEditForm(null);
                                    }}
                                    className="px-6 py-2.5 border border-outline-variant/50 text-on-surface hover:bg-surface-container-low text-label-md transition-colors rounded-full active:scale-95"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveEdit(user.id)}
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-primary text-on-primary hover:shadow-lg text-label-md transition-all rounded-full active:scale-95 disabled:opacity-50"
                                  >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-on-surface-variant mb-3 block" style={{ fontSize: 48 }}>
                      group_off
                    </span>
                    <p className="text-body-lg">No users found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-6 border-t border-outline-variant/20 bg-surface-bright flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-label-sm text-on-surface-variant">
            Showing <span className="font-bold text-on-surface">{showingFrom} to {showingTo}</span> of{' '}
            <span className="font-bold text-on-surface">{total}</span> users
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-4 py-1.5 border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low transition-colors text-label-md flex items-center gap-1 disabled:opacity-50 rounded-full active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-4 py-1.5 border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low transition-colors text-label-md flex items-center gap-1 disabled:opacity-50 rounded-full active:scale-95"
            >
              Next
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}