import axiosClient from './axiosClient';

const normalizePaymentResponse = (payload) => ({
  orderId: payload?.orderId || payload?.OrderId || '',
  paymentTransactionId: payload?.paymentTransactionId || payload?.PaymentTransactionId || '',
  payOSOrderCode: payload?.payOSOrderCode || payload?.PayOSOrderCode || '',
  checkoutUrl: payload?.checkoutUrl || payload?.CheckoutUrl || '',
  qrCodeUrl: payload?.qrCodeUrl || payload?.QrCodeUrl || null,
  status: payload?.status || payload?.Status || 'Pending',
  expiresAt: payload?.expiresAt || payload?.ExpiresAt || null
});

const normalizePaymentReturnResponse = (payload) => ({
  success: Boolean(payload?.success ?? payload?.Success ?? false),
  message: payload?.message || payload?.Message || 'Payment status unknown',
  orderCode: payload?.orderCode || payload?.OrderCode || '',
  status: payload?.status || payload?.Status || 'unknown'
});

/**
 * Initiate payment for selected cart items
 * @param {string[]} selectedCartItemIds - Array of cart item IDs to pay for
 * @returns {Promise<{orderId, paymentTransactionId, payOSOrderCode, checkoutUrl, qrCodeUrl, status}>}
 */
export const createPayment = async (selectedCartItemIds = []) => {
  try {
    if (!Array.isArray(selectedCartItemIds) || selectedCartItemIds.length === 0) {
      throw new Error('At least one cart item must be selected for payment');
    }

    console.log('[paymentApi.createPayment] request payload', { selectedCartItemIds });
    const response = await axiosClient.post('/api/payments/create', {
      selectedCartItemIds
    });

    console.log('[paymentApi.createPayment] response', response.data);
    return normalizePaymentResponse(response.data);
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to initiate payment'
      };
    }

    if (error.message) {
      throw {
        status: 0,
        message: error.message
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

/**
 * Handle PayOS payment return callback
 * Reads query parameters from current URL and passes them to backend
 * @param {string} orderCode - Order code from PayOS return
 * @param {string} status - Payment status from PayOS
 * @param {boolean} success - Whether payment was successful
 * @param {string} transactionId - Optional transaction ID
 * @param {number} amountPaid - Optional amount paid
 * @returns {Promise<{success, message, orderCode, status}>}
 */
export const getPaymentReturn = async (orderCode, status, success, transactionId, amountPaid) => {
  try {
    if (!orderCode) {
      throw new Error('Order code is required');
    }

    const queryParams = new URLSearchParams();
    queryParams.append('orderCode', orderCode);
    if (status) {
      queryParams.append('status', status);
    }
    queryParams.append('success', String(success));
    if (transactionId) {
      queryParams.append('transactionId', transactionId);
    }
    if (amountPaid !== undefined && amountPaid !== null) {
      queryParams.append('amountPaid', String(amountPaid));
    }

    console.log('[paymentApi.getPaymentReturn] query', { orderCode, status, success, transactionId, amountPaid });
    const response = await axiosClient.get(`/api/payments/return?${queryParams.toString()}`);
    console.log('[paymentApi.getPaymentReturn] response', response.data);

    return normalizePaymentReturnResponse(response.data);
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to retrieve payment status'
      };
    }

    if (error.message) {
      throw {
        status: 0,
        message: error.message
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};
