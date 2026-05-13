import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { TagFormModal } from '../../components/admin/TagFormModal';
import { getAdminTags, createTag, updateTag, deleteTag } from '../../services/tagService';
import './AdminTagsPage.css';

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
    <Tag size={36} className="empty-icon" />
    <p className="empty-title">No tags found</p>
    <p className="empty-hint">
      {isFiltering
        ? 'No tags match your current filters.'
        : 'Get started by creating your first tag.'}
    </p>
    {isFiltering ? (
      <button className="btn btn-secondary" onClick={onClear} style={{ marginTop: '10px' }}>
        Clear filters
      </button>
    ) : (
      <button className="btn btn-primary" onClick={onCreate} style={{ marginTop: '10px' }}>
        <Plus size={14} />
        Create Tag
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

export const AdminTagsPage = () => {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

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

  const loadTags = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await getAdminTags({
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
        search: filters.search || undefined,
        isActive: filters.isActive === '' ? undefined : filters.isActive === 'true'
      });

      setTags(Array.isArray(response.items) ? response.items : []);
      setPagination({
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        totalPages: response.totalPages,
        hasPreviousPage: response.hasPreviousPage,
        hasNextPage: response.hasNextPage
      });
    } catch (err) {
      setLoadError(err.message || 'Failed to load tags.');
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
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

  const handleOpenEdit = (tag) => {
    setFormModalState({
      isOpen: true,
      mode: 'edit',
      initialData: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        isActive: tag.isActive
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
        await createTag(payload);
        toast.success('Tag created successfully.');
      } else {
        await updateTag(formModalState.initialData.id, payload);
        toast.success('Tag updated successfully.');
      }
      handleCloseModal();
      await loadTags();
    } catch (err) {
      toast.error(err.message || `Failed to ${formModalState.mode === 'create' ? 'create' : 'update'} tag.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (tag) => {
    setDeleteTarget(tag);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      await deleteTag(deleteTarget.id);
      toast.success('Tag deleted successfully.');
      handleCloseDeleteConfirm();
      await loadTags();
    } catch (err) {
      toast.error(err.message || 'Failed to delete tag.');
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
    <div className="tags-page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1>Tags</h1>
          <p>Manage product tags used across the storefront.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={14} />
          Create Tag
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
        <table className="tags-table">
          <thead>
            <tr>
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
            ) : tags.length === 0 && !loadError ? (
              <tr>
                <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                  <EmptyState
                    isFiltering={isFiltering}
                    onCreate={handleOpenCreate}
                    onClear={handleClearFilters}
                  />
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                  <ErrorState message={loadError} onRetry={loadTags} />
                </td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag.id}>
                  <td className="name-cell">
                    <span className="name-cell-primary">{tag.name}</span>
                  </td>
                  <td className="products-cell">
                    <span className={`products-count ${(tag.attachedProductsCount ?? 0) > 0 ? 'has-products' : ''}`}>
                      {tag.attachedProductsCount ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${tag.isActive ? 'badge-active' : 'badge-inactive'}`}>
                      {tag.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(tag.createdAt)}</td>
                  <td className="actions-cell">
                    <div className="actions-group">
                      <button
                        className="action-btn action-btn-edit"
                        onClick={() => handleOpenEdit(tag)}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="action-btn action-btn-delete"
                        onClick={() => handleDeleteClick(tag)}
                        title={
                          (tag.attachedProductsCount ?? 0) > 0
                            ? 'Cannot delete — tag has products'
                            : 'Delete'
                        }
                        disabled={(tag.attachedProductsCount ?? 0) > 0}
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
        {!isLoading && !loadError && tags.length > 0 && (
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
        <TagFormModal
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
              <h3 className="modal-title">Delete Tag?</h3>
              <p className="modal-category-name">{deleteTarget.name}</p>
              <p className="modal-message">
                This will permanently remove the tag. This action cannot be undone.
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
