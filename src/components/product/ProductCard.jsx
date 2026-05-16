import React, { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductCard.css';

const formatCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return '0';
  }

  return amount.toLocaleString();
};

const HeartIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="product-action-icon">
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="product-action-icon">
    <path
      d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L22 7H7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="19" r="1.6" fill="currentColor" />
    <circle cx="18" cy="19" r="1.6" fill="currentColor" />
  </svg>
);

const MAX_ROTATE_X = 8;
const MAX_ROTATE_Y = 10;
const LIFT_TRANSITION_MS = 200;
const TILT_TRANSITION_MS = 0;
const GLOW_TRANSITION_MS = 200;
const OVERLAY_TRANSITION_MS = 60;
const IS_MOBILE_QUERY = '(hover: none), (pointer: coarse)';

export const ProductCard = ({
  product,
  isWishlisted = false,
  isWishlistPending = false,
  isCartPending = false,
  isOutOfStock = false,
  onToggleWishlist,
  onAddToCart
}) => {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const rafRef = useRef(null);
  const prefersNoHover = useRef(false);

  const basePrice = Number(product.price || 0);
  const discountPrice = Number(product.discountPrice ?? product.finalPrice ?? 0) || 0;
  const hasDiscount = Boolean(product.discountPercentage || (discountPrice > 0 && discountPrice < basePrice));
  const finalPrice = Number(product.finalPrice ?? discountPrice ?? basePrice) || basePrice;
  const discountBadge = hasDiscount && product.discountPercentage != null
    ? `-${Number(product.discountPercentage)}%`
    : null;
  const productSlug = product.slug || product.productSlug || product.Slug || product.ProductSlug || '';
  const cardClassName = `product-card${productSlug ? ' is-clickable' : ''}${isOutOfStock ? ' is-out-of-stock' : ''}${prefersNoHover.current ? ' prefers-no-hover' : ''}`;

  const handleNavigateToDetail = () => {
    if (!productSlug) return;
    navigate(`/products/${productSlug}`);
  };

  const handleCardKeyDown = (event) => {
    if (!productSlug) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigateToDetail();
    }
  };

  const applyTilt = useCallback((clientX, clientY) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const normX = (clientX - centerX) / (rect.width / 2);
    const normY = (clientY - centerY) / (rect.height / 2);

    const rotateY = normX * MAX_ROTATE_Y;
    const rotateX = normY * -MAX_ROTATE_X;
    const glowX = ((clientX - rect.left) / rect.width) * 100;
    const glowY = ((clientY - rect.top) / rect.height) * 100;

    card.style.setProperty('--tilt-rotate-x', `${rotateX}deg`);
    card.style.setProperty('--tilt-rotate-y', `${rotateY}deg`);
    card.style.setProperty('--glow-origin-x', `${glowX}%`);
    card.style.setProperty('--glow-origin-y', `${glowY}%`);
  }, []);

  const handleMouseMove = useCallback((event) => {
    if (prefersNoHover.current) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      applyTilt(event.clientX, event.clientY);
    });
  }, [applyTilt]);

  const handleMouseEnter = useCallback(() => {
    if (prefersNoHover.current) return;
    const card = cardRef.current;
    if (!card) return;
    card.classList.add('is-tilted');
    card.style.transition = `transform ${TILT_TRANSITION_MS}ms ease-out, box-shadow ${GLOW_TRANSITION_MS}ms ease-out`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove('is-tilted');
    card.style.setProperty('--tilt-rotate-x', '0deg');
    card.style.setProperty('--tilt-rotate-y', '0deg');
    card.style.setProperty('--glow-origin-x', '50%');
    card.style.setProperty('--glow-origin-y', '50%');
    card.style.transition = `transform ${LIFT_TRANSITION_MS}ms ease-out, box-shadow ${GLOW_TRANSITION_MS}ms ease-out`;
  }, []);

  const handleButtonMouseDown = useCallback((event) => {
    event.stopPropagation();
  }, []);

  return (
    <article
      ref={cardRef}
      className={cardClassName}
      style={{
        '--tilt-rotate-x': '0deg',
        '--tilt-rotate-y': '0deg',
        '--glow-origin-x': '50%',
        '--glow-origin-y': '50%',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role={productSlug ? 'link' : undefined}
      tabIndex={productSlug ? 0 : undefined}
      onClick={handleNavigateToDetail}
      onKeyDown={handleCardKeyDown}
    >
      <div className="product-card-image-wrap">
        <button
          type="button"
          className={`product-action product-action-wishlist${isWishlisted ? ' is-active' : ''}`}
          aria-label={isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
          disabled={isWishlistPending}
          onMouseDown={handleButtonMouseDown}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleWishlist?.(product);
          }}
        >
          <HeartIcon active={isWishlisted} />
        </button>

        {product.primaryImageUrl ? (
          <img className="product-card-image" src={product.primaryImageUrl} alt={product.name} />
        ) : (
          <div className="product-card-image-placeholder">Không có hình ảnh</div>
        )}

        {isOutOfStock && (
          <div className="product-card-out-of-stock-overlay" aria-hidden="true">
            <span>Hết hàng</span>
          </div>
        )}
      </div>
      <h3 className="product-name">{product.name}</h3>
      <div className="product-price-band">
        <div className="product-price-row">
          {discountBadge && <span className="product-discount-badge">{discountBadge}</span>}
        </div>
        <div className="product-price-stack">
          <span className="product-original-price">{formatCurrency(basePrice)} ₫</span>
          <strong className="product-final-price">{formatCurrency(finalPrice)} ₫</strong>
        </div>

        <button
          type="button"
          className="product-action product-action-cart"
          aria-label="Thêm vào giỏ hàng"
          disabled={isCartPending || isOutOfStock}
          title={isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
          onMouseDown={handleButtonMouseDown}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onAddToCart?.(product);
          }}
        >
          <CartIcon />
        </button>
      </div>
    </article>
  );
};
