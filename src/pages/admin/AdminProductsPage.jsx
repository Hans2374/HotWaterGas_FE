import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Pencil, RotateCcw, Trash2, Search, X } from 'lucide-react';
import { getAdminProductsFiltered, disableAdminProduct, restoreAdminProduct, hardDeleteAdminProduct, getCategories } from '../../services/productService';
import './AdminProductsPage.css';

const formatCurrency = (value) => Number(value || 0).toLocaleString();

const renderPriceCell = (product) => {
  const basePrice = Number(product.price || 0);
  const discountPrice = Number(product.discountPrice ?? product.finalPrice ?? 0) || 0;
  const hasDiscount = Boolean(product.hasDiscount ?? (discountPrice > 0 && discountPrice < basePrice));

  if (hasDiscount) {
    return (
      <span className="price-cell">
        <span className="price-original">{formatCurrency(basePrice)}</span>
        <span className="price-arrow">→</span>
        <span className="price-discount">{formatCurrency(discountPrice)}</span>
      </span>
    );
  }

  return <span className="price-cell">{formatCurrency(basePrice)}</span>;
};

const formatUpdatedAt = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getStockStatus = (stock) => {
  const numericStock = Number(stock ?? 0);
  if (numericStock === 0) return 'out-of-stock';
  if (numericStock <= 5) return 'low-stock';
  return 'in-stock';
};

const StockBadge = ({ stock }) => {
  const status = getStockStatus(stock);
  const label = status === 'out-of-stock' ? 'Out of Stock' : status === 'low-stock' ? 'Low Stock' : 'In Stock';
  return <span className={`stock-badge ${status}`}>{label}</span>;
};

const ProductStatusBadge = ({ isDeleted }) => (
  <span className={`status-badge ${isDeleted ? 'disabled' : 'available'}`}>
    {isDeleted ? 'Disabled' : 'Available'}
  </span>
);

