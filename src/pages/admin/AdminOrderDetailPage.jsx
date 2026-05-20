import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, CreditCard, Key, Clock } from 'lucide-react';
import { Loader } from '../../components/common/Loader';
import { getAdminOrderDetail } from '../../api/adminDashboardApi';
import { formatCurrency, maskSteamKey } from '../../utils/formatters';
import './AdminOrderDetailPage.css';

const ORDER_STATUS_MAP = {
  0: 'order-status-badge--error',
  1: 'order-status-badge--error',
  2: 'order-status-badge--warning',
  4: 'order-status-badge--success',
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

export const AdminOrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState({});
  const [copiedKeys, setCopiedKeys] = useState({});

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getAdminOrderDetail(orderId);
      setOrder(data);
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true);
      } else {
        setError(err.message || 'Failed to load order.');
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const toggleKeyReveal = (keyId) => {
    setRevealedKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const handleCopyKey = async (keyId, keyValue) => {
    try {
      await navigator.clipboard.writeText(keyValue);
      setCopiedKeys((prev) => ({ ...prev, [keyId]: true }));
      setTimeout(() => setCopiedKeys((prev) => ({ ...prev, [keyId]: false })), 2000);
    } catch {
      // silent fail
    }
  };

  if (loading) {
    return (
      <div className="admin-order-detail-loading">
        <Loader text="Loading order..." />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="admin-order-detail-page">
        <button className="admin-order-back" onClick={() => navigate('/admin/dashboard')}>
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>
        <div className="admin-order-state admin-order-state--notfound">
          <Package size={40} className="admin-order-state-icon" />
          <h2>Order Not Found</h2>
          <p>This order does not exist or has been removed.</p>
          <button className="admin-order-btn-secondary" onClick={() => navigate('/admin/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-order-detail-page">
        <button className="admin-order-back" onClick={() => navigate('/admin/dashboard')}>
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>
        <div className="admin-order-state admin-order-state--error">
          <p className="admin-order-state-message">{error}</p>
          <div className="admin-order-state-actions">
            <button className="admin-order-btn-primary" onClick={fetchOrder}>Retry</button>
            <button className="admin-order-btn-secondary" onClick={() => navigate('/admin/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const statusBadgeClass = ORDER_STATUS_MAP[order.status] || 'order-status-badge--neutral';

  return (
    <div className="admin-order-detail-page">
      {/* Back */}
      <button className="admin-order-back" onClick={() => navigate('/admin/dashboard')}>
        <ArrowLeft size={15} />
        Back to Dashboard
      </button>

      {/* Header */}
      <header className="admin-order-header">
        <div className="admin-order-header-main">
          <h1>Order #{order.orderNumber}</h1>
          <span className={`order-status-badge ${statusBadgeClass}`}>
            {order.statusLabel}
          </span>
        </div>
        <div className="admin-order-header-meta">
          <span className="admin-order-meta-item">
            <Clock size={13} />
            Placed {formatDateTime(order.createdAt)}
          </span>
          {order.fulfilledAt && (
            <span className="admin-order-meta-item">
              <Key size={13} />
              Fulfilled {formatDateTime(order.fulfilledAt)}
            </span>
          )}
        </div>
      </header>

      {/* Info Cards Row */}
      <div className="admin-order-info-row">
        {/* Customer */}
        <div className="admin-order-card">
          <div className="admin-order-card-header">
            <User size={15} />
            <h2>Customer</h2>
          </div>
          <div className="admin-order-card-body">
            <div className="admin-order-field">
              <span className="admin-order-field-label">Display Name</span>
              <span className="admin-order-field-value">{order.customer?.displayName || '—'}</span>
            </div>
            <div className="admin-order-field">
              <span className="admin-order-field-label">Email</span>
              <span className="admin-order-field-value">{order.customer?.email || '—'}</span>
            </div>
            <div className="admin-order-field">
              <span className="admin-order-field-label">User ID</span>
              <span className="admin-order-field-value admin-order-field-value--mono">
                {order.customer?.userId || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="admin-order-card">
          <div className="admin-order-card-header">
            <CreditCard size={15} />
            <h2>Payment</h2>
          </div>
          <div className="admin-order-card-body">
            <div className="admin-order-field">
              <span className="admin-order-field-label">Payment Status</span>
              <span className="admin-order-field-value">{order.paymentStatus || '—'}</span>
            </div>
            <div className="admin-order-field">
              <span className="admin-order-field-label">Method</span>
              <span className="admin-order-field-value">{order.paymentMethodLabel || '—'}</span>
            </div>
            <div className="admin-order-field">
              <span className="admin-order-field-label">Total</span>
              <span className="admin-order-field-value admin-order-field-value--highlight">
                {formatCurrency(order.finalTotal)} VND
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="admin-order-card">
        <div className="admin-order-card-header">
          <Package size={15} />
          <h2>Order Items</h2>
        </div>
        <div className="admin-order-table-wrapper">
          <table className="admin-order-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="col-qty">Qty</th>
                <th className="col-price">Unit Price</th>
                <th className="col-price">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="admin-order-product-cell">
                      {item.productImageUrl ? (
                        <img
                          className="admin-order-product-thumb"
                          src={item.productImageUrl}
                          alt={item.productName}
                        />
                      ) : (
                        <div className="admin-order-product-thumb admin-order-product-thumb--placeholder">
                          <Package size={14} />
                        </div>
                      )}
                      <div className="admin-order-product-info">
                        <span className="admin-order-product-name">{item.productName}</span>
                        <button
                          className="admin-order-product-link"
                          onClick={() => navigate(`/admin/products/${item.productId}/edit`)}
                        >
                          View product
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="col-qty">{item.quantity}</td>
                  <td className="col-price">{formatCurrency(item.unitPrice)}</td>
                  <td className="col-price">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="admin-order-totals-label">Subtotal</td>
                <td className="col-price">{formatCurrency(order.subtotal)} VND</td>
              </tr>
              {order.discountAmount > 0 && (
                <tr className="admin-order-discount-row">
                  <td colSpan={3} className="admin-order-totals-label">Discount</td>
                  <td className="col-price admin-order-discount-value">
                    -{formatCurrency(order.discountAmount)} VND
                  </td>
                </tr>
              )}
              <tr className="admin-order-total-row">
                <td colSpan={3} className="admin-order-totals-label">Total</td>
                <td className="col-price admin-order-total-value">{formatCurrency(order.finalTotal)} VND</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Steam Keys */}
      {order.licenses && order.licenses.length > 0 && (
        <div className="admin-order-card">
          <div className="admin-order-card-header">
            <Key size={15} />
            <h2>Steam Keys</h2>
            <span className="admin-order-count-tag">{order.licenses.length}</span>
          </div>
          <div className="admin-order-keys-list">
            {order.licenses.map((license) => {
              const isRevealed = revealedKeys[license.steamKeyId];
              const isCopied = copiedKeys[license.steamKeyId];
              return (
                <div key={license.steamKeyId} className="admin-order-key-card">
                  <div className="admin-order-key-header">
                    <span className="admin-order-key-product">{license.productName}</span>
                    <div className="admin-order-key-actions">
                      <button
                        className="admin-order-key-btn"
                        onClick={() => toggleKeyReveal(license.steamKeyId)}
                        title={isRevealed ? 'Hide key' : 'Reveal key'}
                      >
                        {isRevealed ? 'Hide' : 'Reveal'}
                      </button>
                      <button
                        className={`admin-order-key-btn ${isCopied ? 'admin-order-key-btn--copied' : ''}`}
                        onClick={() => handleCopyKey(license.steamKeyId, license.keyValue)}
                        title="Copy key"
                      >
                        {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <code className="admin-order-key-value">
                    {isRevealed ? license.keyValue : maskSteamKey(license.keyValue)}
                  </code>
                  {license.usedAt && (
                    <span className="admin-order-key-used">Used {formatDateTime(license.usedAt)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
