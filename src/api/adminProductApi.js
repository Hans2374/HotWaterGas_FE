import axiosClient from './axiosClient';

export const getProducts = async (page = 1, pageSize = 10) => {
  try {
    const response = await axiosClient.get('/api/products/admin', {
      params: { page, pageSize }
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to load products.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const getProductById = async (id) => {
  try {
    const response = await axiosClient.get(`/api/products/${id}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to load product.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const createProduct = async (data) => {
  try {
    const response = await axiosClient.post('/api/products', data);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to create product.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const updateProduct = async (id, data) => {
  try {
    const response = await axiosClient.put(`/api/products/${id}`, data);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to update product.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const softDeleteProduct = async (id) => {
  try {
    await axiosClient.delete(`/api/products/${id}`);
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to delete product.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const hardDeleteProduct = async (id) => {
  try {
    await axiosClient.delete(`/api/products/${id}/hard`);
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to hard delete product.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};
