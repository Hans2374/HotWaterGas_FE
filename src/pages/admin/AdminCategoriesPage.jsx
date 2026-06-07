import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { CategoryFormModal } from '../../components/admin/CategoryFormModal';
import { getAdminCategories, createCategory, updateCategory, deleteCategory } from '../../services/categoryService';
import './AdminCategoriesPage.css';

const DEFAULT_PAGE_SIZE = 10;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const SkeletonRow = ({ cols }) => (
  <tr className="skeleton-row">
    <td><span className="skeleton-cell w-image-cell" /></td>
    <td><span className="skeleton-cell w-lg" /></td>
    <td><span className="skeleton-cell w-md" /></td>
    <td className="products-cell"><span className="skeleton-cell w-pill" /></td>
    <td><span className="skeleton-cell w-badge" /></td>
    <td className="date-cell"><span className="skeleton-cell w-sm" /></td>
    <td className="actions-cell">
      <div className="skeleton-cell w-actions">
        <span className="skeleton-cell w-icon" />
        <span className="skeleton-cell w-icon" />
      </div>
    </td>
  </tr>
);

const EmptyState = ({ isFiltering, onCreate, onClear }) => (
  <div className="table-empty">
    <LayoutGrid size={36} className="empty-icon" />
    <p className="empty-title">No categories found</p>
    <p className="empty-hint">
      {isFiltering
        ? 'No categories match your current filters.'
        : 'Get started by creating your first category.'}
    </p>
    {isFiltering ? (
      <button className="btn btn-secondary" onClick={onClear} style={{ marginTop: '10px' }}>
        Clear filters
      </button>
    ) : (
      <button className="btn btn-primary" onClick={onCreate} style={{ marginTop: '10px' }}>
        <Plus size={14} />
        Create Category
      </button>
    )}
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="table-error">
    <p className="table-error-title">{message || 'Something went wrong.'}</p>
    <button className="btn btn-secondary" onClick={onRetry}>
      Try again
    </button>
  </div>
);

