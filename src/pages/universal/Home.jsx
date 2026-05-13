import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProductGrid } from '../../components/product/ProductGrid';
import { Loader } from '../../components/common/Loader';
import { getProducts } from '../../api/productApi';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import './Home.css';

const normalizeProducts = (payload) => {
  const items = Array.isArray(payload?.data) ? payload.data : [];

  return items.map((product) => ({
    ...product,
    inStock: product?.inStock ?? product?.InStock ?? product?.isInStock ?? product?.IsInStock,
    isInStock: product?.isInStock ?? product?.IsInStock ?? product?.inStock ?? product?.InStock,
    slug: product?.slug || product?.Slug || product?.productSlug || product?.ProductSlug || '',
    productSlug: product?.productSlug || product?.ProductSlug || product?.slug || product?.Slug || ''
  }));
};

const getProductId = (product) => product?.id || product?.productId || product?.Id || product?.ProductId || '';

const isOutOfStock = (product) => {
  if (product?.inStock === false || product?.isInStock === false || product?.IsInStock === false || product?.InStock === false) {
    return true;
  }

  const stockValue = product?.stock ?? product?.Stock;
  return stockValue != null && Number(stockValue) <= 0;
};

export const Home = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logout, token } = useAuth();
  const { isWishlisted, addToWishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingWishlistProductIds, setPendingWishlistProductIds] = useState(new Set());
  const [pendingCartProductIds, setPendingCartProductIds] = useState(new Set());

  const categoryId = searchParams.get('categoryId');
  const searchQuery = searchParams.get('search');

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await getProducts(1, 36, categoryId, searchQuery);
        setProducts(normalizeProducts(response));
      } catch (apiError) {
        if (apiError.status === 401 && token) {
          logout();
          navigate('/login', { replace: true });
          return;
        }
        setError(apiError.message || 'Failed to load products.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [logout, navigate, token, categoryId, searchQuery]);

  const wishlistProductIds = useMemo(() => {
    const ids = new Set();
    products.forEach((product) => {
      const productId = getProductId(product);
      if (productId && isWishlisted(productId)) {
        ids.add(productId);
      }
    });
    return ids;
  }, [products, isWishlisted]);

  const handleToggleWishlist = useCallback(async (product) => {
    const productId = getProductId(product);
    if (!productId) {
      return;
    }

    if (!token) {
      navigate('/login', { replace: true });
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
      } else {
        await addToWishlist(productId);
      }
    } catch (apiError) {
      if (apiError?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      console.error('Wishlist action failed:', apiError);
    } finally {
      setPendingWishlistProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, [addToWishlist, isWishlisted, navigate, pendingWishlistProductIds, removeFromWishlist, token]);

  const handleViewAllProducts = useCallback(() => {
    navigate('/products/search', { replace: false });
  }, [navigate]);

  const handleAddToCart = useCallback(async (product) => {
    const productId = getProductId(product);
    if (!productId || isOutOfStock(product)) {
      return;
    }

    if (!token) {
      navigate('/login', { replace: true });
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
    } catch (apiError) {
      if (apiError?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      console.error('Add to cart failed:', apiError);
    } finally {
      setPendingCartProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, [addToCart, navigate, pendingCartProductIds, token]);

  return (
    <section className="home-header">
      <h2>Danh mục sản phẩm</h2>

      {isLoading && <Loader text="Đang tải sản phẩm..." />}

      {!isLoading && error && <p className="home-message home-error">{error}</p>}

      {!isLoading && !error && products.length === 0 && (
        <p className="home-message">
          {searchQuery ? 'Không tìm thấy sản phẩm phù hợp.' : 'Không có sản phẩm nào.'}
        </p>
      )}

      {!isLoading && !error && products.length > 0 && (
        <>
          <ProductGrid
            products={products}
            wishlistProductIds={wishlistProductIds}
            pendingWishlistProductIds={pendingWishlistProductIds}
            pendingCartProductIds={pendingCartProductIds}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            columns={4}
          />
          <div className="home-products-footer">
            <button
              type="button"
              className="home-view-all-btn"
              onClick={handleViewAllProducts}
            >
              Xem thêm
            </button>
          </div>
        </>
      )}
    </section>
  );
};
