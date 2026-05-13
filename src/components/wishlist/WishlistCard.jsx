import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import './WishlistCard.css';

const formatCurrency = (value) => Number(value || 0).toLocaleString();

export const WishlistCard = ({
  item,
  onRemove,
  onAddToCart,
  isAddingToCart
}) => {
  const navigate = useNavigate();
  const [isRemoving, setIsRemoving] = useState(false);

  const basePrice = Number(item.price || 0);
  const discountPrice = Number(item.discountPrice ?? item.finalPrice ?? 0) || 0;
  const hasDiscount = Boolean(item.hasDiscount ?? (discountPrice > 0 && discountPrice < basePrice));
  const displayPrice = hasDiscount ? discountPrice : basePrice;
  const discountLabel = hasDiscount && item.discountPercentage ? `${item.discountPercentage}% off` : 'Special price';

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove(item.productId);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleAddToCart = async () => {
    await onAddToCart(item.productId, item.productName);
  };

  const handleViewProduct = () => {
    navigate(`/products/${item.productSlug}`);
  };

  return (
    <article className="wishlist-card">
      <div className="wishlist-card-image-container">
        {item.headerImageUrl ? (
          <img
            src={item.headerImageUrl}
            alt={item.productName}
            className="wishlist-card-image"
          />
        ) : (
          <div className="wishlist-card-image-placeholder">No Image</div>
        )}
        {!item.isInStock && (
          <div className="wishlist-card-out-of-stock">Out of Stock</div>
        )}
      </div>

      <div className="wishlist-card-content">
        <h3 className="wishlist-card-name">{item.productName}</h3>

        <div className="wishlist-card-price">
          {hasDiscount ? (
            <>
              <span className="wishlist-card-original-price">{formatCurrency(item.price)}</span>
              <span className="wishlist-card-discount-price">{formatCurrency(displayPrice)}</span>
              <span className="wishlist-card-discount-badge">{discountLabel}</span>
            </>
          ) : (
            <span className="wishlist-card-price-value">{formatCurrency(item.price)}</span>
          )}
        </div>

        <div className="wishlist-card-stock">
          {item.isInStock ? (
            <span className="wishlist-card-stock-available">In Stock</span>
          ) : (
            <span className="wishlist-card-stock-unavailable">Out of Stock</span>
          )}
        </div>

        <div className="wishlist-card-actions">
          <Button
            onClick={handleAddToCart}
            disabled={!item.isInStock || isAddingToCart}
            fullWidth
            variant="primary"
          >
            {isAddingToCart ? 'Adding...' : 'Add to Cart'}
          </Button>
          <Button
            onClick={handleRemove}
            disabled={isRemoving}
            fullWidth
            variant="secondary"
          >
            {isRemoving ? 'Removing...' : 'Remove'}
          </Button>
        </div>
      </div>
    </article>
  );
};
