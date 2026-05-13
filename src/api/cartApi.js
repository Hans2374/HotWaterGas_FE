import axiosClient from './axiosClient';

export const getMyCart = async () => {
  try {
    const response = await axiosClient.get('/api/cart');
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to load cart.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const addToCart = async (productId, quantity = 1) => {
  try {
    const response = await axiosClient.post('/api/cart', { productId, quantity });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to add item to cart.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const updateCartItemQuantity = async (productId, quantity) => {
  try {
    const response = await axiosClient.put(`/api/cart/${productId}/quantity`, { quantity });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to update item quantity.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const removeFromCart = async (productId) => {
  try {
    await axiosClient.delete(`/api/cart/${productId}`);
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to remove item from cart.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};
