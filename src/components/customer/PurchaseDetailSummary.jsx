import { formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import './PurchaseDetailSummary.css';

/**
 * PurchaseDetailSummary - Displays order items and payment summary
 */
export default function PurchaseDetailSummary({ items, subtotal, discountAmount, finalTotal, paymentMethodLabel }) {
  const navigate = useNavigate();

  return (
    <div className="detail-summary-section">
      <h3>Sản phẩm</h3>

      <div className="items-table">
        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th className="qty-col">Số lượng</th>
              <th className="price-col">Đơn giá</th>
              <th className="total-col">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <div className="item-product">
                    {item.productImageUrl && (
                      <img
                        src={item.productImageUrl}
                        alt={item.productName}
                        className="item-image"
                      />
                    )}
                    <div className="item-info">
                      {item.productSlug ? (
                        <button
                          type="button"
                          className="item-name-link"
                          onClick={() => navigate(`/products/${item.productSlug}`)}
                        >
                          <div className="item-name">{item.productName}</div>
                        </button>
                      ) : (
                        <div className="item-name">{item.productName}</div>
                      )}
                      <div className="item-slug">{item.productSlug}</div>
                    </div>
                  </div>
                </td>
                <td className="qty-col">{item.quantity}</td>
                <td className="price-col">{formatCurrency(item.unitPrice)}</td>
                <td className="total-col">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary-totals">
        <div className="summary-row">
          <span>Tạm tính</span>
          <span className="amount">{formatCurrency(subtotal)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="summary-row discount">
            <span>Giảm giá</span>
            <span className="amount">-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        <div className="summary-row total">
          <span>Tổng cộng</span>
          <span className="amount">{formatCurrency(finalTotal)}</span>
        </div>

        {paymentMethodLabel && (
          <div className="summary-row">
            <span>Phương thức thanh toán</span>
            <span>{paymentMethodLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
