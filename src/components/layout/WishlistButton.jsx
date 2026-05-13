import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import './WishlistButton.css';

export const WishlistButton = ({ productId, variant = 'default' }) => {
  const navigate = useNavigate();
  const { token, isAdmin } = useAuth();
  const { isWishlisted, addToWishlist, removeFromWishlist } = useWishlist();
  const [isMutating, setIsMutating] = useState(false);
  const [message, setMessage] = useState('');

  // Hide for admin users
  if (isAdmin) {
    return null;
  }

  const isInWishlist = isWishlisted(productId);

  const handleToggleWishlist = async (event) => {
    event.stopPropagation();

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    setIsMutating(true);
    setMessage('');

    try {
      if (isInWishlist) {
        await removeFromWishlist(productId);
        setMessage('Removed from wishlist.');
      } else {
        await addToWishlist(productId);
        setMessage('Added to wishlist.');
      }
    } catch (error) {
      if (error.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      setMessage(error.message || 'Failed to update wishlist.');
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className={`wishlist-button-container wishlist-button-${variant}`}>
      <button
        className={`wishlist-button ${isInWishlist ? 'is-wishlisted' : ''}`}
        onClick={handleToggleWishlist}
        disabled={isMutating}
        aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <span className="wishlist-heart">♥</span>
      </button>
      {message && <span className="wishlist-message">{message}</span>}
    </div>
  );
};
