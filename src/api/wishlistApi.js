import axiosClient from './axiosClient';

export const getWishlist = async () => {
  try {
    const response = await axiosClient.get('/api/wishlist');
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to load wishlist.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const addToWishlist = async (productId) => {
  try {
    const response = await axiosClient.post(`/api/wishlist/${productId}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to add to wishlist.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const removeFromWishlist = async (productId) => {
  try {
    await axiosClient.delete(`/api/wishlist/${productId}`);
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to remove from wishlist.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};
