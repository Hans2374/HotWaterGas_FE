import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import './CartItemRow.css';

const formatCurrency = (value) => Number(value || 0).toLocaleString();

export const CartItemRow = ({ item, onQuantityChange, onRemove, isUpdatingQuantity = false, isSelected = false, isSelectable = true, onToggleSelect }) => {
  const navigate = useNavigate();
  const quantity = Number(item.quantity || 1);
  const unitPrice = Number(item.finalPrice || 0);
  const [draftQuantity, setDraftQuantity] = useState(String(quantity));

  useEffect(() => {
    setDraftQuantity(String(quantity));
  }, [quantity]);

  const commitQuantity = (value) => {
    const nextQuantity = Number(value);
    const safeQuantity = Number.isFinite(nextQuantity) && nextQuantity >= 1 ? Math.floor(nextQuantity) : 1;
    setDraftQuantity(String(safeQuantity));
    onQuantityChange?.(safeQuantity);
  };

  const productDetailPath = item.productSlug ? `/products/${item.productSlug}` : '';

  const handleNavigateToProduct = () => {
    if (!productDetailPath) {
      return;
    }

    navigate(productDetailPath);
  };

  return (
    <article className={`cart-item-row${item.inStock === false ? ' unavailable' : ''}`}>
      <div className="cart-item-select-cell">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={!isSelectable}
          onChange={(event) => onToggleSelect?.(event.target.checked)}
          aria-label={`Chọn ${item.productName}`}
        />
      </div>

      <button type="button" className="cart-item-remove-icon-button" onClick={onRemove} disabled={isUpdatingQuantity} aria-label={`Xóa ${item.productName} khỏi giỏ hàng`}>
        <Trash2 size={14} />
      </button>

      <div className="cart-item-product">
        <div className="cart-item-row-image-wrap">
          {item.productImageUrl ? (
            <img className="cart-item-image" src={item.productImageUrl} alt={item.productName} />
          ) : (
            <div className="cart-item-image-placeholder">Không có hình ảnh</div>
          )}
        </div>

        <div className="cart-item-title-row">
          <div className="cart-item-info">
            {item.productSlug ? (
              <button type="button" className="cart-item-name-link" onClick={handleNavigateToProduct}>
                <h3 className="cart-item-name">{item.productName}</h3>
              </button>
            ) : (
              <h3 className="cart-item-name">{item.productName}</h3>
            )}
            <span className="cart-item-mobile-price">{formatCurrency(unitPrice)}</span>
            {item.inStock === false && <p className="cart-item-warning">Temporarily unavailable for checkout.</p>}
          </div>
        </div>
      </div>

      <div className="cart-item-column">
        <strong className="cart-item-column-value">{formatCurrency(unitPrice)}</strong>
      </div>

      <div className="cart-item-column cart-item-quantity-column">
        <input
          className="cart-quantity-input"
          type="number"
          min="1"
          step="1"
          value={draftQuantity}
          onChange={(event) => setDraftQuantity(event.target.value)}
          onBlur={(event) => commitQuantity(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitQuantity(event.currentTarget.value);
              event.currentTarget.blur();
            }
          }}
          disabled={isUpdatingQuantity}
          aria-label={`Số lượng của ${item.productName}`}
        />
      </div>
    </article>
  );
};
