import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import './CartButton.css';

export const CartButton = () => {
  const navigate = useNavigate();
  const { cart } = useCart();

  const itemCount = cart?.items?.length || 0;

  return (
    <button
      className="cart-button"
      onClick={() => navigate('/cart')}
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <span className="cart-button-icon">🛒</span>
      {itemCount > 0 && (
        <span className="cart-button-badge">{itemCount}</span>
      )}
    </button>
  );
};
