import axiosClient from './axiosClient';

const normalizeCheckoutPreviewItem = (item) => ({
  cartItemId: item?.cartItemId || item?.CartItemId || '',
  productId: item?.productId || item?.ProductId || '',
  productName: item?.productName || item?.ProductName || '',
  productSlug: item?.productSlug || item?.ProductSlug || '',
  productImage: item?.productImage || item?.ProductImage || '',
  price: item?.price ?? item?.Price ?? 0,
  discountPercentage: item?.discountPercentage ?? item?.DiscountPercentage ?? 0,
  discountPrice: item?.discountPrice ?? item?.DiscountPrice ?? item?.finalPrice ?? item?.FinalPrice ?? null,
  hasDiscount: item?.hasDiscount ?? item?.HasDiscount ?? false,
  unitPrice: item?.unitPrice ?? item?.UnitPrice ?? item?.discountPrice ?? item?.DiscountPrice ?? 0,
  quantity: item?.quantity ?? item?.Quantity ?? 0,
  lineTotal: item?.lineTotal ?? item?.LineTotal ?? 0
});

const normalizeInvalidItem = (item) => ({
  cartItemId: item?.cartItemId || item?.CartItemId || '',
  productId: item?.productId || item?.ProductId || '',
  productName: item?.productName || item?.ProductName || '',
  reasonCode: item?.reasonCode || item?.ReasonCode || '',
  message: item?.message || item?.Message || ''
});

const normalizeCheckoutPreview = (payload) => ({
  validItems: (payload?.validItems || payload?.ValidItems || []).map(normalizeCheckoutPreviewItem),
  invalidItems: (payload?.invalidItems || payload?.InvalidItems || []).map(normalizeInvalidItem),
  subtotal: Number(payload?.subtotal ?? payload?.Subtotal ?? 0) || 0,
  discountAmount: Number(payload?.discountAmount ?? payload?.DiscountAmount ?? 0) || 0,
  finalTotal: Number(payload?.finalTotal ?? payload?.FinalTotal ?? 0) || 0,
  canProceed: Boolean(payload?.canProceed ?? payload?.CanProceed ?? false),
  blockingMessages: Array.isArray(payload?.blockingMessages || payload?.BlockingMessages)
    ? (payload?.blockingMessages || payload?.BlockingMessages)
    : []
});

export const previewCheckout = async (cartItemIds = []) => {
  try {
    const response = await axiosClient.post('/api/checkout/preview', { cartItemIds });
    return normalizeCheckoutPreview(response.data);
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to preview checkout.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};
