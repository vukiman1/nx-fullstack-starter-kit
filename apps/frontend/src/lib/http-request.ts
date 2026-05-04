import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';
import { appConfig } from '@/config/app-config';
import { tokenService } from '@/services/token-service';

const PUBLIC_PATHS = ['/auth/login', '/auth/register'];

const instance: AxiosInstance = axios.create({
  baseURL: appConfig.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

instance.interceptors.request.use((config) => {
  const accessToken = tokenService.getAccessToken();
  const isPublic = config.url
    ? PUBLIC_PATHS.some((path) => config.url?.startsWith(path))
    : false;

  if (accessToken && !isPublic) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenService.clearAccessToken();
    }
    return Promise.reject(error);
  },
);

export const httpRequest = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    instance.get<T, T>(url, config),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.post<T, T>(url, data, config),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.put<T, T>(url, data, config),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.patch<T, T>(url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    instance.delete<T, T>(url, config),
};

export default httpRequest;
