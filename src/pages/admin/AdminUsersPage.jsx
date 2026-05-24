import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Search, X, User, Eye, Check, Ban } from 'lucide-react';
import { getAdminUsers, toggleUserSuspension } from '../../services/userService';
import { AdminUserDetailModal } from '../../components/admin/AdminUserDetailModal';
import './AdminUsersPage.css';

const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN') + ' đ';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const StatusBadge = ({ isSuspended }) => (
  <span className={`user-status-badge ${isSuspended ? 'suspended' : 'active'}`}>
    {isSuspended ? 'Suspended' : 'Active'}
  </span>
);

const ProviderBadge = ({ provider }) => (
  <span className="provider-badge">
    {provider === 'Google' ? (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ) : null}
    {provider}
  </span>
);

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });

  const [actionTarget, setActionTarget] = useState(null);
  const [isActioning, setIsActioning] = useState(false);
  const [detailUserId, setDetailUserId] = useState(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const query = {
        page,
        pageSize,
        search: filters.search || undefined,
        isSuspended: filters.status === 'active' ? false : filters.status === 'suspended' ? true : undefined
      };
      const result = await getAdminUsers(query);
      setUsers(result.data || []);
      setTotalItems(result.totalItems || 0);
      setTotalPages(result.totalPages || 0);
    } catch (err) {
      setLoadError(err.message || 'Failed to load users.');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ search: '', status: '' });
    setPage(1);
  };

  const openSuspendConfirm = (user) => {
    setActionTarget(user);
  };

  const handleViewUser = (userId) => {
    setDetailUserId(userId);
  };

  const closeDetailModal = () => {
    setDetailUserId(null);
  };

  const handleDetailActionComplete = (updatedUserId, newIsSuspended) => {
    // Update the user in the local list
    setUsers(prevUsers =>
      prevUsers.map(u =>
        u.id === updatedUserId
          ? { ...u, isSuspended: newIsSuspended }
          : u
      )
    );
  };

  const closeConfirm = () => {
    if (isActioning) return;
    setActionTarget(null);
  };

  const confirmSuspend = async () => {
    if (!actionTarget?.id) return;

    setIsActioning(true);
    try {
      await toggleUserSuspension(actionTarget.id);
      toast.success(actionTarget.isSuspended ? 'User restored successfully.' : 'User suspended successfully.');
      setActionTarget(null);
      await loadUsers();
    } catch (err) {
      if (err.status === 400 && err.message?.includes('cannot suspend your own')) {
        toast.error('You cannot suspend your own account.');
      } else {
        toast.error(err.message || 'Action failed. Please try again.');
      }
    } finally {
      setIsActioning(false);
    }
  };

  const isFiltering = filters.search || filters.status;

  const totalPageCount = Math.max(1, totalPages);

  return (
    <div className="products-page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1>Users</h1>
          <p>Manage user accounts and moderation.</p>
        </div>
      </header>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        {/* Status filter pills */}
        <div className="filter-pills">
          <button
            className={`filter-pill ${filters.status === '' ? 'active' : ''}`}
            onClick={() => handleFilterChange('status', '')}
          >
            All
          </button>
          <button
            className={`filter-pill ${filters.status === 'active' ? 'active' : ''}`}
            onClick={() => handleFilterChange('status', 'active')}
          >
            Active
          </button>
          <button
            className={`filter-pill ${filters.status === 'suspended' ? 'active' : ''}`}
            onClick={() => handleFilterChange('status', 'suspended')}
          >
            Suspended
          </button>
        </div>

        <div className="filter-divider" />

        {/* Search */}
        <div className="filter-search">
          <span className="filter-search-icon">
            <Search size={14} />
          </span>
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          {filters.search && (
            <button
              className="filter-search-clear"
              onClick={() => handleFilterChange('search', '')}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th className="col-user-col">User</th>
              <th className="col-role-col">Role</th>
              <th className="col-provider-col">Provider</th>
              <th className="col-status-col">Status</th>
              <th className="col-orders-col">Orders</th>
              <th className="col-spent-col">Total Spent</th>
              <th className="col-login-col">Last Login</th>
              <th className="col-created-col">Created</th>
              <th className="col-actions-col" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        <User size={18} />
                      </div>
                      <div className="user-info">
                        <span className="skeleton-cell w-lg" />
                        <span className="skeleton-cell w-md" />
                      </div>
                    </div>
                  </td>
                  <td><span className="skeleton-cell w-sm" /></td>
                  <td><span className="skeleton-cell w-badge" /></td>
                  <td><span className="skeleton-cell w-badge" /></td>
                  <td><span className="skeleton-cell w-sm" /></td>
                  <td><span className="skeleton-cell w-sm" /></td>
                  <td><span className="skeleton-cell w-sm" /></td>
                  <td><span className="skeleton-cell w-sm" /></td>
                  <td className="actions-cell">
                    <div className="skeleton-cell w-actions">
                      <span className="skeleton-cell w-icon" />
                      <span className="skeleton-cell w-icon" />
                    </div>
                  </td>
                </tr>
              ))
            ) : loadError ? (
              <tr>
                <td colSpan={9} style={{ padding: 0, border: 'none' }}>
                  <div className="table-error">
                    <p className="table-error-title">{loadError}</p>
                    <button className="btn btn-secondary" onClick={loadUsers}>Try again</button>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 0, border: 'none' }}>
                  <div className="table-empty">
                    <User size={36} className="empty-icon" />
                    <p className="empty-title">No users found</p>
                    <p className="empty-hint">
                      {isFiltering
                        ? 'No users match your current filters.'
                        : 'No users have been registered yet.'}
                    </p>
                    {isFiltering && (
                      <button className="btn btn-secondary" onClick={handleClearFilters} style={{ marginTop: '10px' }}>
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.displayName} />
                        ) : (
                          <User size={18} />
                        )}
                      </div>
                      <div className="user-info">
                        <span className="user-name">{user.displayName}</span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="role-cell">{user.role}</td>
                  <td><ProviderBadge provider={user.provider} /></td>
                  <td><StatusBadge isSuspended={user.isSuspended} /></td>
                  <td className="numeric-cell">{user.ordersCount}</td>
                  <td className="numeric-cell">{formatCurrency(user.totalSpent)}</td>
                  <td className="date-cell">{formatDate(user.lastLoginAt)}</td>
                  <td className="date-cell">{formatDate(user.createdAt)}</td>
                  <td className="actions-cell">
                    <div className="actions-group">
                      <button
                        className="action-btn action-btn-view"
                        onClick={() => handleViewUser(user.id)}
                        title="View Details"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        className={`action-btn ${user.isSuspended ? 'action-btn-restore' : 'action-btn-suspend'}`}
                        onClick={() => openSuspendConfirm(user)}
                        title={user.isSuspended ? 'Restore User' : 'Suspend User'}
                      >
                        {user.isSuspended ? <Check size={13} /> : <Ban size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && users.length > 0 && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalItems)} of {totalItems} users
          </span>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span className="pagination-pages">
              Page {page} of {totalPageCount}
            </span>
            <button
              className="pagination-btn"
              onClick={() => setPage(p => Math.min(totalPageCount, p + 1))}
              disabled={page >= totalPageCount}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {actionTarget && (
        <div className="modal-overlay" role="presentation" onClick={closeConfirm}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {actionTarget.isSuspended ? 'Restore User?' : 'Suspend User?'}
              </h3>
              <p className="modal-user-name">{actionTarget.displayName}</p>
              <p className="modal-user-email">{actionTarget.email}</p>
              <p className="modal-message">
                {actionTarget.isSuspended
                  ? 'This user will be able to log in and use their account again.'
                  : 'This user will be prevented from logging in until restored.'}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeConfirm} disabled={isActioning}>
                Cancel
              </button>
              <button
                className={`btn ${actionTarget.isSuspended ? 'btn-success' : 'btn-warning'}`}
                onClick={confirmSuspend}
                disabled={isActioning}
              >
                {isActioning ? 'Processing...' : actionTarget.isSuspended ? 'Restore' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {detailUserId && (
        <AdminUserDetailModal
          userId={detailUserId}
          onClose={closeDetailModal}
          onActionComplete={handleDetailActionComplete}
        />
      )}
    </div>
  );
};
