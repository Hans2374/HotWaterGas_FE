import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import myOrdersApi from '../../api/myOrdersApi';
import PurchaseHistoryTable from '../../components/customer/PurchaseHistoryTable';
import './PurchaseHistoryPage.css';

const DEFAULT_PAGE_SIZE = 10;

/**
 * PurchaseHistoryPage - Customer's order history
 *
 * Route: /account/orders
 * Access: Authenticated customers only
 */
export default function PurchaseHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false
  });

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await myOrdersApi.getMyOrders(pagination.pageNumber, pagination.pageSize);

      setOrders(Array.isArray(data.items) ? data.items : []);
      setPagination((prev) => ({
        ...prev,
        pageNumber: data.pageNumber ?? prev.pageNumber,
        pageSize: data.pageSize ?? prev.pageSize,
        totalCount: data.totalCount ?? 0,
        totalPages: data.totalPages ?? 0,
        hasPreviousPage: data.hasPreviousPage ?? false,
        hasNextPage: data.hasNextPage ?? false
      }));
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Không thể tải lịch sử đơn hàng');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [pagination.pageNumber, pagination.pageSize]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, pageNumber: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderClick = (orderId) => {
    navigate(`/account/orders/${orderId}`);
  };

  const handleRetry = () => {
    loadOrders();
  };

  const startItem = pagination.totalCount === 0
    ? 0
    : (pagination.pageNumber - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.pageNumber * pagination.pageSize, pagination.totalCount);

  return (
    <div className="purchase-history-page">
      <section className="orders-page-header">
        <button
          type="button"
          className="orders-page-back-btn"
          onClick={() => navigate("/")}
          aria-label="Quay lại trang trước"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Quay lại
        </button>
        <div className="orders-page-title-group">
          <h2>Lịch sử mua hàng</h2>
          <p className="orders-page-subtitle">
            Xem các đơn hàng của bạn và truy cập key bản quyền sau khi thanh toán thành công.
          </p>
        </div>
      </section>

      <PurchaseHistoryTable
        orders={orders}
        onOrderClick={handleOrderClick}
        isLoading={loading}
        isEmpty={orders.length === 0}
        error={error}
        onRetry={handleRetry}
      />

      {!loading && !error && orders.length > 0 && pagination.totalPages > 1 && (
        <div className="orders-pagination-bar">
          <span className="orders-pagination-meta">
            Hiển thị <strong>{startItem}–{endItem}</strong> của <strong>{pagination.totalCount}</strong> đơn hàng
          </span>
          <div className="orders-pagination-nav">
            <button
              className="orders-pagination-btn"
              onClick={() => handlePageChange(pagination.pageNumber - 1)}
              disabled={!pagination.hasPreviousPage}
              aria-label="Trang trước"
            >
              <ChevronLeft size={14} />
              Trước
            </button>
            <span className="orders-pagination-label">
              Trang {pagination.pageNumber} / {pagination.totalPages}
            </span>
            <button
              className="orders-pagination-btn"
              onClick={() => handlePageChange(pagination.pageNumber + 1)}
              disabled={!pagination.hasNextPage}
              aria-label="Trang sau"
            >
              Sau
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
