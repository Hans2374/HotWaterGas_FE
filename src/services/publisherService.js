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
    message: 'Network error. Please check your connection.'
  };
};

export const getAdminPublishers = async (params = {}) => {
  try {
    const requestParams = {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10
    };
    if (params.search) {
      requestParams.search = params.search;
    }
    const response = await axiosClient.get('/api/admin/publishers', { params: requestParams });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to load publishers.');
  }
};

export const getPublisherById = async (id) => {
  try {
    const response = await axiosClient.get(`/api/admin/publishers/${id}`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to load publisher.');
  }
};

export const createPublisher = async (payload) => {
  try {
    const response = await axiosClient.post('/api/admin/publishers', payload);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to create publisher.');
  }
};

export const updatePublisher = async (id, payload) => {
  try {
    const response = await axiosClient.put(`/api/admin/publishers/${id}`, payload);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to update publisher.');
  }
};

export const deletePublisher = async (id) => {
  try {
    await axiosClient.delete(`/api/admin/publishers/${id}`);
  } catch (error) {
    throw toApiError(error, 'Failed to delete publisher.');
  }
};

export const getPublishers = async (params = {}) => {
  try {
    const requestParams = {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 100
    };
    if (params.search) {
      requestParams.search = params.search;
    }
    const response = await axiosClient.get('/api/admin/publishers', { params: requestParams });
    return response.data.items || [];
  } catch (error) {
    throw toApiError(error, 'Failed to load publishers.');
  }
};
