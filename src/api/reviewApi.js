import axiosClient from './axiosClient';

const reviewApi = {
  getProductReviews: (productId, page = 1, pageSize = 10) =>
    axiosClient.get(`/api/products/${productId}/reviews`, {
      params: { page, pageSize }
    }),

  createReview: (productId, rating, comment) =>
    axiosClient.post(`/api/products/${productId}/reviews`, {
      productId,
      rating,
      comment
    }),

  updateMyReview: (productId, rating, comment) =>
    axiosClient.put(`/api/products/${productId}/reviews/me`, {
      rating,
      comment
    })
};

export default reviewApi;
