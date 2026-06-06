import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { PublisherFormModal } from '../../components/admin/PublisherFormModal';
import { getAdminPublishers, createPublisher, updatePublisher, deletePublisher } from '../../services/publisherService';
import './AdminPublishersPage.css';

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

const SkeletonRow = () => (
  <tr className="skeleton-row">
    <td><span className="skeleton-cell" style={{ width: '36px', height: '36px', borderRadius: '6px' }} /></td>
    <td><span className="skeleton-cell" style={{ width: '70%' }} /></td>
    <td className="products-cell"><span className="skeleton-cell" style={{ width: '36px', height: '22px', borderRadius: '999px', margin: '0 auto' }} /></td>
    <td className="date-cell"><span className="skeleton-cell" style={{ width: '40%' }} /></td>
    <td className="actions-cell">
      <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
        <span className="skeleton-cell" style={{ width: '30px', height: '30px', borderRadius: '7px' }} />
        <span className="skeleton-cell" style={{ width: '30px', height: '30px', borderRadius: '7px' }} />
      </div>
    </td>
  </tr>
);

const EmptyState = ({ isFiltering, onCreate, onClear }) => (
  <div className="table-empty">
    <LayoutGrid size={36} className="empty-icon" />
    <p className="empty-title">No publishers found</p>
    <p className="empty-hint">
      {isFiltering
        ? 'No publishers match your current search.'
        : 'Get started by adding your first publisher.'}
    </p>
    {isFiltering ? (
      <button className="btn btn-secondary" onClick={onClear} style={{ marginTop: '10px' }}>
        Clear search
      </button>
    ) : (
      <button className="btn btn-primary" onClick={onCreate} style={{ marginTop: '10px' }}>
        <Plus size={14} />
        Create Publisher
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

const normalizeActionError = (error, entityName) => {
  const fallbackMessage = `Failed to save ${entityName}. Please try again.`;
  const rawMessage = typeof error?.message === 'string' ? error.message.trim() : '';
  const normalizedMessage = rawMessage || fallbackMessage;

  if (error?.status >= 500) {
    return {
      title: `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} save failed`,
      message: normalizedMessage,
      detail: 'The server could not complete the request. Check required fields like logo/image and try again.'
    };
  }

  return {
    title: `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} save failed`,
    message: normalizedMessage,
    detail: ''
  };
};

export const AdminPublishersPage = () => {
  const [publishers, setPublishers] = useState([]);
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

  const [search, setSearch] = useState('');

  const [formModalState, setFormModalState] = useState({
    isOpen: false,
    mode: 'create',
    initialData: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPublishers = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await getAdminPublishers({
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
        search: search || undefined
      });

      setPublishers(Array.isArray(response.items) ? response.items : []);
      setPagination({
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        totalPages: response.totalPages,
        hasPreviousPage: response.hasPreviousPage,
        hasNextPage: response.hasNextPage
      });
    } catch (err) {
      setLoadError(err.message || 'Failed to load publishers.');
      setPublishers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPublishers();
  }, [pagination.pageNumber, search]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
  };

  const handleClearSearch = () => {
    setSearch('');
    setPagination((prev) => ({ ...prev, pageNumber: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, pageNumber: newPage }));
  };

  const handleOpenCreate = () => {
    setFormModalState({ isOpen: true, mode: 'create', initialData: null });
  };

  const handleOpenEdit = (publisher) => {
    setFormModalState({
      isOpen: true,
      mode: 'edit',
      initialData: {
        id: publisher.id,
        name: publisher.name,
        slug: publisher.slug,
        description: publisher.description || '',
        logoUrl: publisher.logoUrl || ''
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
        await createPublisher(payload);
        toast.success('Publisher created successfully.');
      } else {
        await updatePublisher(formModalState.initialData.id, payload);
        toast.success('Publisher updated successfully.');
      }
      handleCloseModal();
      await loadPublishers();
    } catch (err) {
      const actionError = normalizeActionError(err, 'publisher');
      toast.error(actionError.title, {
        description: actionError.detail ? `${actionError.message} ${actionError.detail}` : actionError.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (publisher) => {
    setDeleteTarget(publisher);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      await deletePublisher(deleteTarget.id);
      toast.success('Publisher deleted successfully.');
      handleCloseDeleteConfirm();
      await loadPublishers();
    } catch (err) {
      const message = err?.message || 'Failed to delete publisher.';
      toast.error('Publisher delete failed', { description: message });
    } finally {
      setIsDeleting(false);
    }
  };

  const isFiltering = search !== '';

  const startItem = pagination.totalCount === 0
    ? 0
    : (pagination.pageNumber - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.pageNumber * pagination.pageSize, pagination.totalCount);

  return (
    <div className="publishers-page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1>Publishers</h1>
          <p>Manage publishers for your products.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={14} />
          Create Publisher
        </button>
      </header>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-search" style={{ maxWidth: '320px', flex: 1 }}>
          <span className="filter-search-icon">
            <Search size={14} />
          </span>
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search name or slug..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button
              className="filter-search-clear"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="publishers-table">
          <thead>
            <tr>
              <th className="col-image-col" />
              <th className="col-name-col">Name</th>
              <th className="col-products-col">Products</th>
              <th className="col-created-col">Created</th>
              <th className="col-actions-col" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: pagination.pageSize }).map((_, i) => (
                <SkeletonRow key={i} />
              ))
            ) : publishers.length === 0 && !loadError ? (
              <tr>
                <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                  <EmptyState
                    isFiltering={isFiltering}
                    onCreate={handleOpenCreate}
                    onClear={handleClearSearch}
                  />
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                  <ErrorState message={loadError} onRetry={loadPublishers} />
                </td>
              </tr>
            ) : (
              publishers.map((publisher) => (
                <tr key={publisher.id}>
                  <td className="image-cell">
                    {publisher.logoUrl ? (
                      <img
                        src={publisher.logoUrl}
                        alt={publisher.name}
                        className="publisher-row-thumb"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="publisher-row-thumb-placeholder" aria-hidden="true" />
                    )}
                  </td>
                  <td className="name-cell">
                    <span className="name-cell-primary">{publisher.name}</span>
                  </td>
                  <td className="products-cell">
                    <span className={`products-count ${(publisher.attachedProductsCount ?? 0) > 0 ? 'has-products' : ''}`}>
                      {publisher.attachedProductsCount ?? 0}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(publisher.createdAt)}</td>
                  <td className="actions-cell">
                    <div className="actions-group">
                      <button
                        className="action-btn action-btn-edit"
                        onClick={() => handleOpenEdit(publisher)}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="action-btn action-btn-delete"
                        onClick={() => handleDeleteClick(publisher)}
                        title={
                          (publisher.attachedProductsCount ?? 0) > 0
                            ? 'Cannot delete — publisher has products'
                            : 'Delete'
                        }
                        disabled={(publisher.attachedProductsCount ?? 0) > 0}
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
        {!isLoading && !loadError && publishers.length > 0 && (
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
        <PublisherFormModal
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
              <h3 className="modal-title">Delete Publisher?</h3>
              <p className="modal-publisher-name">{deleteTarget.name}</p>
              <p className="modal-message">
                This will permanently remove the publisher. This action cannot be undone.
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
