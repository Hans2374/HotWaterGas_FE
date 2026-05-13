import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const HeaderWishlistButton = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Hide for admin users
  if (isAdmin) {
    return null;
  }

  const handleWishlistClick = () => {
    navigate('/wishlist');
  };

  return (
    <button
      onClick={handleWishlistClick}
      className="header-wishlist-button"
      aria-label="View wishlist"
      title="View wishlist"
    >
      <span className="header-wishlist-icon">♥</span>
      <span className="header-wishlist-label">Wishlist</span>
    </button>
  );
};
