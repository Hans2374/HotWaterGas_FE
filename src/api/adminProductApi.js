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
    console.groupCollapsed('[AdminProductEdit] API request payload (legacy adminProductApi)');
    console.log('productId', id);
    console.log('imagesLength', Array.isArray(data?.images) ? data.images.length : 0);
    console.log('images', Array.isArray(data?.images)
      ? data.images.map((image, index) => ({
          id: image?.id ?? null,
          imageUrl: image?.url ?? image?.imageUrl ?? '',
          isPrimary: index === 0,
          displayOrder: index
        }))
      : []);
    console.log('requestBody', data);
    console.groupEnd();

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
