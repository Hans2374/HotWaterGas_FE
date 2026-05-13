import axiosClient from '../api/axiosClient';

export const getDiscounts = async () => {
  const response = await axiosClient.get('/api/discounts');
  return response.data;
};
