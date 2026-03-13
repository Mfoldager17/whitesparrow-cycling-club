import axios, { AxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const instance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage on every request
instance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// If a 401 is received, clear credentials and redirect to login
instance.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem('accessToken');
      window.localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Orval mutator function — wraps the axios instance
export const axiosInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = axios.CancelToken.source();
  const promise = instance<T>({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data as T);

  // Allow React Query to cancel in-flight requests
  // @ts-expect-error cancel is added dynamically
  promise.cancel = () => source.cancel('Query was cancelled');

  return promise;
};

export default instance;
