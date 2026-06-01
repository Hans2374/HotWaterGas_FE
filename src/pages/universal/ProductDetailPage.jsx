import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader } from "../../components/common/Loader";
import { ReviewSection } from "../../components/product/ReviewSection";
import { ProductCard } from "../../components/product/ProductCard";
import { ProductImageGallery } from "../../components/product/ProductImageGallery";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../hooks/useWishlist";
import {
  getProductDetailBySlug,
  getProductRecommendations,
} from "../../api/productApi";
import { getCategories } from "../../api/categoriesApi";
import { formatCurrency } from "../../utils/formatters";
import { buildSearchQueryParams } from "../../utils/searchFilters";
import "./ProductDetailPage.css";

const getProductId = (product) => product?.id || "";

const normalizeRequirementSpec = (requirements) => {
  if (!requirements || typeof requirements !== "object") {
    return {
      os: "",
      processor: "",
      memory: "",
      graphics: "",
      storage: "",
      notes: "",
    };
  }

  const map = Object.keys(requirements).reduce((acc, key) => {
    acc[key.toLowerCase()] = requirements[key];
    return acc;
  }, {});

  const safe = (v) => (v === null || v === undefined ? "" : String(v));

  return {
    os: safe(
      map.os ||
        map["oS"] ||
        map["os"] ||
        map["operatingsystem"] ||
        map["minimumos"],
    ),
    processor: safe(map.processor || map.cpu || ""),
    memory: safe(map.memory || map.ram || ""),
    graphics: safe(map.graphics || map.gpu || ""),
    storage: safe(map.storage || ""),
    notes: safe(map.notes || ""),
  };
};

const requirementRows = (requirements) => {
  const r = normalizeRequirementSpec(requirements);
  return [
    { label: "HĐH", value: r.os },
    { label: "Bộ xử lý", value: r.processor },
    { label: "Bộ nhớ", value: r.memory },
    { label: "Card đồ họa", value: r.graphics },
    { label: "Bộ nhớ lưu trữ", value: r.storage },
    { label: "Ghi chú", value: r.notes },
  ];
};

const hasAnyRequirement = (requirements) =>
  requirementRows(requirements).some(
    (row) => (row.value || "").toString().trim() !== "",
  );

