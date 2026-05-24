import axiosClient from '../api/axiosClient';

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

const normalizePagedPayload = (payload) => {
  const items = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.Data)
      ? payload.Data
      : [];

  const page = Number(payload?.page ?? payload?.Page ?? 1) || 1;
  const pageSize = Number(payload?.pageSize ?? payload?.PageSize ?? items.length ?? 0) || 1;
  const totalItems = Number(payload?.totalItems ?? payload?.TotalItems ?? items.length ?? 0) || 0;
  const totalPages = Number(payload?.totalPages ?? payload?.TotalPages ?? 1) || 1;

  return {
    data: items,
    page,
    pageSize,
    totalItems,
    totalPages
  };
};

export const getAdminUsers = async (query = {}) => {
  try {
    const params = {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    };

    if (query.search) {
      params.search = query.search;
    }
    if (query.role) {
      params.role = query.role;
    }
    if (query.isSuspended !== undefined && query.isSuspended !== null) {
      params.isSuspended = query.isSuspended;
    }

    const response = await axiosClient.get('/api/admin/users', { params });
    return normalizePagedPayload(response.data);
  } catch (error) {
    throw toApiError(error, 'Failed to load users.');
  }
};

export const toggleUserSuspension = async (userId) => {
  try {
    await axiosClient.patch(`/api/admin/users/${userId}/suspension`);
  } catch (error) {
    const apiError = toApiError(error, 'Failed to update user suspension status.');
    throw apiError;
  }
};

export const getAdminUserDetail = async (userId) => {
  try {
    const response = await axiosClient.get(`/api/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to load user details.');
  }
};
