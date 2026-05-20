import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import './CartButton.css';

export const CartButton = () => {
  const navigate = useNavigate();
  const { cart } = useCart();

  const items = cart?.items;

  const uniqueItemCount = Array.isArray(items) ? items.length : 0;

  return (
    <button
      className="cart-button"
      onClick={() => navigate('/cart')}
      aria-label={`Giỏ hàng (${uniqueItemCount} sản phẩm)`}
    >
      <ShoppingCart size={20} className="cart-button-icon" strokeWidth={1.75} />
      {uniqueItemCount > 0 && (
        <span className="cart-button-badge">{uniqueItemCount}</span>
      )}
    </button>
  );
};
