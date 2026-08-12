import axios from 'axios';

const merchantApi = axios.create({ baseURL: '/api' });

merchantApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('merchant_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

merchantApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('merchant_token');
      localStorage.removeItem('merchant_user');
      window.location.href = '/merchant/login';
    }
    return Promise.reject(err);
  }
);

export default merchantApi;