export const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false
  });

  const [filters, setFilters] = useState({
    search: '',
    isActive: ''
  });

  const [formModalState, setFormModalState] = useState({
    isOpen: false,
    mode: 'create',
    initialData: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCategories = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await getAdminCategories({
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
        search: filters.search || undefined,
        isActive: filters.isActive === '' ? undefined : filters.isActive === 'true'
      });

      setCategories(Array.isArray(response.items) ? response.items : []);
      setPagination({
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        totalPages: response.totalPages,
        hasPreviousPage: response.hasPreviousPage,
        hasNextPage: response.hasNextPage
      });
    } catch (err) {
      setLoadError(err.message || 'Failed to load categories.');
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [pagination.pageNumber, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ search: '', isActive: '' });
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, pageNumber: newPage }));
  };

  const handleOpenCreate = () => {
    setFormModalState({ isOpen: true, mode: 'create', initialData: null });
  };

  const handleOpenEdit = (category) => {
    setFormModalState({
      isOpen: true,
      mode: 'edit',
      initialData: {
        id: category.id,
        name: category.name,
        isActive: category.isActive,
        imageUrl: category.imageUrl || ''
      }
    });
  };

  const handleCloseModal = () => {
    setFormModalState({ isOpen: false, mode: 'create', initialData: null });
  };

  const handleFormSubmit = async (payload) => {
    setIsSubmitting(true);
    try {
      if (formModalState.mode === 'create') {
        await createCategory(payload);
        toast.success('Category created successfully.');
      } else {
        await updateCategory(formModalState.initialData.id, payload);
        toast.success('Category updated successfully.');
      }
      handleCloseModal();
      await loadCategories();
    } catch (err) {
      toast.error(err.message || `Failed to ${formModalState.mode === 'create' ? 'create' : 'update'} category.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (category) => {
    setDeleteTarget(category);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      toast.success('Category deleted successfully.');
      handleCloseDeleteConfirm();
      await loadCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to delete category.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isFiltering = filters.search || filters.isActive !== '';

  const startItem = pagination.totalCount === 0
    ? 0
    : (pagination.pageNumber - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.pageNumber * pagination.pageSize, pagination.totalCount);

  return (
    <div className="categories-page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1>Categories</h1>
          <p>Manage product categories for the storefront.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={14} />
          Create Category
        </button>
      </header>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        {/* Status filter pills */}
        <div className="filter-pills">
          <button
            className={`filter-pill ${filters.isActive === '' ? 'active' : ''}`}
            onClick={() => handleFilterChange('isActive', '')}
          >
            All
          </button>
          <button
            className={`filter-pill ${filters.isActive === 'true' ? 'active' : ''}`}
            onClick={() => handleFilterChange('isActive', 'true')}
          >
            Active
          </button>
          <button
            className={`filter-pill ${filters.isActive === 'false' ? 'active' : ''}`}
            onClick={() => handleFilterChange('isActive', 'false')}
          >
            Inactive
          </button>
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
            placeholder="Search name or slug..."
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
        <table className="categories-table">
          <thead>
            <tr>
              <th className="col-image-col" />
              <th className="col-name-col">Name</th>
              <th className="col-products-col">Products</th>
              <th className="col-status-col">Status</th>
              <th className="col-created-col">Created</th>
              <th className="col-actions-col" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: pagination.pageSize }).map((_, i) => (
                <SkeletonRow key={i} />
              ))
            ) : categories.length === 0 && !loadError ? (
              <tr>
                <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                  <EmptyState
                    isFiltering={isFiltering}
                    onCreate={handleOpenCreate}
                    onClear={handleClearFilters}
                  />
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                  <ErrorState message={loadError} onRetry={loadCategories} />
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id}>
                  <td className="image-cell">
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="category-row-thumb"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="category-row-thumb-placeholder" aria-hidden="true" />
                    )}
                  </td>
                  <td className="name-cell">
                    <span className="name-cell-primary">{category.name}</span>
                  </td>
                  <td className="products-cell">
                    <span className={`products-count ${(category.attachedProductsCount ?? 0) > 0 ? 'has-products' : ''}`}>
                      {category.attachedProductsCount ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${category.isActive ? 'badge-active' : 'badge-inactive'}`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(category.createdAt)}</td>
                  <td className="actions-cell">
                    <div className="actions-group">
                      <button
                        className="action-btn action-btn-edit"
                        onClick={() => handleOpenEdit(category)}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="action-btn action-btn-delete"
                        onClick={() => handleDeleteClick(category)}
                        title={
                          (category.attachedProductsCount ?? 0) > 0
                            ? 'Cannot delete — category has products'
                            : 'Delete'
                        }
                        disabled={(category.attachedProductsCount ?? 0) > 0}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {!isLoading && !loadError && categories.length > 0 && (
          <div className="pagination-bar">
            <span className="pagination-meta">
              Showing <strong>{startItem}–{endItem}</strong> of <strong>{pagination.totalCount}</strong>
            </span>
            <div className="pagination-nav">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.pageNumber - 1)}
                disabled={!pagination.hasPreviousPage}
                aria-label="Previous"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="pagination-label">
                {pagination.pageNumber} / {pagination.totalPages || 1}
              </span>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.pageNumber + 1)}
                disabled={!pagination.hasNextPage}
                aria-label="Next"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {formModalState.isOpen && (
        <CategoryFormModal
          mode={formModalState.mode}
          initialData={formModalState.initialData}
          onSubmit={handleFormSubmit}
          onClose={handleCloseModal}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={handleCloseDeleteConfirm}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Delete Category?</h3>
              <p className="modal-category-name">{deleteTarget.name}</p>
              <p className="modal-message">
                This will permanently remove the category. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handleCloseDeleteConfirm}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
