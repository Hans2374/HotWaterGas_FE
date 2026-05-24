import React, { useEffect, useState } from 'react';
import { X, User, AlertCircle, Ban, Check, RefreshCw } from 'lucide-react';
import { getAdminUserDetail, toggleUserSuspension } from '../../services/userService';

const formatDate = (value) => {
  if (!value) return 'Never logged in';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Never logged in' : date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }) + ' đ';
};

const StatusBadge = ({ isSuspended }) => (
  <span className={`detail-badge ${isSuspended ? 'badge-suspended' : 'badge-active'}`}>
    {isSuspended ? 'Suspended' : 'Active'}
  </span>
);

const RoleBadge = ({ role }) => (
  <span className={`detail-badge ${role === 'Admin' ? 'badge-admin' : 'badge-customer'}`}>
    {role}
  </span>
);

const OrderStatusBadge = ({ status }) => {
  const statusClass = {
    'Pending': 'order-pending',
    'Confirmed': 'order-confirmed',
    'Completed': 'order-completed',
    'Cancelled': 'order-cancelled',
    'Refunded': 'order-refunded'
  }[status] || 'order-pending';

  return <span className={`order-status-badge ${statusClass}`}>{status}</span>;
};

export const AdminUserDetailModal = ({ userId, onClose, onActionComplete }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isActioning, setIsActioning] = useState(false);

  const fetchUserDetail = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAdminUserDetail(userId);
      setUser(data);
    } catch (err) {
      setError(err.message || 'Failed to load user details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetail();
  }, [userId]);

  const handleSuspendToggle = async () => {
    if (!user || isActioning) return;

    setIsActioning(true);
    try {
      await toggleUserSuspension(user.id);
      const newSuspended = !user.isSuspended;
      setUser(prev => ({ ...prev, isSuspended: newSuspended }));
      if (onActionComplete) {
        onActionComplete(user.id, newSuspended);
      }
    } catch (err) {
      if (err.status === 400 && err.message?.includes('cannot suspend your own')) {
        setError('You cannot suspend your own account.');
      } else {
        setError(err.message || 'Action failed. Please try again.');
      }
    } finally {
      setIsActioning(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="user-detail-overlay" role="presentation" onClick={handleOverlayClick}>
      <div className="user-detail-modal" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="user-detail-header">
          <div className="user-detail-identity">
            <div className="user-detail-avatar">
              <User size={28} />
            </div>
            <div className="user-detail-name-email">
              <h2 className="user-detail-name">{isLoading ? 'Loading...' : (user?.displayName || 'Unknown')}</h2>
              <p className="user-detail-email">{isLoading ? '' : (user?.email || '')}</p>
            </div>
          </div>
          <div className="user-detail-header-actions">
            {!isLoading && user && (
              <button
                className={`btn-detail-action ${user.isSuspended ? 'btn-restore' : 'btn-suspend'}`}
                onClick={handleSuspendToggle}
                disabled={isActioning}
              >
                {isActioning ? (
                  <RefreshCw size={14} className="spin" />
                ) : user.isSuspended ? (
                  <Check size={14} />
                ) : (
                  <Ban size={14} />
                )}
                {isActioning ? 'Processing...' : (user.isSuspended ? 'Restore' : 'Suspend')}
              </button>
            )}
            <button className="btn-detail-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="user-detail-content">
          {isLoading ? (
            <div className="user-detail-loading">
              <div className="skeleton-block" style={{ width: '100%', height: '120px' }} />
              <div className="skeleton-block" style={{ width: '100%', height: '100px' }} />
              <div className="skeleton-block" style={{ width: '100%', height: '200px' }} />
            </div>
          ) : error && !user ? (
            <div className="user-detail-error">
              <AlertCircle size={36} />
              <p className="error-message">{error}</p>
              <button className="btn btn-secondary" onClick={fetchUserDetail}>
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          ) : user ? (
            <>
              {/* Badges Row */}
              <div className="user-detail-badges">
                <StatusBadge isSuspended={user.isSuspended} />
                <RoleBadge role={user.role} />
              </div>

              {/* Account Information Section */}
              <section className="user-detail-section">
                <h3 className="section-title">Account Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">User ID</span>
                    <span className="info-value info-value-mono">{user.id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email</span>
                    <span className="info-value">{user.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Provider</span>
                    <span className="info-value">{user.provider}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Role</span>
                    <span className="info-value">{user.role}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email Confirmed</span>
                    <span className={`info-value ${user.emailConfirmed ? 'text-green' : 'text-yellow'}`}>
                      {user.emailConfirmed ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Status</span>
                    <span className={`info-value ${user.isSuspended ? 'text-red' : 'text-green'}`}>
                      {user.isSuspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                </div>
              </section>

              {/* Activity Section */}
              <section className="user-detail-section">
                <h3 className="section-title">Activity</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Created At</span>
                    <span className="info-value">{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Login</span>
                    <span className="info-value">{formatDate(user.lastLoginAt)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Orders Count</span>
                    <span className="info-value">{user.ordersCount}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Total Spent</span>
                    <span className="info-value text-orange">{formatCurrency(user.totalSpent)}</span>
                  </div>
                </div>
              </section>

              {/* Recent Orders Section */}
              <section className="user-detail-section">
                <h3 className="section-title">Recent Orders</h3>
                {user.recentOrders && user.recentOrders.length > 0 ? (
                  <div className="orders-table-wrapper">
                    <table className="orders-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Status</th>
                          <th>Amount</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {user.recentOrders.map((order) => (
                          <tr key={order.orderId}>
                            <td className="order-id-mono">{order.orderId.slice(0, 8).toUpperCase()}</td>
                            <td><OrderStatusBadge status={order.status} /></td>
                            <td className="order-amount">{formatCurrency(order.totalAmount)}</td>
                            <td className="order-date">{formatDate(order.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-orders">No orders yet</p>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