export const AdminProductsPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    stockState: '',
    categoryId: ''
  });

  const [actionTarget, setActionTarget] = useState(null);
  const [isActioning, setIsActioning] = useState(false);
  const [actionType, setActionType] = useState('');

  // Client-side filter helpers
  const applyClientFilters = (items) => {
    let result = [...items];

    if (filters.status) {
      if (filters.status === 'available') {
        result = result.filter(product => !product.isDeleted);
      } else if (filters.status === 'disabled') {
        result = result.filter(product => product.isDeleted);
      }
    }

    if (filters.stockState) {
      result = result.filter((product) => {
        const stock = Number(product.availableSteamKeyCount ?? product.stock ?? 0);
        return getStockStatus(stock) === filters.stockState;
      });
    }

    return result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  };

  const filteredProducts = applyClientFilters(products);

  const loadProducts = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const result = await getAdminProductsFiltered({
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined
      });
      setProducts(Array.isArray(result) ? result : []);
    } catch (err) {
      setLoadError(err.message || 'Failed to load products.');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const result = await getCategories();
      setCategories(result || []);
    } catch {
      // non-critical, keep empty
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [filters.search, filters.categoryId]);

  useEffect(() => {
    loadCategories();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ search: '', status: '', stockState: '', categoryId: '' });
  };

  const openDisableConfirm = (product) => {
    setActionTarget(product);
    setActionType('disable');
  };

  const openRestoreConfirm = (product) => {
    setActionTarget(product);
    setActionType('restore');
  };

  const openHardDeleteConfirm = (product) => {
    setActionTarget(product);
    setActionType('hard-delete');
  };

  const closeConfirm = () => {
    if (isActioning) return;
    setActionTarget(null);
    setActionType('');
  };

  const confirmAction = async () => {
    if (!actionTarget?.id || !actionType) return;

    setIsActioning(true);
    try {
      if (actionType === 'disable') {
        await disableAdminProduct(actionTarget.id);
        toast.success('Product disabled successfully.');
      } else if (actionType === 'restore') {
        await restoreAdminProduct(actionTarget.id);
        toast.success('Product restored successfully.');
      } else if (actionType === 'hard-delete') {
        await hardDeleteAdminProduct(actionTarget.id);
        toast.success('Product permanently deleted.');
      }
      setActionTarget(null);
      setActionType('');
      await loadProducts();
    } catch {
      toast.error('Action failed. Please try again.');
    } finally {
      setIsActioning(false);
    }
  };

  const getConfirmTitle = () => {
    switch (actionType) {
      case 'disable': return 'Disable Product?';
      case 'restore': return 'Restore Product?';
      case 'hard-delete': return 'Delete Permanently?';
      default: return 'Confirm Action';
    }
  };

  const getConfirmMessage = () => {
    switch (actionType) {
      case 'disable': return 'This product will be hidden from the storefront. You can restore it later.';
      case 'restore': return 'This product will be available on the storefront again.';
      case 'hard-delete': return 'This action cannot be undone. The product and all associated data will be permanently removed.';
      default: return '';
    }
  };

  const isFiltering = filters.search || filters.status || filters.stockState || filters.categoryId;

  return (
    <div className="products-page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1>Products</h1>
          <p>Manage game listings, stock, and visibility.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/products/create')}>
          <Plus size={14} />
          Create Product
        </button>
      </header>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        {/* Status filter pills */}
        <div className="filter-pills">
          <button
            className={`filter-pill ${filters.status === '' ? 'active' : ''}`}
            onClick={() => handleFilterChange('status', '')}
          >
            All
          </button>
          <button
            className={`filter-pill ${filters.status === 'available' ? 'active' : ''}`}
            onClick={() => handleFilterChange('status', 'available')}
          >
            Available
          </button>
          <button
            className={`filter-pill ${filters.status === 'disabled' ? 'active' : ''}`}
            onClick={() => handleFilterChange('status', 'disabled')}
          >
            Disabled
          </button>
        </div>

        <div className="filter-divider" />

        {/* Stock filter pills */}
        <div className="filter-pills">
          <button
            className={`filter-pill ${filters.stockState === '' ? 'active' : ''}`}
            onClick={() => handleFilterChange('stockState', '')}
          >
            All Stock
          </button>
          <button
            className={`filter-pill ${filters.stockState === 'in-stock' ? 'active' : ''}`}
            onClick={() => handleFilterChange('stockState', 'in-stock')}
          >
            In Stock
          </button>
          <button
            className={`filter-pill ${filters.stockState === 'low-stock' ? 'active' : ''}`}
            onClick={() => handleFilterChange('stockState', 'low-stock')}
          >
            Low Stock
          </button>
          <button
            className={`filter-pill ${filters.stockState === 'out-of-stock' ? 'active' : ''}`}
            onClick={() => handleFilterChange('stockState', 'out-of-stock')}
          >
            Out of Stock
          </button>
        </div>

        <div className="filter-divider" />

        {/* Category select */}
        <div className="filter-select-wrap">
          <select
            className="filter-select"
            value={filters.categoryId}
            onChange={(e) => handleFilterChange('categoryId', e.target.value)}
            disabled={isLoadingCategories}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-divider" />

        {/* Search */}
        <div className="filter-search">
          <span className="filter-search-icon">
            <Search size={14} />
          </span>
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search name, developer, publisher..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          {filters.search && (
            <button
              className="filter-search-clear"
              onClick={() => handleFilterChange('search', '')}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th className="col-product-col">Product</th>
              <th className="col-price-col">Price</th>
              <th className="col-stock-col">Stock</th>
              <th className="col-status-col">Status</th>
              <th className="col-updated-col">Updated</th>
              <th className="col-actions-col" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td>
                    <div className="product-cell">
                      <div className="product-thumb">
                        <span className="skeleton-cell w-thumb" />
                      </div>
                      <div className="product-info">
                        <span className="skeleton-cell w-lg" />
                        <span className="skeleton-cell w-md" />
                      </div>
                    </div>
                  </td>
                  <td><span className="skeleton-cell w-md" /></td>
                  <td><span className="skeleton-cell w-badge" /></td>
                  <td><span className="skeleton-cell w-badge" /></td>
                  <td><span className="skeleton-cell w-sm" /></td>
                  <td className="actions-cell">
                    <div className="skeleton-cell w-actions">
                      <span className="skeleton-cell w-icon" />
                      <span className="skeleton-cell w-icon" />
                    </div>
                  </td>
                </tr>
              ))
            ) : loadError ? (
              <tr>
                <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                  <div className="table-error">
                    <p className="table-error-title">{loadError}</p>
                    <button className="btn btn-secondary" onClick={loadProducts}>Try again</button>
                  </div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                  <div className="table-empty">
                    <Search size={36} className="empty-icon" />
                    <p className="empty-title">No products found</p>
                    <p className="empty-hint">
                      {isFiltering
                        ? 'No products match your current filters.'
                        : 'Get started by creating your first product.'}
                    </p>
                    {isFiltering ? (
                      <button className="btn btn-secondary" onClick={handleClearFilters} style={{ marginTop: '10px' }}>
                        Clear filters
                      </button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => navigate('/admin/products/create')} style={{ marginTop: '10px' }}>
                        <Plus size={14} />
                        Create Product
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="product-cell">
                      <div className="product-thumb">
                        {product.primaryImageUrl ? (
                          <img src={product.primaryImageUrl} alt={product.name} />
                        ) : (
                          <span className="product-thumb-placeholder">No image</span>
                        )}
                      </div>
                      <div className="product-info">
                        <span className="product-name">{product.name}</span>
                        <span className="product-subtitle">{product.subtitle || product.slug || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td>{renderPriceCell(product)}</td>
                  <td>
                    <StockBadge stock={product.availableSteamKeyCount ?? product.stock ?? 0} />
                  </td>
                  <td>
                    <ProductStatusBadge isDeleted={product.isDeleted} />
                  </td>
                  <td className="date-cell">{formatUpdatedAt(product.updatedAt)}</td>
                  <td className="actions-cell">
                    <div className="actions-group">
                      <button
                        className="action-btn action-btn-edit"
                        onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      {product.isDeleted ? (
                        <>
                          <button
                            className="action-btn action-btn-restore"
                            onClick={() => openRestoreConfirm(product)}
                            title="Restore"
                          >
                            <RotateCcw size={13} />
                          </button>
                          <button
                            className="action-btn action-btn-delete"
                            onClick={() => openHardDeleteConfirm(product)}
                            title="Delete Permanently"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <button
                          className="action-btn action-btn-disable"
                          onClick={() => openDisableConfirm(product)}
                          title="Disable"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Modal */}
      {actionTarget && (
        <div className="modal-overlay" role="presentation" onClick={closeConfirm}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{getConfirmTitle()}</h3>
              <p className="modal-product-name">{actionTarget.name}</p>
              <p className="modal-message">{getConfirmMessage()}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeConfirm} disabled={isActioning}>
                Cancel
              </button>
              <button
                className={`btn ${actionType === 'hard-delete' ? 'btn-danger' : 'btn-warning'}`}
                onClick={confirmAction}
                disabled={isActioning}
              >
                {isActioning ? 'Processing...' : actionType === 'disable' ? 'Disable' : actionType === 'restore' ? 'Restore' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
