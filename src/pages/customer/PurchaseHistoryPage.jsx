import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import myOrdersApi from '../../api/myOrdersApi';
import PurchaseHistoryTable from '../../components/customer/PurchaseHistoryTable';
import './PurchaseHistoryPage.css';

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

  // Fetch orders on mount
  useEffect(() => {
    const fetchOrders = async () => {
      try {
      setLoading(true);
      setError(null);
      const data = await myOrdersApi.getMyOrders();
      setOrders(data);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        setError('Không thể tải lịch sử đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleOrderClick = (orderId) => {
    navigate(`/account/orders/${orderId}`);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    const fetchOrders = async () => {
      try {
        const data = await myOrdersApi.getMyOrders();
        setOrders(data);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        setError('Không thể tải lịch sử đơn hàng');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  };

  return (
    <div className="purchase-history-page">
      <section className="orders-page-header">
        <h2>Lịch sử mua hàng</h2>
        <p className="orders-page-subtitle">
          Xem các đơn hàng của bạn và truy cập key bản quyền sau khi thanh toán thành công.
        </p>
      </section>

      <PurchaseHistoryTable
        orders={orders}
        onOrderClick={handleOrderClick}
        isLoading={loading}
        isEmpty={orders.length === 0}
        error={error}
        onRetry={handleRetry}
      />
    </div>
  );
}
