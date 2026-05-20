import axiosClient from './axiosClient';

const toApiError = (error, fallbackMessage) => {
  if (error.response) {
    return {
      status: error.response.status,
      message: error.response.data?.message || fallbackMessage
    };
  }
  return {
    status: 0,
    message: 'Network error. Please check your backend connection.'
  };
};

export const getDashboardSummary = async () => {
  try {
    const response = await axiosClient.get('/api/admin/dashboard/summary');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to load dashboard summary.');
  }
};

export const getRevenueAnalytics = async (range = '7d') => {
  try {
    const response = await axiosClient.get('/api/admin/dashboard/revenue', {
      params: { range }
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw toApiError(error, 'Failed to load revenue analytics.');
  }
};

export const getOrderStatusAnalytics = async () => {
  try {
    const response = await axiosClient.get('/api/admin/dashboard/order-status');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw toApiError(error, 'Failed to load order status analytics.');
  }
};

export const getLowStockProducts = async (threshold = 5) => {
  try {
    const response = await axiosClient.get('/api/admin/dashboard/low-stock', {
      params: { threshold }
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw toApiError(error, 'Failed to load low stock products.');
  }
};

export const getInventoryAlerts = async (threshold = 5) => {
  try {
    const response = await axiosClient.get('/api/admin/dashboard/inventory-alerts', {
      params: { threshold }
    });
    return response.data || { outOfStockProducts: [], lowStockProducts: [] };
  } catch (error) {
    throw toApiError(error, 'Failed to load inventory alerts.');
  }
};

export const getRecentOrders = async (page = 1, pageSize = 10) => {
  try {
    const response = await axiosClient.get('/api/admin/orders/recent', {
      params: { page, pageSize }
    });

    const payload = response.data || {};
    const items = Array.isArray(payload.items) ? payload.items : [];

    return {
      items,
      pageNumber: Number(payload.pageNumber ?? payload.page ?? 1) || 1,
      pageSize: Number(payload.pageSize ?? 10) || 10,
      totalCount: Number(payload.totalCount ?? 0) || 0,
      totalPages: Number(payload.totalPages ?? 1) || 1,
      hasPreviousPage: Boolean(payload.hasPreviousPage ?? false),
      hasNextPage: Boolean(payload.hasNextPage ?? false)
    };
  } catch (error) {
    throw toApiError(error, 'Failed to load recent orders.');
  }
};

export const getAdminOrderDetail = async (orderId) => {
  try {
    const response = await axiosClient.get(`/api/admin/orders/${orderId}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      return Promise.reject({
        status: error.response.status,
        message: error.response.data?.message || 'Failed to load order detail.'
      });
    }
    return Promise.reject({
      status: 0,
      message: 'Network error. Please check your backend connection.'
    });
  }
};
