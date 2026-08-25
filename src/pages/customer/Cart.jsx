import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from '../../components/common/Loader';
import { Button } from '../../components/common/Button';
import { ScrollToTop } from '../../components/common/ScrollToTop';
import { CartItemRow } from '../../components/cart/CartItemRow';
import { useCart } from '../../hooks/useCart';
import './Cart.css';

const formatCurrency = (value) => Number(value || 0).toLocaleString();
const CHECKOUT_SELECTION_KEY = 'hotwatergas.checkout.selectedCartItemIds';

export const Cart = () => {
  const navigate = useNavigate();
  const { cart, refreshCart, removeFromCart, addToCart, updateCartItemQuantity, isLoading } = useCart();
  const [pageError, setPageError] = useState('');
  const [updatingProductIds, setUpdatingProductIds] = useState(new Set());
  const [selectedCartItemIds, setSelectedCartItemIds] = useState([]);
  const [hiddenProductIds, setHiddenProductIds] = useState(new Set());
  const [undoToast, setUndoToast] = useState(null);
  const [isRestoringItem, setIsRestoringItem] = useState(false);

  useEffect(() => {
    refreshCart().catch((error) => {
      if (error.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      setPageError(error.message || 'Không thể tải giỏ hàng.');
    });
  }, [navigate, refreshCart]);

  useEffect(() => {
    return () => {
      if (undoToast?.timerId) {
        clearTimeout(undoToast.timerId);
      }
    };
  }, [undoToast]);

  const visibleItems = useMemo(
    () => cart.items.filter((item) => !hiddenProductIds.has(item.productId)),
    [cart.items, hiddenProductIds]
  );

  const cartSubtotal = useMemo(
    () => visibleItems.reduce((total, item) => total + Number(item.subtotal || 0), 0),
    [visibleItems]
  );

  const selectableItemIds = useMemo(
    () => visibleItems.filter((item) => item.inStock !== false).map((item) => item.cartItemId),
    [visibleItems]
  );

  const selectedItems = useMemo(() => {
    const selectedIds = new Set(selectedCartItemIds);
    return visibleItems.filter((item) => selectedIds.has(item.cartItemId) && item.inStock !== false);
  }, [selectedCartItemIds, visibleItems]);

  const selectedSubtotal = useMemo(() => {
    return selectedItems.reduce((total, item) => total + Number(item.subtotal || 0), 0);
  }, [selectedItems]);

  const allSelected = selectableItemIds.length > 0 && selectableItemIds.every((id) => selectedCartItemIds.includes(id));

  useEffect(() => {
    setSelectedCartItemIds((previous) => previous.filter((id) => selectableItemIds.includes(id)));
  }, [selectableItemIds]);

  const clearUndoToast = () => {
    setUndoToast((previous) => {
      if (previous?.timerId) {
        clearTimeout(previous.timerId);
      }

      return null;
    });
  };

  const handleRemove = async (item) => {
    const removedItem = {
      productId: item.productId,
      productName: item.productName,
      quantity: Number(item.quantity || 1),
      productImageUrl: item.productImageUrl || '',
      finalPrice: Number(item.finalPrice || 0)
    };

    setHiddenProductIds((previous) => {
      const next = new Set(previous);
      next.add(item.productId);
      return next;
    });

    setSelectedCartItemIds((previous) => previous.filter((id) => id !== item.cartItemId));

    try {
      await removeFromCart(item.productId);
      setPageError('');

      clearUndoToast();

      const timerId = window.setTimeout(() => {
        setUndoToast((previous) => {
          if (previous?.timerId === timerId) {
            return null;
          }

          return previous;
        });
      }, 6500);

      setUndoToast({
        type: 'undo',
        removedItem,
        timerId
      });
    } catch (error) {
      setHiddenProductIds((previous) => {
        const next = new Set(previous);
        next.delete(item.productId);
        return next;
      });

      if (error.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      setPageError(error.message || 'Failed to remove item.');
    }
  };

  const handleUndoRemove = async () => {
    if (!undoToast?.removedItem || isRestoringItem) {
      return;
    }

    const { removedItem } = undoToast;
    setIsRestoringItem(true);
    setPageError('');

    try {
      await addToCart(removedItem.productId, removedItem.quantity);
      setHiddenProductIds((previous) => {
        const next = new Set(previous);
        next.delete(removedItem.productId);
        return next;
      });
      clearUndoToast();
      await refreshCart();
    } catch (error) {
      setHiddenProductIds((previous) => {
        const next = new Set(previous);
        next.delete(removedItem.productId);
        return next;
      });
      clearUndoToast();

      if (error.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      setPageError(error.message || 'Không thể khôi phục sản phẩm. Số lượng tồn kho không đủ.');
    } finally {
      setIsRestoringItem(false);
    }
  };

  const handleQuantityChange = async (item, nextQuantity) => {
    const productId = item.productId;

    if (!productId || updatingProductIds.has(productId)) {
      return;
    }

    // Skip API call if quantity hasn't actually changed.
    const currentQuantity = Number(item.quantity || 0);
    if (nextQuantity === currentQuantity) {
      return;
    }

    setUpdatingProductIds((previous) => {
      const next = new Set(previous);
      next.add(productId);
      return next;
    });

    try {
      await updateCartItemQuantity(productId, nextQuantity);
      setPageError('');
    } catch (error) {
      if (error.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      setPageError(error.message || 'Failed to update item quantity.');
    } finally {
      setUpdatingProductIds((previous) => {
        const next = new Set(previous);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleToggleSelect = (cartItemId, checked) => {
    setSelectedCartItemIds((previous) => {
      if (checked) {
        return previous.includes(cartItemId) ? previous : [...previous, cartItemId];
      }

      return previous.filter((id) => id !== cartItemId);
    });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedCartItemIds([]);
      return;
    }

    setSelectedCartItemIds(selectableItemIds);
  };

  const handleProceedToCheckout = () => {
    const selectedIds = selectedItems.map((item) => item.cartItemId);
    sessionStorage.setItem(CHECKOUT_SELECTION_KEY, JSON.stringify(selectedIds));
    navigate('/checkout', { state: { selectedCartItemIds: selectedIds } });
  };

  return (
    <div className="cart-page">
      <section className="cart-header">
        <div>
          <h2>Giỏ hàng của bạn</h2>
          <p className="cart-header-subtitle">Chọn các mục bạn muốn đưa đến thanh toán.</p>
        </div>
      </section>

      {isLoading && <Loader text="Đang tải giỏ hàng..." />}

      {!isLoading && pageError && <p className="cart-message cart-error">{pageError}</p>}

      {!isLoading && !pageError && visibleItems.length === 0 && (
        <p className="cart-message">Giỏ hàng của bạn trống.</p>
      )}

      {!isLoading && !pageError && visibleItems.length > 0 && (
        <div className="cart-layout">
          <div className="cart-list-panel">
            <div className="cart-actions-bar">
              <label className="cart-select-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  disabled={selectableItemIds.length === 0}
                />
                <span>{allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
              </label>
            </div>

            <div className="cart-table-header" aria-hidden="true">
              <span />
              <span>Sản phẩm</span>
              <span>Giá đơn vị</span>
              <span>Số lượng</span>
            </div>

            <div className="cart-list">
              {visibleItems.map((item) => {
                if (hiddenProductIds.has(item.productId)) {
                  return null;
                }

                return (
                  <CartItemRow
                    key={item.cartItemId || item.productId}
                    item={item}
                    onRemove={() => handleRemove(item)}
                    onQuantityChange={(nextQuantity) => handleQuantityChange(item, nextQuantity)}
                    isUpdatingQuantity={updatingProductIds.has(item.productId)}
                    isSelected={selectedCartItemIds.includes(item.cartItemId)}
                    isSelectable={item.inStock !== false}
                    onToggleSelect={(checked) => handleToggleSelect(item.cartItemId, checked)}
                  />
                );
              })}
            </div>
          </div>

          <aside className="cart-summary-panel">
            <h3 className="cart-summary-title">Tóm tắt thanh toán</h3>
            <div className="cart-summary-row">
              <span>Các mục được chọn</span>
              <strong>{selectedItems.length}</strong>
            </div>
            <div className="cart-summary-row cart-summary-row--total">
              <span>Tổng cộng</span>
              <strong>{formatCurrency(selectedSubtotal)}</strong>
            </div>
            <Button
              type="button"
              className="cart-checkout-button"
              disabled={selectedItems.length === 0}
              onClick={handleProceedToCheckout}
            >
              Tiến hành thanh toán
            </Button>
          </aside>
        </div>
      )}

      {undoToast?.type === 'undo' && (
        <div className="cart-undo-toast" role="status" aria-live="polite">
          <span>{undoToast.removedItem.productName} đã bị xóa. </span>
          <button type="button" className="cart-undo-link" onClick={handleUndoRemove} disabled={isRestoringItem}>
            Khôi phục?
          </button>
        </div>
      )}

      <ScrollToTop />
    </div>
  );
};
