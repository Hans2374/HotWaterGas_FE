import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/common/Button';
import { SteamKeySummaryMetrics } from '../../components/admin/SteamKeySummaryMetrics';
import { AdminSteamKeyTable } from '../../components/admin/AdminSteamKeyTable';
import {
  createAdminSteamKeys,
  deleteAdminSteamKey,
  getAdminProductDetail,
  getAdminSteamKeySummary,
  getAdminSteamKeys,
  invalidateAdminSteamKey,
  restoreAdminSteamKey,
  updateAdminSteamKey
} from '../../services/productService';
import './AdminProductSteamKeysPage.css';

const createEmptySummary = () => ({
  available: 0,
  disabled: 0,
  sold: 0,
  total: 0
});

export const AdminProductSteamKeysPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [productName, setProductName] = useState('');
  const [productImage, setProductImage] = useState('');
  const [summary, setSummary] = useState(createEmptySummary());
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tableState, setTableState] = useState({
    data: [],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1
  });
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [tableError, setTableError] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addKeysInput, setAddKeysInput] = useState('');
  const [addError, setAddError] = useState('');
  const [isAddingKeys, setIsAddingKeys] = useState(false);

  const [editTarget, setEditTarget] = useState(null);
  const [editKeyValue, setEditKeyValue] = useState('');
  const [editError, setEditError] = useState('');
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);

  const [confirmState, setConfirmState] = useState({ mode: '', item: null });
  const [confirmError, setConfirmError] = useState('');
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);

  const loadProductContext = async () => {
    try {
      const product = await getAdminProductDetail(id);
      setProductName(product?.name || '');
      const primaryImage = product?.images?.[0]?.url || product?.primaryImageUrl || '';
      setProductImage(primaryImage);
    } catch {
      setProductName('');
      setProductImage('');
    }
  };

  const loadSummary = async () => {
    setIsSummaryLoading(true);
    setSummaryError('');
    try {
      const result = await getAdminSteamKeySummary(id);
      setSummary(result);
    } catch (apiError) {
      setSummaryError(apiError.message || 'Failed to load summary.');
      setSummary(createEmptySummary());
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const loadKeys = async () => {
    setIsTableLoading(true);
    setTableError('');
    try {
      const result = await getAdminSteamKeys(id, { page, pageSize, status: status || undefined });
      setTableState(result);
    } catch (apiError) {
      setTableError(apiError.message || 'Failed to load keys.');
      setTableState((prev) => ({ ...prev, data: [] }));
    } finally {
      setIsTableLoading(false);
    }
  };

  const refreshInventory = async () => {
    await Promise.all([loadSummary(), loadKeys()]);
  };

  useEffect(() => {
    loadProductContext();
    loadSummary();
  }, [id]);

  useEffect(() => {
    loadKeys();
  }, [id, page, pageSize, status]);

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  const handlePageSizeChange = (nextPageSize) => {
    setPageSize(nextPageSize);
    setPage(1);
  };

  const openAddModal = () => {
    setAddError('');
    setAddKeysInput('');
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    if (isAddingKeys) return;
    setIsAddModalOpen(false);
    setAddError('');
    setAddKeysInput('');
  };

  const handleAddKeysSubmit = async () => {
    const rows = addKeysInput.split(/\r?\n/);
    if (rows.length === 0 || rows.every((row) => !row.trim())) {
      setAddError('Enter at least one Steam key.');
      return;
    }

    setIsAddingKeys(true);
    setAddError('');
    try {
      const result = await createAdminSteamKeys(id, rows);
      toast.success(`Added: ${result.insertedCount} | Duplicates: ${result.skippedDuplicateCount} | Invalid: ${result.invalidRowCount}`);
      await refreshInventory();
      closeAddModal();
    } catch (apiError) {
      setAddError(apiError.message || 'Failed to add keys.');
    } finally {
      setIsAddingKeys(false);
    }
  };

  const openEditModal = (item) => {
    setEditError('');
    setEditTarget(item);
    setEditKeyValue('');
  };

  const closeEditModal = () => {
    if (isUpdatingKey) return;
    setEditTarget(null);
    setEditError('');
    setEditKeyValue('');
  };

  const handleEditSubmit = async () => {
    if (!editTarget?.id) return;
    if (!editKeyValue.trim()) {
      setEditError('Replacement key is required.');
      return;
    }

    setIsUpdatingKey(true);
    setEditError('');
    try {
      await updateAdminSteamKey(id, editTarget.id, editKeyValue);
      toast.success('Steam key updated.');
      await refreshInventory();
      closeEditModal();
    } catch (apiError) {
      setEditError(apiError.message || 'Failed to update key.');
    } finally {
      setIsUpdatingKey(false);
    }
  };

  const openConfirmDialog = (mode, item) => {
    setConfirmError('');
    setConfirmState({ mode, item });
  };

  const closeConfirmDialog = () => {
    if (isConfirmSubmitting) return;
    setConfirmState({ mode: '', item: null });
    setConfirmError('');
  };

  const handleConfirmAction = async () => {
    const targetId = confirmState.item?.id;
    if (!targetId || !confirmState.mode) return;

    setIsConfirmSubmitting(true);
    setConfirmError('');
    try {
      if (confirmState.mode === 'disable') {
        await invalidateAdminSteamKey(id, targetId);
        toast.success('Key disabled.');
      } else if (confirmState.mode === 'enable') {
        await restoreAdminSteamKey(id, targetId);
        toast.success('Key enabled.');
      } else {
        await deleteAdminSteamKey(id, targetId);
        toast.success('Key deleted.');
      }
      await refreshInventory();
      closeConfirmDialog();
    } catch (apiError) {
      setConfirmError(apiError.message || 'Operation failed.');
    } finally {
      setIsConfirmSubmitting(false);
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/admin/products');
    }
  };

  const isConfirmDisable = confirmState.mode === 'disable';
  const isConfirmEnable = confirmState.mode === 'enable';
  const isConfirmDelete = confirmState.mode === 'delete';

  return (
    <div className="steam-key-page-shell">
        {/* Header */}
        <header className="steam-key-page-header">
          <div className="steam-key-header-left">
            <button type="button" className="back-button" onClick={handleGoBack}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <div className="steam-key-header-info">
              <div className="steam-key-header-title-row">
                {productImage && (
                  <img src={productImage} alt="" className="steam-key-header-thumb" />
                )}
                <div>
                  <h1 className="steam-key-page-title">
                    {productName || 'Steam Keys'}
                  </h1>
                  <p className="steam-key-page-subtitle">Inventory management</p>
                </div>
              </div>
            </div>
          </div>
          <div className="steam-key-header-actions">
            <Button variant="secondary" onClick={refreshInventory} disabled={isTableLoading}>
              <RefreshCw size={14} />
              <span>Refresh</span>
            </Button>
            <Button variant="accent" onClick={openAddModal}>
              <Plus size={14} />
              <span>Add Keys</span>
            </Button>
          </div>
        </header>

        {/* Summary */}
        <section className="steam-key-summary-section">
          {summaryError && (
            <div className="feedback-inline error">{summaryError}</div>
          )}
          <SteamKeySummaryMetrics summary={summary} isLoading={isSummaryLoading} />
        </section>

        {/* Toolbar */}
        <section className="steam-key-toolbar">
          <div className="steam-key-toolbar-left">
            <select
              className="toolbar-select"
              value={status}
              onChange={handleStatusChange}
            >
              <option value="">All Status</option>
              <option value="Available">Available</option>
              <option value="Disabled">Disabled</option>
              <option value="Sold">Sold</option>
            </select>
          </div>
        </section>

        {/* Table */}
        <AdminSteamKeyTable
          items={tableState.data}
          isLoading={isTableLoading}
          error={tableError}
          page={tableState.page}
          pageSize={tableState.pageSize}
          totalItems={tableState.totalItems}
          totalPages={tableState.totalPages}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          onEdit={openEditModal}
          onDisable={(item) => openConfirmDialog('disable', item)}
          onEnable={(item) => openConfirmDialog('enable', item)}
          onDelete={(item) => openConfirmDialog('delete', item)}
        />

        {/* Add Keys Modal */}
        {isAddModalOpen && (
          <div className="modal-overlay" role="presentation" onClick={closeAddModal}>
            <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Add Steam Keys</h3>
                <p className="modal-subtitle">Paste one Steam key per line</p>
              </div>
              <div className="modal-body">
                <textarea
                  className="modal-textarea mono"
                  rows={10}
                  value={addKeysInput}
                  onChange={(e) => setAddKeysInput(e.target.value)}
                  placeholder="AAAAA-BBBBB-CCCCC&#10;DDDDD-EEEEE-FFFFF&#10;..."
                  disabled={isAddingKeys}
                />
                {addError && <div className="feedback-inline error">{addError}</div>}
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={closeAddModal} disabled={isAddingKeys}>Cancel</Button>
                <Button onClick={handleAddKeysSubmit} disabled={isAddingKeys}>
                  {isAddingKeys ? 'Adding...' : 'Add Keys'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Key Modal */}
        {editTarget && (
          <div className="modal-overlay" role="presentation" onClick={closeEditModal}>
            <div className="modal-card modal-sm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Edit Steam Key</h3>
                <p className="modal-subtitle">Replace key value</p>
              </div>
              <div className="modal-body">
                <div className="modal-field">
                  <label className="modal-label">Current Key</label>
                  <input className="modal-input mono" value={editTarget.maskedKey || '—'} readOnly />
                </div>
                <div className="modal-field">
                  <label className="modal-label">Replacement</label>
                  <input
                    className="modal-input mono"
                    value={editKeyValue}
                    onChange={(e) => setEditKeyValue(e.target.value)}
                    placeholder="AAAAA-BBBBB-CCCCC"
                    disabled={isUpdatingKey}
                  />
                </div>
                {editError && <div className="feedback-inline error">{editError}</div>}
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={closeEditModal} disabled={isUpdatingKey}>Cancel</Button>
                <Button onClick={handleEditSubmit} disabled={isUpdatingKey}>
                  {isUpdatingKey ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Dialog */}
        {confirmState.item && (
          <div className="modal-overlay" role="presentation" onClick={closeConfirmDialog}>
            <div className="modal-card modal-sm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">
                  {isConfirmDisable && 'Disable Key?'}
                  {isConfirmEnable && 'Enable Key?'}
                  {isConfirmDelete && 'Delete Key?'}
                </h3>
                <p className="modal-subtitle">
                  {isConfirmDisable && 'This key will not be fulfilled to customers.'}
                  {isConfirmEnable && 'This key will be available for fulfillment.'}
                  {isConfirmDelete && 'This action cannot be undone.'}
                </p>
              </div>
              <div className="modal-body">
                {confirmError && <div className="feedback-inline error">{confirmError}</div>}
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={closeConfirmDialog} disabled={isConfirmSubmitting}>Cancel</Button>
                <Button
                  variant={isConfirmDelete ? 'danger' : 'primary'}
                  onClick={handleConfirmAction}
                  disabled={isConfirmSubmitting}
                >
                  {isConfirmSubmitting ? 'Processing...' : 'Confirm'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};
