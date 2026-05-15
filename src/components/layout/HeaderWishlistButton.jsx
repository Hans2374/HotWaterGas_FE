import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const HeaderWishlistButton = () => {
  const navigate = useNavigate();
  const { token, isAdmin } = useAuth();

  if (!token || isAdmin) {
    return null;
  }

  const handleWishlistClick = () => {
    navigate('/wishlist');
  };

  return (
    <button
      onClick={handleWishlistClick}
      className="header-wishlist-button"
      aria-label="Xem danh sách yêu thích"
      title="Yêu thích"
    >
      <span className="header-wishlist-icon">♥</span>
      <span className="header-wishlist-label">Yêu thích</span>
    </button>
  );
};