const slugifyCategoryName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addToCart } = useCart();
  const {
    isWishlisted,
    addToWishlist,
    removeFromWishlist,
    wishlist: wishlistItems = [],
  } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isWishlistPending, setIsWishlistPending] = useState(false);
  const [isCartPending, setIsCartPending] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");
  const [catalogCategories, setCatalogCategories] = useState([]);

  const fetchProduct = useCallback(async () => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setNotFound(false);

    try {
      const data = await getProductDetailBySlug(slug);
      // console.log("[ProductDetailPage] API Response:", {
      //   soldCount: data?.soldCount,
      //   systemRequirements: data?.systemRequirements,
      //   minimum: data?.systemRequirements?.minimum,
      //   recommended: data?.systemRequirements?.recommended,
      //   fullProduct: data,
      // });
      // console.log("[ProductDetailPage] Data fields check:", {
      //   hasSoldCount: "soldCount" in (data || {}),
      //   hasSystemRequirements: "systemRequirements" in (data || {}),
      //   minimumKeys: data?.systemRequirements?.minimum
      //     ? Object.keys(data.systemRequirements.minimum)
      //     : [],
      //   recommendedKeys: data?.systemRequirements?.recommended
      //     ? Object.keys(data.systemRequirements.recommended)
      //     : [],
      // });
      setProduct(data);
      setQuantity(1);
    } catch (apiError) {
      if (apiError.status === 404) {
        setNotFound(true);
      } else {
        setError(apiError.message || 'Không thể tải chi tiết sản phẩm.');
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const result = await getCategories();
        if (!active) {
          return;
        }

        const nextCategories = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : [];

        setCatalogCategories(nextCategories);
      } catch (loadError) {
        // eslint-disable-next-line no-console
        console.warn("[RecommendedProducts] Failed to load categories", loadError);
      }
    };

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  const productId = getProductId(product);
  const wishlisted = productId ? isWishlisted(productId) : false;
  const hasStock = Boolean(product?.hasStock);

  const wishlistProductIds = React.useMemo(
    () => new Set((wishlistItems || []).map((i) => i.productId)),
    [wishlistItems],
  );

  // Recommendation fetch: separate lifecycle from product detail
  useEffect(() => {
    let active = true;

    const fetchRecommendations = async () => {
      if (!productId) {
        setRecommendedProducts([]);
        return;
      }

      setRecommendationsLoading(true);
      setRecommendationsError("");

      // Log start
      // eslint-disable-next-line no-console
      // console.log(
      //   `[Recommendations] Fetching recommendations for product ${productId}`,
      // );

      try {
        const recs = await getProductRecommendations(productId, 4);
        if (!active) return;
        setRecommendedProducts(recs || []);
        // eslint-disable-next-line no-console
        // console.log(
        //   `[Recommendations] Loaded ${recs?.length || 0} recommendations`,
        // );
      } catch (err) {
        if (!active) return;
        setRecommendationsError(
          err?.message || "Failed to load recommendations",
        );
        // eslint-disable-next-line no-console
        console.error("[Recommendations] Failed to load recommendations", err);
      } finally {
        if (!active) return;
        setRecommendationsLoading(false);
      }
    };

    // Fetch after product available; do not block main render
    fetchRecommendations();

    return () => {
      active = false;
    };
  }, [productId]);

  const handleToggleWishlist = useCallback(async () => {
    if (!productId || isWishlistPending) {
      return;
    }

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setIsWishlistPending(true);
    try {
      if (wishlisted) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId);
      }
    } catch (apiError) {
      if (apiError?.status === 401) {
        navigate("/login", { replace: true });
      } else {
        console.error("Wishlist action failed:", apiError);
      }
    } finally {
      setIsWishlistPending(false);
    }
  }, [
    addToWishlist,
    isWishlistPending,
    navigate,
    productId,
    removeFromWishlist,
    token,
    wishlisted,
  ]);

  const handleAddToCart = useCallback(async () => {
    if (!productId || isCartPending || !hasStock) {
      return;
    }

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setIsCartPending(true);
    try {
      await addToCart(productId, quantity);
      toast.success("Đã thêm vào giỏ hàng");
    } catch (apiError) {
      if (apiError?.status === 401) {
        navigate("/login", { replace: true });
      } else {
        toast.error("Không thể thêm vào giỏ hàng");
      }
    } finally {
      setIsCartPending(false);
    }
  }, [
    addToCart,
    hasStock,
    isCartPending,
    navigate,
    productId,
    quantity,
    token,
  ]);

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const onQuantityChange = (event) => {
    const next = Number(event.target.value);
    if (Number.isNaN(next) || next < 1) {
      setQuantity(1);
      return;
    }
    setQuantity(next);
  };

  const handleRatingUpdate = useCallback((averageRating, totalReviews) => {
    setProduct((prev) => ({
      ...(prev || {}),
      rating: averageRating,
      totalReviews,
    }));
  }, []);

  const handleViewMoreRecommended = useCallback(() => {
    if (!product) {
      return;
    }

    // Resolve category slug from the current product (prefer catalog match by id)
    const firstCategory = Array.isArray(product.categories) && product.categories.length > 0
      ? product.categories[0]
      : null;

    const categorySlug = firstCategory?.slug
      || catalogCategories.find((category) => category.id === firstCategory?.id)?.slug
      || slugifyCategoryName(firstCategory?.name);

    // Build filter object with category only
    const filters = {
      category: categorySlug || '',
    };

    // Build search query params using centralized utility
    const searchParams = buildSearchQueryParams({
      searchQuery: '',
      page: 1,
      sortBy: 'name',
      sortDirection: 'asc',
      filters,
    });

    const searchUrl = `/products/search?${searchParams.toString()}`;

    // Debug log
    // eslint-disable-next-line no-console
    // console.log('[RecommendedProducts] Navigate to search with filters:', {
    //   productName: product?.name,
    //   categoryId: firstCategory?.id,
    //   categorySlug,
    //   filters,
    //   searchUrl,
    // });

    // Navigate using SPA router
    navigate(searchUrl);
  }, [catalogCategories, navigate, product]);


  if (loading) {
    return (
      <div className="product-detail-loading">
        <Loader text="Loading product details..." />
      </div>
    );
  }

  if (notFound) {
    return (
      <section className="product-detail-state">
        <h2>Product not found</h2>
        <p>
          The product you are looking for does not exist or is no longer
          available.
        </p>
        <button
          type="button"
          className="product-detail-link-btn"
          onClick={() => navigate("/")}
        >
          Back to homepage
        </button>
      </section>
    );
  }

  if (error) {
    return (
      <section className="product-detail-state">
        <h2>Unable to load product</h2>
        <p>{error}</p>
        <div className="product-detail-state-actions">
          <button
            type="button"
            className="product-detail-link-btn"
            onClick={fetchProduct}
          >
            Retry
          </button>
          <button
            type="button"
            className="product-detail-link-btn ghost"
            onClick={() => navigate("/")}
          >
            Back
          </button>
        </div>
      </section>
    );
  }

  if (!product) {
    return null;
  }

  const minimumRows = requirementRows(product.systemRequirements?.minimum);
  const recommendedRows = requirementRows(
    product.systemRequirements?.recommended,
  );
  // DEBUG: render-time check
  // eslint-disable-next-line no-console
  // console.log(
  //   "[ProductDetail] Render systemRequirements:",
  //   product.systemRequirements,
  // );
  const hasMinimum = hasAnyRequirement(product.systemRequirements?.minimum);
  const hasRecommended = hasAnyRequirement(
    product.systemRequirements?.recommended,
  );

  return (
    <div className="product-detail-page">
      <section className="product-detail-hero">
          <div className="product-detail-gallery">
            <ProductImageGallery
              images={product.images || []}
              productName={product.name}
            />
          </div>

          <aside className="product-detail-purchase">
            <h1>{product.name}</h1>
            <p className="product-detail-subtitle">
              {product.subtitle || "Nhà phát hành không xác định"}
            </p>

            <div className="product-detail-rating-row">
              <span className="product-detail-rating">
                ★ {Number(product.rating || 0).toFixed(1)}/5
              </span>
              <span className="product-detail-dot" aria-hidden>
                •
              </span>
              <span className="product-detail-sold">
                ({Number(product.soldCount || 0).toLocaleString()} đã bán)
              </span>
            </div>

            {(product.categories?.length > 0 || product.tags?.length > 0) && (
              <div className="product-detail-pills">
                <span className="product-detail-label">Thể loại:</span>
                {(product.categories || []).map((category) => (
                  <span
                    className="product-pill category"
                    key={`category-${category.id}`}
                  >
                    {category.name}
                  </span>
                ))}
                {(product.tags || []).map((tag) => (
                  <span className="product-pill tag" key={`tag-${tag.id}`}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            <div className="product-detail-stock-row">
              <span className="product-detail-label">Tình trạng:</span>
              <div
                className={`product-stock-badge ${hasStock ? "in-stock" : "out-of-stock"}`}
              >
                {hasStock ? "Còn hàng" : "Hết hàng"}
              </div>
            </div>

            <div className="product-detail-price-block">
              {product.price?.hasDiscount && (
                <div className="product-detail-discount-row">
                  <span className="product-detail-base-price">
                    {formatCurrency(product.price.basePrice)}
                  </span>
                  <span className="product-detail-discount-badge">
                    -{Number(product.price.discountPercentage || 0)}%
                  </span>
                </div>
              )}
              <div className="product-detail-final-price">
                {formatCurrency(
                  product.price?.finalPrice ?? product.price?.basePrice ?? 0,
                )}
              </div>
            </div>

            <div className="product-detail-quantity">
              <span>Số lượng mua: </span>
              <div className="quantity-stepper">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={onQuantityChange}
                />
                <button
                  type="button"
                  onClick={increaseQuantity}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <div className="product-detail-cta-row">
              <button
                type="button"
                className="product-detail-add-cart"
                onClick={handleAddToCart}
                disabled={!hasStock || isCartPending}
              >
                {isCartPending ? "Đang thêm..." : "Thêm vào giỏ hàng"}
              </button>
              <button
                type="button"
                className={`product-detail-add-wishlist${wishlisted ? " active" : ""}`}
                onClick={handleToggleWishlist}
                disabled={isWishlistPending}
              >
                {wishlisted ? "♥ Trong yêu thích" : "♡ Thêm yêu thích"}
              </button>
            </div>
          </aside>
        </section>

        <section className="product-detail-section">
          <h2>Về game này</h2>
          <p className="product-detail-description">
            {product.description || "Không có mô tả nào được cung cấp."}
          </p>
        </section>

        <section className="product-detail-section">
          <h2>Yêu cầu</h2>
          <div className="requirements-grid">
            <article className="requirement-card">
              <h3>Tối thiểu</h3>
              {hasMinimum ? (
                <dl>
                  {minimumRows
                    .filter((row) => row.value.trim() !== "")
                    .map((row) => (
                      <div key={row.label} className="requirement-row">
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="requirements-empty">
                  Không có yêu cầu tối thiểu được cung cấp.
                </p>
              )}
            </article>

            <article className="requirement-card">
              <h3>Khuyến nghị</h3>
              {hasRecommended ? (
                <dl>
                  {recommendedRows
                    .filter((row) => row.value.trim() !== "")
                    .map((row) => (
                      <div key={row.label} className="requirement-row">
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="requirements-empty">
                  Không có yêu cầu khuyến nghị được cung cấp.
                </p>
              )}
            </article>
          </div>
        </section>

        <ReviewSection
          productId={productId}
          productRating={product.rating}
          productName={product.name}
          onRatingUpdate={handleRatingUpdate}
        />

        {/* Recommendations: show only when available or loading. Hide silently on error or empty. */}
        {recommendationsLoading && (
          <section className="product-detail-section">
            <div className="product-detail-section-header">
              <h2>Sản phẩm tương tự</h2>
            </div>
            <div className="product-grid">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="product-card product-card-skeleton" />
              ))}
            </div>
          </section>
        )}

        {!recommendationsLoading &&
          Array.isArray(recommendedProducts) &&
          recommendedProducts.length > 0 && (
            <section className="product-detail-section">
              <div className="product-detail-section-header">
                <h2>Sản phẩm tương tự</h2>
                <button
                  type="button"
                  className="product-detail-view-all-link"
                  onClick={handleViewMoreRecommended}
                  aria-label="Xem tất cả sản phẩm tương tự"
                >
                  Xem tất cả
                  <span className="product-detail-view-all-arrow" aria-hidden>→</span>
                </button>
              </div>
              <div className="product-grid">
                {recommendedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isWishlisted={wishlistProductIds.has(p.id)}
                    isWishlistPending={false}
                    isCartPending={false}
                    isOutOfStock={p.inStock === false}
                    onToggleWishlist={async (prod) => {
                      const pid = prod?.id || prod?.productId;
                      if (!pid) return;
                      if (!token) {
                        navigate("/login", { replace: true });
                        return;
                      }

                      try {
                        if (isWishlisted(pid)) {
                          await removeFromWishlist(pid);
                        } else {
                          await addToWishlist(pid);
                        }
                      } catch (e) {
                        // fail silently
                        // eslint-disable-next-line no-console
                        console.error(
                          "[Recommendations] Wishlist action failed",
                          e,
                        );
                      }
                    }}
                    onAddToCart={async (prod) => {
                      const pid = prod?.id || prod?.productId;
                      if (!pid) return;
                      if (!token) {
                        navigate("/login", { replace: true });
                        return;
                      }

                      try {
                        await addToCart(pid, 1);
                        toast.success("Đã thêm vào giỏ hàng");
                      } catch (e) {
                        toast.error("Không thể thêm vào giỏ hàng");
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          )}
      </div>
  );
};
