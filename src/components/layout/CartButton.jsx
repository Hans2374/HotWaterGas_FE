import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import './CartButton.css';

export const CartButton = () => {
  const navigate = useNavigate();
  const { cart } = useCart();

  const items = cart?.items;

  // Badge shows unique cart item count (number of different products)
  // NOT sum of quantities (that is for cart totals display)
  const uniqueItemCount = Array.isArray(items) ? items.length : 0;

  return (
    <button
      className="cart-button"
      onClick={() => navigate('/cart')}
      aria-label={`Shopping cart with ${uniqueItemCount} items`}
    >
      <span className="cart-button-icon">🛒</span>
      {uniqueItemCount > 0 && (
        <span className="cart-button-badge">{uniqueItemCount}</span>
      )}
    </button>
  );
};
