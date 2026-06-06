import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ProductGrid } from '../../components/product/ProductGrid';
import { CategoryGrid } from '../../components/category/CategoryGrid';
import { HeroBanner } from '../../components/hero/HeroBanner';
import { Loader } from '../../components/common/Loader';
import { ScrollToTop } from '../../components/common/ScrollToTop';
import { getProducts } from '../../api/productApi';
import { getHomepageCategories } from '../../api/categoriesApi';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import './Home.css';

const OAUTH_TOAST_KEY = 'hotwatergas.oauth.toast';

const consumeOAuthToast = () => {
  try {
    const stored = sessionStorage.getItem(OAUTH_TOAST_KEY);
    if (stored) {
      sessionStorage.removeItem(OAUTH_TOAST_KEY);
      const { type, message } = JSON.parse(stored);
      return { type, message };
    }
  } catch {
    // ignore
  }
  return null;
};

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
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

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

  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const data = await getHomepageCategories();
        setCategories(Array.isArray(data) ? data : []);
      } catch {
        // Non-critical — silently fail and hide section
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const oauthToast = consumeOAuthToast();
    if (oauthToast) {
      if (oauthToast.type === 'success') {
        toast.success(oauthToast.message);
      } else {
        toast.error(oauthToast.message);
      }
    }
  }, []);

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

  const handleViewAllCategories = useCallback(() => {
    navigate('/categories', { replace: false });
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
      toast.success('Đã thêm vào giỏ hàng');
    } catch (apiError) {
      if (apiError?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      toast.error('Không thể thêm vào giỏ hàng');
    } finally {
      setPendingCartProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, [addToCart, navigate, pendingCartProductIds, token]);

  return (
    <div className="home-page">
      <HeroBanner />

      <section className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">Steam Key Chính Hãng</h2>
          <button
            type="button"
            className="home-view-all-link"
            onClick={handleViewAllProducts}
            aria-label="Xem tất cả sản phẩm"
          >
            Xem tất cả
            <span className="home-view-all-arrow" aria-hidden>→</span>
          </button>
        </div>

        {isLoading && <Loader text="Đang tải sản phẩm..." />}

        {!isLoading && error && <p className="home-message home-error">{error}</p>}

        {!isLoading && !error && products.length === 0 && (
          <p className="home-message">
            {searchQuery ? 'Không tìm thấy sản phẩm phù hợp.' : 'Không có sản phẩm nào.'}
          </p>
        )}

        {!isLoading && !error && products.length > 0 && (
          <ProductGrid
            products={products}
            wishlistProductIds={wishlistProductIds}
            pendingWishlistProductIds={pendingWishlistProductIds}
            pendingCartProductIds={pendingCartProductIds}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            columns={4}
          />
        )}
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">Các Thể Loại Game Thịnh Hành</h2>
          <button
            type="button"
            className="home-view-all-link"
            onClick={handleViewAllCategories}
            aria-label="Xem tất cả danh mục"
          >
            Xem tất cả
            <span className="home-view-all-arrow" aria-hidden>→</span>
          </button>
        </div>

        {categoriesLoading && <Loader text="Đang tải danh mục..." />}

        {!categoriesLoading && categories.length > 0 && (
          <CategoryGrid categories={categories} />
        )}
      </section>

      <ScrollToTop />
    </div>
  );
};
