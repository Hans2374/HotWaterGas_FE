import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getProducts } from '../../api/productApi';
import { getCategories } from '../../api/categoriesApi';
import { getTags } from '../../api/tagsApi';
import { ProductGrid } from '../../components/product/ProductGrid';
import { TagFilterDropdown } from '../../components/common/TagFilterDropdown';
import { Loader } from '../../components/common/Loader';
import { ScrollToTop } from '../../components/common/ScrollToTop';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import { buildSearchQueryParams, parseFiltersFromSearchParams } from '../../utils/searchFilters';
import './SearchResultsPage.css';
import './EntityDetailPage.css';

const getProductId = (product) => product?.id || product?.productId || product?.Id || product?.ProductId || '';

const isOutOfStock = (product) => {
  if (product?.isInStock === false || product?.IsInStock === false) {
    return true;
  }

  const stockValue = product?.stock ?? product?.Stock;
  return stockValue != null && Number(stockValue) <= 0;
};

const defaultFilters = {
  category: '',
  tags: [],
  minPrice: '',
  maxPrice: ''
};

export const EntityDetailPage = ({
  entityId,
  entityType,
  title,
  intro,
  fetchEntityDetail
}) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { isWishlisted, addToWishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const [entity, setEntity] = useState(null);
  const [entityLoading, setEntityLoading] = useState(true);
  const [entityError, setEntityError] = useState('');

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filtersError, setFiltersError] = useState('');

  const [filters, setFilters] = useState(defaultFilters);
  const [priceDraft, setPriceDraft] = useState({ minPrice: '', maxPrice: '' });
  const [priceValidationError, setPriceValidationError] = useState('');

  const [pendingWishlistProductIds, setPendingWishlistProductIds] = useState(new Set());
  const [pendingCartProductIds, setPendingCartProductIds] = useState(new Set());

  const searchQuery = searchParams.get('q') || '';
  const sortBy = searchParams.get('sort') || 'name';
  const sortDirection = searchParams.get('direction') || 'asc';

  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const sortOptions = [
    { value: 'name-asc', label: 'A – Z', sort: 'name', direction: 'asc' },
    { value: 'name-desc', label: 'Z – A', sort: 'name', direction: 'desc' },
    { value: 'releasedate-desc', label: 'Mới nhất', sort: 'releasedate', direction: 'desc' },
    { value: 'releasedate-asc', label: 'Cũ nhất', sort: 'releasedate', direction: 'asc' },
    { value: 'price-asc', label: 'Giá thấp đến cao', sort: 'price', direction: 'asc' },
    { value: 'price-desc', label: 'Giá cao đến thấp', sort: 'price', direction: 'desc' }
  ];

  useEffect(() => {
    const parsedPage = Number(searchParams.get('page')) || 1;
    const parsedFilters = parseFiltersFromSearchParams(searchParams);
    setCurrentPage(parsedPage);
    setFilters(parsedFilters);
    setPriceDraft({ minPrice: parsedFilters.minPrice, maxPrice: parsedFilters.maxPrice });
  }, [searchParams]);

  useEffect(() => {
    const loadEntity = async () => {
      setEntityLoading(true);
      setEntityError('');

      try {
        const data = await fetchEntityDetail(entityId);
        setEntity(data || null);
      } catch (apiError) {
        setEntity(null);
        setEntityError(apiError.message || `Failed to load ${entityType.toLowerCase()} details.`);
      } finally {
        setEntityLoading(false);
      }
    };

    if (entityId) {
      loadEntity();
    }
  }, [entityId, entityType, fetchEntityDetail]);

  useEffect(() => {
    const fetchFilterLookups = async () => {
      setFiltersLoading(true);
      setFiltersError('');

      try {
        const [categoryData, tagData] = await Promise.all([getCategories(), getTags()]);
        setCategories(Array.isArray(categoryData) ? categoryData : []);
        setTags(Array.isArray(tagData) ? tagData : []);
      } catch (lookupError) {
        setFiltersError(lookupError.message || 'Failed to load filters.');
      } finally {
        setFiltersLoading(false);
      }
    };

    fetchFilterLookups();
  }, []);

  const selectedCategoryId = useMemo(() => {
    if (!filters.category) {
      return null;
    }

    return categories.find((category) => category.slug === filters.category)?.id || null;
  }, [categories, filters.category]);

  const selectedTagIds = useMemo(() => {
    if (!filters.tags.length) {
      return [];
    }

    const selectedTagSlugs = new Set(filters.tags);
    return tags.filter((tag) => selectedTagSlugs.has(tag.slug)).map((tag) => tag.id);
  }, [tags, filters.tags]);

  const updateUrlWithFilters = useCallback((nextFilters, nextPage = 1) => {
    const nextParams = buildSearchQueryParams({
      searchQuery,
      page: nextPage,
      sortBy,
      sortDirection,
      filters: nextFilters
    });

    setSearchParams(nextParams);
  }, [searchQuery, sortBy, sortDirection, setSearchParams]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!entityId) return;
      if ((filters.category || filters.tags.length > 0) && filtersLoading) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const requestFilters = {
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          tagIds: selectedTagIds,
          tagSlugs: filters.tags,
          tags: filters.tags,
          ...(entityType === 'Publisher' ? { publisherId: entityId } : { developerId: entityId })
        };

        const data = await getProducts(
          currentPage,
          itemsPerPage,
          selectedCategoryId,
          searchQuery || null,
          sortBy,
          sortDirection,
          requestFilters
        );

        setProducts(data.data || []);
        setTotalItems(data.totalItems || 0);
      } catch (err) {
        setError(err.message || 'Lỗi khi tải sản phẩm');
        setProducts([]);
        setTotalItems(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [entityId, entityType, currentPage, filters.category, filters.maxPrice, filters.minPrice, filters.tags, filtersLoading, searchQuery, selectedCategoryId, selectedTagIds, sortBy, sortDirection]);

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
    if (!productId) return;

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    if (pendingWishlistProductIds.has(productId)) return;

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
    } finally {
      setPendingWishlistProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, [addToWishlist, isWishlisted, navigate, pendingWishlistProductIds, removeFromWishlist, token]);

  const handleAddToCart = useCallback(async (product) => {
    const productId = getProductId(product);
    if (!productId || isOutOfStock(product)) return;

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    if (pendingCartProductIds.has(productId)) return;

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

  const handleSortChange = (event) => {
    const selectedOption = sortOptions.find((option) => option.value === event.target.value);
    if (!selectedOption) return;

    const nextParams = buildSearchQueryParams({
      searchQuery,
      page: 1,
      sortBy: selectedOption.sort,
      sortDirection: selectedOption.direction,
      filters
    });

    setSearchParams(nextParams);
    setCurrentPage(1);
  };

  const handleCategoryChange = (event) => {
    const nextFilters = { ...filters, category: event.target.value };
    setFilters(nextFilters);
    updateUrlWithFilters(nextFilters, 1);
    setCurrentPage(1);
  };

  const handleTagToggle = (tagSlug) => {
    const nextTags = filters.tags.includes(tagSlug)
      ? filters.tags.filter((slug) => slug !== tagSlug)
      : [...filters.tags, tagSlug];

    const nextFilters = { ...filters, tags: nextTags };
    setFilters(nextFilters);
    updateUrlWithFilters(nextFilters, 1);
    setCurrentPage(1);
  };

  const handleClearAllTags = () => {
    const nextFilters = { ...filters, tags: [] };
    setFilters(nextFilters);
    updateUrlWithFilters(nextFilters, 1);
    setCurrentPage(1);
  };

  const handlePriceDraftChange = (field, value) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setPriceDraft((prev) => ({ ...prev, [field]: sanitized }));
  };

  const applyPriceFilter = () => {
    const min = priceDraft.minPrice === '' ? '' : Number(priceDraft.minPrice);
    const max = priceDraft.maxPrice === '' ? '' : Number(priceDraft.maxPrice);

    if (min !== '' && min < 0) {
      setPriceValidationError('Minimum price must be greater than or equal to 0.');
      return;
    }

    if (max !== '' && min !== '' && max < min) {
      setPriceValidationError('Maximum price must be greater than or equal to minimum price.');
      return;
    }

    setPriceValidationError('');
    const nextFilters = {
      ...filters,
      minPrice: priceDraft.minPrice,
      maxPrice: priceDraft.maxPrice
    };

    setFilters(nextFilters);
    updateUrlWithFilters(nextFilters, 1);
    setCurrentPage(1);
  };

  const clearActiveFilters = () => {
    setPriceValidationError('');
    setPriceDraft({ minPrice: '', maxPrice: '' });
    setFilters(defaultFilters);

    const nextParams = buildSearchQueryParams({
      searchQuery,
      page: 1,
      sortBy,
      sortDirection,
      filters: defaultFilters
    });

    setSearchParams(nextParams);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateUrlWithFilters(filters, newPage);
      setCurrentPage(newPage);
      window.scrollTo(0, 0);
    }
  };

  const currentSortValue = `${sortBy}-${sortDirection}`;

  return (
    <>
      <ScrollToTop />
      <div className="search-results-page entity-detail-page">
        <section className="entity-hero-card">
          <div className="entity-hero-logo-wrap">
            {entity?.logoUrl ? (
              <img src={entity.logoUrl} alt={entity.name} className="entity-hero-logo" />
            ) : (
              <div className="entity-hero-logo entity-hero-logo--placeholder">{entityType[0]}</div>
            )}
          </div>
          <div className="entity-hero-content">
            <p className="entity-hero-eyebrow">{intro}</p>
            <h1 className="entity-hero-title">{entity?.name || title}</h1>
            <p className="entity-hero-description">
              {entity?.description || `${entityType} chưa có mô tả hiển thị.`}
            </p>
          </div>
        </section>

        <section className="search-results-header">
          <h2 className="search-results-title">{title}</h2>
          <p className="search-results-count">{totalItems} sản phẩm</p>
        </section>

        {(entityLoading || isLoading) && <Loader text="Đang tải dữ liệu..." />}
        {!entityLoading && entityError && <div className="search-error"><p>{entityError}</p></div>}

        {!entityLoading && !entityError && (
          <div className="search-results-layout">
            <aside className="search-filters-panel">
              <div className="search-filters-header">
                <h3>Bộ lọc</h3>
                {(filters.category || filters.tags.length > 0 || filters.minPrice || filters.maxPrice) && (
                  <button type="button" className="search-filters-clear" onClick={clearActiveFilters}>Xóa tất cả</button>
                )}
              </div>

              {filtersLoading && <p className="search-filters-loading">Đang tải bộ lọc...</p>}
              {!filtersLoading && filtersError && <p className="search-filters-error">{filtersError}</p>}

              <div className="search-filter-group search-filter-sort-group">
                <h4 className="search-filter-group-title">Sắp xếp theo</h4>
                <div className="search-filter-list">
                  {sortOptions.map((option) => (
                    <label className="search-filter-option" key={option.value}>
                      <input
                        type="radio"
                        name={`${entityType.toLowerCase()}-sort`}
                        value={option.value}
                        checked={currentSortValue === option.value}
                        onChange={handleSortChange}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="search-filter-group">
                <h4 className="search-filter-group-title">Danh mục</h4>
                {!filtersLoading && categories.length > 0 && (
                  <div className="search-filter-list">
                    <label className="search-filter-option" key="all-categories">
                      <input
                        type="radio"
                        name={`${entityType.toLowerCase()}-category`}
                        value=""
                        checked={!filters.category}
                        onChange={handleCategoryChange}
                      />
                      <span>Tất cả danh mục</span>
                    </label>
                    {categories.map((category) => (
                      <label className="search-filter-option" key={category.id}>
                        <input
                          type="radio"
                          name={`${entityType.toLowerCase()}-category`}
                          value={category.slug}
                          checked={filters.category === category.slug}
                          onChange={handleCategoryChange}
                        />
                        <span>{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="search-filter-group">
                <h4 className="search-filter-group-title">Tag</h4>
                {!filtersLoading && tags.length > 0 && (
                  <TagFilterDropdown
                    tags={tags}
                    selectedTagSlugs={filters.tags}
                    onTagToggle={handleTagToggle}
                    onClearAll={handleClearAllTags}
                  />
                )}
              </div>

              <div className="search-filter-group">
                <h4>Khoảng giá</h4>
                <div className="search-price-inputs">
                  <label htmlFor={`${entityType.toLowerCase()}-min-price`}>Tối thiểu</label>
                  <input
                    id={`${entityType.toLowerCase()}-min-price`}
                    type="text"
                    inputMode="numeric"
                    value={priceDraft.minPrice}
                    onChange={(event) => handlePriceDraftChange('minPrice', event.target.value)}
                    placeholder="0"
                  />

                  <label htmlFor={`${entityType.toLowerCase()}-max-price`}>Tối đa</label>
                  <input
                    id={`${entityType.toLowerCase()}-max-price`}
                    type="text"
                    inputMode="numeric"
                    value={priceDraft.maxPrice}
                    onChange={(event) => handlePriceDraftChange('maxPrice', event.target.value)}
                    placeholder="500000"
                  />
                </div>

                <button type="button" className="search-filter-apply" onClick={applyPriceFilter}>
                  Áp dụng giá
                </button>

                {priceValidationError && <p className="search-filters-error search-price-error">{priceValidationError}</p>}
              </div>
            </aside>

            <section className="search-results-main">
              {error && (
                <div className="search-error">
                  <p>{error}</p>
                </div>
              )}

              {!isLoading && !error && totalItems === 0 && (
                <div className="search-empty">
                  <p>Không có sản phẩm phù hợp với các bộ lọc được chọn.</p>
                </div>
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
                    columns={3}
                  />

                  {totalPages > 1 && (
                    <div className="search-pagination">
                      <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        ← 
                      </button>

                      <div className="pagination-numbers">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                       →
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
};
