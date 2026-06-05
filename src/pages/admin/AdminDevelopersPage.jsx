import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, Code2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { DeveloperFormModal } from '../../components/admin/DeveloperFormModal';
import { getAdminDevelopers, createDeveloper, updateDeveloper, deleteDeveloper } from '../../services/developerService';
import './AdminDevelopersPage.css';

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
    <Code2 size={36} className="empty-icon" />
    <p className="empty-title">No developers found</p>
    <p className="empty-hint">
      {isFiltering
        ? 'No developers match your current search.'
        : 'Get started by adding your first developer.'}
    </p>
    {isFiltering ? (
      <button className="btn btn-secondary" onClick={onClear} style={{ marginTop: '10px' }}>
        Clear search
      </button>
    ) : (
      <button className="btn btn-primary" onClick={onCreate} style={{ marginTop: '10px' }}>
        <Plus size={14} />
        Create Developer
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

export const AdminDevelopersPage = () => {
  const [developers, setDevelopers] = useState([]);
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

  const [search, setSearch] = useState('');

  const [formModalState, setFormModalState] = useState({
    isOpen: false,
    mode: 'create',
    initialData: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDevelopers = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await getAdminDevelopers({
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
        search: search || undefined
      });

      setDevelopers(Array.isArray(response.items) ? response.items : []);
      setPagination({
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        totalPages: response.totalPages,
        hasPreviousPage: response.hasPreviousPage,
        hasNextPage: response.hasNextPage
      });
    } catch (err) {
      setLoadError(err.message || 'Failed to load developers.');
      setDevelopers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDevelopers();
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

  const handleOpenEdit = (developer) => {
    setFormModalState({
      isOpen: true,
      mode: 'edit',
      initialData: {
        id: developer.id,
        name: developer.name,
        slug: developer.slug,
        description: developer.description || '',
        logoUrl: developer.logoUrl || ''
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
        await createDeveloper(payload);
        toast.success('Developer created successfully.');
      } else {
        await updateDeveloper(formModalState.initialData.id, payload);
        toast.success('Developer updated successfully.');
      }
      handleCloseModal();
      await loadDevelopers();
    } catch (err) {
      const actionError = normalizeActionError(err, 'developer');
      toast.error(actionError.title, {
        description: actionError.detail ? `${actionError.message} ${actionError.detail}` : actionError.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (developer) => {
    setDeleteTarget(developer);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      await deleteDeveloper(deleteTarget.id);
      toast.success('Developer deleted successfully.');
      handleCloseDeleteConfirm();
      await loadDevelopers();
    } catch (err) {
      const message = err?.message || 'Failed to delete developer.';
      toast.error('Developer delete failed', { description: message });
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
    <div className="developers-page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1>Developers</h1>
          <p>Manage developers for your products.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={14} />
          Create Developer
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
        <table className="developers-table">
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
            ) : developers.length === 0 && !loadError ? (
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
                  <ErrorState message={loadError} onRetry={loadDevelopers} />
                </td>
              </tr>
            ) : (
              developers.map((developer) => (
                <tr key={developer.id}>
                  <td className="image-cell">
                    {developer.logoUrl ? (
                      <img
                        src={developer.logoUrl}
                        alt={developer.name}
                        className="developer-row-thumb"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="developer-row-thumb-placeholder" aria-hidden="true" />
                    )}
                  </td>
                  <td className="name-cell">
                    <span className="name-cell-primary">{developer.name}</span>
                  </td>
                  <td className="products-cell">
                    <span className={`products-count ${(developer.attachedProductsCount ?? 0) > 0 ? 'has-products' : ''}`}>
                      {developer.attachedProductsCount ?? 0}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(developer.createdAt)}</td>
                  <td className="actions-cell">
                    <div className="actions-group">
                      <button
                        className="action-btn action-btn-edit"
                        onClick={() => handleOpenEdit(developer)}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="action-btn action-btn-delete"
                        onClick={() => handleDeleteClick(developer)}
                        title={
                          (developer.attachedProductsCount ?? 0) > 0
                            ? 'Cannot delete — developer has products'
                            : 'Delete'
                        }
                        disabled={(developer.attachedProductsCount ?? 0) > 0}
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
        {!isLoading && !loadError && developers.length > 0 && (
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
        <DeveloperFormModal
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
              <h3 className="modal-title">Delete Developer?</h3>
              <p className="modal-developer-name">{deleteTarget.name}</p>
              <p className="modal-message">
                This will permanently remove the developer. This action cannot be undone.
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
