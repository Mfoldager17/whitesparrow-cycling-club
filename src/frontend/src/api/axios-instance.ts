import axios, { AxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const instance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export { instance as apiClient };

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

// Token refresh state
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

// On 401, attempt to refresh the access token before giving up
instance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error?.config as AxiosRequestConfig & { _retry?: boolean };

    if (error?.response?.status === 401 && typeof window !== 'undefined' && !originalRequest?._retry) {
      const storedRefreshToken = window.localStorage.getItem('refreshToken');

      if (!storedRefreshToken) {
        window.localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` };
          return instance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: storedRefreshToken });
        const { accessToken, refreshToken: newRefreshToken } = data.data;

        window.localStorage.setItem('accessToken', accessToken);
        window.localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${accessToken}` };
        processQueue(null, accessToken);
        return instance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        window.localStorage.removeItem('accessToken');
        window.localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
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
  const promise = instance<{ data: T }>({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data.data as T);

  // Allow React Query to cancel in-flight requests
  // @ts-expect-error cancel is added dynamically
  promise.cancel = () => source.cancel('Query was cancelled');

  return promise;
};

export default instance;
