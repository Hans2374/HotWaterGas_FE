import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  RefreshCw, DollarSign, ShoppingCart, CircleCheckBig, AlertTriangle, AlertCircle,
  Ban, TrendingUp, Package, BarChart3, Eye
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  getDashboardSummary, getRevenueAnalytics, getOrderStatusAnalytics,
  getInventoryAlerts, getRecentOrders
} from '../../api/adminDashboardApi';
import './AdminDashboardPage.css';

const OAUTH_TOAST_KEY = 'hotwatergas.oauth.toast';

const consumeOAuthToast = () => {
  try {
    const stored = sessionStorage.getItem(OAUTH_TOAST_KEY);
    if (stored) {
      sessionStorage.removeItem(OAUTH_TOAST_KEY);
      const { type, message } = JSON.parse(stored);
      return { type, message };
    }
  } catch {
    // ignore
  }
  return null;
};

const formatCurrency = (value) => {
  const num = Number(value || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M đ`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K đ`;
  return num.toLocaleString('vi-VN') + ' đ';
};

const formatFullCurrency = (value) => Number(value || 0).toLocaleString('vi-VN') + ' đ';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

// ─── Status Badge Components ──────────────────────────────────────────────────

const OrderStatusBadge = ({ status }) => {
  const map = {
    Completed: 'completed', Pending: 'pending', Cancelled: 'cancelled',
    Failed: 'failed', Processing: 'processing', Unknown: 'unknown'
  };
  const cls = map[status] || 'unknown';
  return <span className={`badge badge-order-${cls}`}>{status || 'Unknown'}</span>;
};

const PaymentStatusBadge = ({ status }) => {
  const map = {
    Paid: 'completed', Pending: 'pending', Cancelled: 'cancelled',
    Failed: 'failed', Unknown: 'unknown'
  };
  const cls = map[status] || 'unknown';
  return <span className={`badge badge-payment-${cls}`}>{status || 'Unknown'}</span>;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonBlock = ({ className }) => (
  <span className={`skeleton-block ${className || ''}`} />
);

const SkeletonRow = () => (
  <tr className="skeleton-row">
    <td><SkeletonBlock className="w-code" /></td>
    <td><SkeletonBlock className="w-name" /></td>
    <td><SkeletonBlock className="w-date" /></td>
    <td><SkeletonBlock className="w-price" /></td>
    <td><SkeletonBlock className="w-badge" /></td>
    <td><SkeletonBlock className="w-badge" /></td>
    <td><SkeletonBlock className="w-icon-btn" /></td>
  </tr>
);

// ─── Chart Tooltip ─────────────────────────────────────────────────────────────

const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <p className="chart-tooltip-value">{formatFullCurrency(payload[0]?.value)} VND</p>
    </div>
  );
};

// ─── Order Status Colors ──────────────────────────────────────────────────────

const STATUS_COLORS = {
  Completed: '#10B981',
  Pending: '#F59E0B',
  Cancelled: '#EF4444',
  Failed: '#EF4444',
  Processing: '#3B82F6',
  Unknown: '#8B949E'
};

// ─── Dashboard Page ─────────────────────────────────────────────────────────────

