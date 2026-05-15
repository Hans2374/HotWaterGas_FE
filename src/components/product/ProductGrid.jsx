import React from 'react';
import { ProductCard } from './ProductCard';
import './ProductGrid.css';

const getProductId = (product) => product?.id || product?.productId || product?.Id || product?.ProductId || '';

const isOutOfStock = (product) => {
  // Canonical check: inStock is the authoritative field from backend
  if (product?.inStock === false) {
    return true;
  }

  // Legacy fallback checks (for other API sources that may use these)
  if (product?.isInStock === false || product?.IsInStock === false || product?.InStock === false) {
    return true;
  }

  // Legacy fallback: stock count (only if explicitly provided)
  const stockValue = product?.stock ?? product?.Stock;
  return stockValue != null && Number(stockValue) <= 0;
};

export const ProductGrid = ({
  products,
  wishlistProductIds = new Set(),
  pendingWishlistProductIds = new Set(),
  pendingCartProductIds = new Set(),
  onToggleWishlist,
  onAddToCart
}) => {
  return (
    <section className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={getProductId(product) || product.name}
          product={product}
          isWishlisted={wishlistProductIds.has(getProductId(product))}
          isWishlistPending={pendingWishlistProductIds.has(getProductId(product))}
          isCartPending={pendingCartProductIds.has(getProductId(product))}
          isOutOfStock={isOutOfStock(product)}
          onToggleWishlist={onToggleWishlist}
          onAddToCart={onAddToCart}
        />
      ))}
    </section>
  );
};
