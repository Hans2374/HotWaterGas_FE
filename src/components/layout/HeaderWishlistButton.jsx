import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
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
      aria-label="Yêu thích"
      title="Yêu thích"
    >
      <Heart size={20} strokeWidth={1.75} />
    </button>
  );
};