export const AdminDashboardPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  // ─── Summary ───────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  // ─── Revenue Chart ─────────────────────────────────────────────────────────
  const [revenueRange, setRevenueRange] = useState('7d');
  const [revenueData, setRevenueData] = useState([]);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState('');

  // ─── Order Status ───────────────────────────────────────────────────────────
  const [orderStatus, setOrderStatus] = useState([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');

  // ─── Inventory Alerts ────────────────────────────────────────────────────────────
  const [outOfStock, setOutOfStock] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');

  // ─── OAuth Toast ───────────────────────────────────────────────────────────
  useEffect(() => {
    const oauthToast = consumeOAuthToast();
    if (oauthToast) {
      if (oauthToast.type === 'success') {
        toast.success(oauthToast.message);
      } else {
        toast.error(oauthToast.message);
      }
    }
  }, []);

  // ─── Recent Orders ───────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [ordersMeta, setOrdersMeta] = useState({ pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  // ─── Last Updated ────────────────────────────────────────────────────────────
  const [lastUpdated, setLastUpdated] = useState(null);

  // ─── Load Recent Orders (independent of dashboard refresh) ─────────────────
  const loadRecentOrders = useCallback(async (page, pageSize) => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const data = await getRecentOrders(page, pageSize);
      setOrders(data.items);
      setOrdersMeta({
        pageNumber: data.pageNumber,
        pageSize: data.pageSize,
        totalCount: data.totalCount,
        totalPages: data.totalPages,
        hasNextPage: data.hasNextPage,
        hasPreviousPage: data.hasPreviousPage
      });
    } catch (err) {
      setOrdersError(err.message || 'Unable to load recent orders.');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // ─── Load Dashboard data (runs once on mount) ──────────────────────────────
  const loadDashboard = useCallback(async () => {
    setLastUpdated(new Date());

    // Summary
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setSummaryError(err.message || 'Unable to load dashboard data.');
    } finally {
      setSummaryLoading(false);
    }

    // Revenue
    setRevenueLoading(true);
    setRevenueError('');
    try {
      const data = await getRevenueAnalytics(revenueRange);
      setRevenueData(data);
    } catch (err) {
      setRevenueError(err.message || 'Unable to load revenue data.');
    } finally {
      setRevenueLoading(false);
    }

    // Order Status
    setStatusLoading(true);
    setStatusError('');
    try {
      const data = await getOrderStatusAnalytics();
      setOrderStatus(data);
    } catch (err) {
      setStatusError(err.message || 'Unable to load order status.');
    } finally {
      setStatusLoading(false);
    }

    // Inventory Alerts
    setInventoryLoading(true);
    setInventoryError('');
    try {
      const data = await getInventoryAlerts(5);
      setOutOfStock(Array.isArray(data.outOfStockProducts) ? data.outOfStockProducts : []);
      setLowStock(Array.isArray(data.lowStockProducts) ? data.lowStockProducts : []);
    } catch (err) {
      setInventoryError(err.message || 'Unable to load inventory alerts.');
    } finally {
      setInventoryLoading(false);
    }
  }, [revenueRange]);

  // Initial load: dashboard data + page 1 of recent orders
  useEffect(() => {
    loadDashboard();
    loadRecentOrders(1, 10);
  }, [loadDashboard, loadRecentOrders]);

  // ─── Revenue Range Change ────────────────────────────────────────────────────
  const handleRangeChange = async (range) => {
    setRevenueRange(range);
    setRevenueLoading(true);
    setRevenueError('');
    try {
      const data = await getRevenueAnalytics(range);
      setRevenueData(data);
    } catch (err) {
      setRevenueError(err.message || 'Unable to load revenue data.');
    } finally {
      setRevenueLoading(false);
    }
  };

  // ─── Pagination ─────────────────────────────────────────────────────────────
  const handlePageChange = async (newPage) => {
    if (newPage < 1 || newPage > ordersMeta.totalPages) return;
    await loadRecentOrders(newPage, ordersMeta.pageSize);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-page">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <header className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Overview of sales, orders, inventory, and platform activity.</p>
        </div>
        <div className="page-header-right">
          {lastUpdated && (
            <span className="last-updated">
              Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="btn-icon" onClick={loadDashboard} title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        {/* Total Revenue */}
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-revenue">
            <DollarSign size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Total Revenue</span>
            {summaryLoading ? (
              <SkeletonBlock className="w-kpi-value" />
            ) : summaryError ? (
              <span className="kpi-value kpi-error">—</span>
            ) : (
              <span className="kpi-value">{formatCurrency(summary?.totalRevenue)}</span>
            )}
          </div>
        </div>

        {/* Total Orders */}
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-orders">
            <ShoppingCart size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Total Orders</span>
            {summaryLoading ? (
              <SkeletonBlock className="w-kpi-value" />
            ) : summaryError ? (
              <span className="kpi-value kpi-error">—</span>
            ) : (
              <span className="kpi-value">{summary?.totalOrders ?? 0}</span>
            )}
          </div>
        </div>

        {/* Completed Orders */}
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-completed">
            <CircleCheckBig size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Completed Orders</span>
            {summaryLoading ? (
              <SkeletonBlock className="w-kpi-value" />
            ) : summaryError ? (
              <span className="kpi-value kpi-error">—</span>
            ) : (
              <span className="kpi-value">{summary?.completedOrders ?? 0}</span>
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-lowstock">
            <AlertTriangle size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Low Stock Products</span>
            {summaryLoading ? (
              <SkeletonBlock className="w-kpi-value" />
            ) : summaryError ? (
              <span className="kpi-value kpi-error">—</span>
            ) : (
              <span className="kpi-value">{summary?.lowStockProducts ?? 0}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts Row ─────────────────────────────────────────────────────── */}
      <div className="charts-row">
        {/* Revenue Chart */}
        <div className="card chart-card">
          <div className="card-header">
            <div className="card-header-left">
              <TrendingUp size={16} className="card-header-icon" />
              <h2>Revenue</h2>
            </div>
            <div className="range-selector">
              {['7d', '30d', '12m'].map((r) => (
                <button
                  key={r}
                  className={`range-btn ${revenueRange === r ? 'active' : ''}`}
                  onClick={() => handleRangeChange(r)}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-body">
            {revenueLoading ? (
              <div className="chart-skeleton">
                <SkeletonBlock className="w-chart-area" />
              </div>
            ) : revenueError ? (
              <div className="chart-error">
                <p>{revenueError}</p>
                <button className="btn btn-sm-secondary" onClick={loadDashboard}>Retry</button>
              </div>
            ) : revenueData.length === 0 ? (
              <div className="chart-empty">
                <BarChart3 size={36} className="empty-icon" />
                <p>No revenue data available.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#8B949E', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    interval={revenueRange === '12m' ? 1 : 'preserveStartEnd'}
                  />
                  <YAxis
                    tick={{ fill: '#8B949E', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCurrency(v)}
                    width={55}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#EF4444', stroke: '#1F2937', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Order Status Donut */}
        <div className="card chart-card chart-card-sm">
          <div className="card-header">
            <div className="card-header-left">
              <Package size={16} className="card-header-icon" />
              <h2>Order Status</h2>
            </div>
          </div>

          <div className="chart-body">
            {statusLoading ? (
              <div className="chart-skeleton">
                <SkeletonBlock className="w-chart-donut" />
              </div>
            ) : statusError ? (
              <div className="chart-error">
                <p>{statusError}</p>
                <button className="btn btn-sm-secondary" onClick={loadDashboard}>Retry</button>
              </div>
            ) : orderStatus.length === 0 ? (
              <div className="chart-empty">
                <Package size={36} className="empty-icon" />
                <p>No order data available.</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={orderStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="status"
                    >
                      {orderStatus.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] || '#8B949E'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} orders`, name]}
                      contentStyle={{
                        background: '#1F2937',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#F3F4F6'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="status-legend">
                  {orderStatus.map((entry) => {
                    const total = orderStatus.reduce((s, e) => s + e.count, 0);
                    const pct = total > 0 ? Math.round((entry.count / total) * 100) : 0;
                    return (
                      <div key={entry.status} className="status-legend-item">
                        <span
                          className="status-dot"
                          style={{ background: STATUS_COLORS[entry.status] || '#8B949E' }}
                        />
                        <span className="status-legend-label">{entry.status}</span>
                        <span className="status-legend-count">{entry.count}</span>
                        <span className="status-legend-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Inventory Alerts ─────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-left">
            <AlertTriangle size={16} className="card-header-icon" />
            <h2>Inventory Alerts</h2>
            {(outOfStock.length + lowStock.length) > 0 && (
              <span className="count-badge">{outOfStock.length + lowStock.length}</span>
            )}
          </div>
        </div>

        <div className="inventory-alerts-body">
          {inventoryLoading ? (
            <div className="inventory-groups">
              <div className="inventory-group">
                <div className="inventory-group-header inventory-group-header-danger">
                  <span className="inventory-group-label">Out of Stock</span>
                </div>
                <div className="inventory-group-items">
                  {[1, 2].map((i) => (
                    <div key={i} className="inventory-item-skeleton">
                      <SkeletonBlock className="w-thumb" />
                      <div className="inventory-info-skeleton">
                        <SkeletonBlock className="w-name" />
                        <SkeletonBlock className="w-badge" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="inventory-group">
                <div className="inventory-group-header inventory-group-header-warning">
                  <span className="inventory-group-label">Low Stock</span>
                </div>
                <div className="inventory-group-items">
                  {[1, 2].map((i) => (
                    <div key={i} className="inventory-item-skeleton">
                      <SkeletonBlock className="w-thumb" />
                      <div className="inventory-info-skeleton">
                        <SkeletonBlock className="w-name" />
                        <SkeletonBlock className="w-badge" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : inventoryError ? (
            <div className="section-error">
              <p>{inventoryError}</p>
              <button className="btn btn-sm-secondary" onClick={loadDashboard}>Retry</button>
            </div>
          ) : outOfStock.length === 0 && lowStock.length === 0 ? (
            <div className="section-empty">
              <Package size={32} className="empty-icon-success" />
              <p className="empty-title">All inventory levels are healthy.</p>
            </div>
          ) : (
            <div className="inventory-groups">
              {/* Out of Stock */}
              <div className="inventory-group">
                <div className="inventory-group-header inventory-group-header-danger">
                  <Ban size={13} />
                  <span className="inventory-group-label">Out of Stock</span>
                  {outOfStock.length > 0 && (
                    <span className="inventory-count-tag danger">{outOfStock.length}</span>
                  )}
                </div>
                {outOfStock.length === 0 ? (
                  <div className="inventory-group-empty">
                    <span>No products out of stock.</span>
                  </div>
                ) : (
                  <div className="inventory-group-items">
                    {outOfStock.map((product) => (
                      <div key={product.productId} className="inventory-item inventory-item-danger">
                        <div className="inventory-thumb">
                          {product.thumbnailImageUrl ? (
                            <img src={product.thumbnailImageUrl} alt={product.productName} />
                          ) : (
                            <span className="thumb-placeholder">No img</span>
                          )}
                        </div>
                        <div className="inventory-info">
                          <span className="inventory-name">{product.productName}</span>
                          <span className="inventory-keys inventory-keys-danger">
                            0 keys available
                          </span>
                        </div>
                        <button
                          className="btn btn-sm-action-danger"
                          onClick={() => navigate(`/admin/products/${product.productId}/keys`)}
                          title="Manage product"
                        >
                          Manage
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Low Stock */}
              <div className="inventory-group">
                <div className="inventory-group-header inventory-group-header-warning">
                  <AlertCircle size={13} />
                  <span className="inventory-group-label">Low Stock</span>
                  {lowStock.length > 0 && (
                    <span className="inventory-count-tag warning">{lowStock.length}</span>
                  )}
                </div>
                {lowStock.length === 0 ? (
                  <div className="inventory-group-empty">
                    <span>No products with low stock.</span>
                  </div>
                ) : (
                  <div className="inventory-group-items">
                    {lowStock.map((product) => (
                      <div key={product.productId} className="inventory-item inventory-item-warning">
                        <div className="inventory-thumb">
                          {product.thumbnailImageUrl ? (
                            <img src={product.thumbnailImageUrl} alt={product.productName} />
                          ) : (
                            <span className="thumb-placeholder">No img</span>
                          )}
                        </div>
                        <div className="inventory-info">
                          <span className="inventory-name">{product.productName}</span>
                          <span className="inventory-keys inventory-keys-warning">
                            {product.availableKeys} key{product.availableKeys !== 1 ? 's' : ''} left
                          </span>
                        </div>
                        <button
                          className="btn btn-sm-action-warning"
                          onClick={() => navigate(`/admin/products/${product.productId}/keys`)}
                          title="Manage product"
                        >
                          Manage
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Orders Table ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-left">
            <ShoppingCart size={16} className="card-header-icon" />
            <h2>Recent Orders</h2>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order Code</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Order</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : ordersError ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-error-state">
                      <p>{ordersError}</p>
                      <button className="btn btn-sm-secondary" onClick={loadDashboard}>Retry</button>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty-state">
                      <ShoppingCart size={36} className="empty-icon" />
                      <p className="empty-title">No orders found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.orderId}>
                    <td>
                      <span className="order-code">{order.orderCode || '—'}</span>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <span className="customer-name">{order.customerName || '—'}</span>
                        <span className="customer-email">{order.customerEmail || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="date-cell">{formatDate(order.createdAt)}</span>
                    </td>
                    <td>
                      <span className="amount-cell">{formatFullCurrency(order.totalAmount)}</span>
                    </td>
                    <td>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </td>
                    <td>
                      <OrderStatusBadge status={order.orderStatus} />
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn-icon-sm"
                        onClick={() => navigate(`/admin/orders/${order.orderId}`)}
                        title="View order"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!ordersLoading && !ordersError && orders.length > 0 && (
          <div className="pagination-bar">
            <span className="pagination-info">
              Showing {((ordersMeta.pageNumber - 1) * ordersMeta.pageSize) + 1}–
              {Math.min(ordersMeta.pageNumber * ordersMeta.pageSize, ordersMeta.totalCount)} of {ordersMeta.totalCount}
            </span>
            <div className="pagination-controls">
              <button
                className="btn-pagination"
                disabled={!ordersMeta.hasPreviousPage || ordersLoading}
                onClick={() => handlePageChange(ordersMeta.pageNumber - 1)}
              >
                Prev
              </button>
              <span className="pagination-page">
                {ordersMeta.pageNumber} / {ordersMeta.totalPages}
              </span>
              <button
                className="btn-pagination"
                disabled={!ordersMeta.hasNextPage || ordersLoading}
                onClick={() => handlePageChange(ordersMeta.pageNumber + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
