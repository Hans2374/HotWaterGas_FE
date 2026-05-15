import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ProductGrid } from '../../components/product/ProductGrid';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import './WishlistPage.css';

const getProductId = (item) => item?.productId || item?.id || '';

const isOutOfStock = (item) => {
  // Canonical check: inStock is the authoritative field from backend
  if (item?.inStock === false) {
    return true;
  }

  // Legacy fallback checks (for other API sources that may use these)
  if (item?.isInStock === false || item?.IsInStock === false) {
    return true;
  }

  // Legacy fallback: stock count (only if explicitly provided)
  const stockValue = item?.stock ?? item?.Stock;
  return stockValue != null && Number(stockValue) <= 0;
};

export const WishlistPage = () => {
  const navigate = useNavigate();
  const { wishlist, isLoading, refreshWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  const { addToCart } = useCart();
  const [pageError, setPageError] = useState('');
  const [pendingWishlistProductIds, setPendingWishlistProductIds] = useState(new Set());
  const [pendingCartProductIds, setPendingCartProductIds] = useState(new Set());

  useEffect(() => {
    refreshWishlist().catch((error) => {
      if (error.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      setPageError(error.message || 'Không thể tải yêu thích.');
    });
  }, [navigate, refreshWishlist]);

  const transformedProducts = useMemo(() => {
    return wishlist.map((item) => ({
      id: item.productId,
      productId: item.productId,
      name: item.productName,
      slug: item.productSlug,
      price: item.price,
      finalPrice: item.finalPrice ?? item.discountPrice ?? item.price,
      discountPrice: item.discountPrice,
      discountPercentage: item.discountPercentage,
      primaryImageUrl: item.headerImageUrl,
      // Canonical stock field from backend
      inStock: item.inStock
    }));
  }, [wishlist]);

  const wishlistProductIds = useMemo(() => {
    const ids = new Set();
    transformedProducts.forEach((product) => {
      const productId = getProductId(product);
      if (productId) {
        ids.add(productId);
      }
    });
    return ids;
  }, [transformedProducts]);

  const handleToggleWishlist = useCallback(async (product) => {
    const productId = getProductId(product);
    if (!productId) {
      return;
    }

    if (pendingWishlistProductIds.has(productId)) {
      return;
    }

    setPendingWishlistProductIds((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });

    try {
      if (isWishlisted(productId)) {
        await removeFromWishlist(productId);
      }
      setPageError('');
    } catch (apiError) {
      if (apiError?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      setPageError(apiError.message || 'Không thể xóa khỏi yêu thích.');
    } finally {
      setPendingWishlistProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, [isWishlisted, navigate, pendingWishlistProductIds, removeFromWishlist]);

  const handleAddToCart = useCallback(async (product) => {
    const productId = getProductId(product);
    if (!productId || isOutOfStock(product)) {
      return;
    }

    if (pendingCartProductIds.has(productId)) {
      return;
    }

    setPendingCartProductIds((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });

    try {
      await addToCart(productId, 1);
      setPageError('');
      toast.success('Đã thêm vào giỏ hàng');
    } catch (apiError) {
      if (apiError?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      setPageError(apiError.message || 'Không thể thêm vào giỏ hàng.');
      toast.error('Không thể thêm vào giỏ hàng');
    } finally {
      setPendingCartProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, [addToCart, navigate, pendingCartProductIds]);

  const handleViewProducts = () => {
    navigate('/');
  };

  return (
    <div className="wishlist-page">
      <section className="wishlist-header">
        <h2>Yêu thích của tôi</h2>
        {wishlist.length === 0 && !isLoading && (
          <p className="wishlist-header-subtitle">Yêu thích của bạn trống. Tiếp tục mua sắm!</p>
        )}
        {wishlist.length > 0 && (
          <p className="wishlist-header-subtitle">{wishlist.length} mục trong yêu thích của bạn</p>
        )}
      </section>

      {pageError && <p className="wishlist-error">{pageError}</p>}

      {isLoading && <Loader text="Đang tải yêu thích..." />}

      {!isLoading && wishlist.length === 0 && (
        <section className="wishlist-empty-state">
          <div className="wishlist-empty-content">
            <h3>Chưa có gì ở đây</h3>
            <p>Các mục bạn thêm vào yêu thích sẽ xuất hiện ở đây.</p>
            <Button onClick={handleViewProducts} variant="primary">
              Tiếp tục mua sắm
            </Button>
          </div>
        </section>
      )}

      {!isLoading && wishlist.length > 0 && (
        <ProductGrid
          products={transformedProducts}
          wishlistProductIds={wishlistProductIds}
          pendingWishlistProductIds={pendingWishlistProductIds}
          pendingCartProductIds={pendingCartProductIds}
          onToggleWishlist={handleToggleWishlist}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
};
