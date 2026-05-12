import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { appConfig } from '@/config/app-config';
import type {
  ApiSuccessEnvelope,
  PaginatedResult,
  PaginationMetadata,
} from '@org/shared-contracts';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError, isApiErrorEnvelope } from './api-error';

const REFRESH_PATH = '/auth/refresh-token';
const LOGIN_PATH = '/auth/login';
const REGISTER_PATH = '/auth/register';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const instance: AxiosInstance = axios.create({
  baseURL: appConfig.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  await instance.get(REFRESH_PATH);
}

instance.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = originalRequest?.url ?? '';

    const isAuthEndpoint =
      url.startsWith(LOGIN_PATH) ||
      url.startsWith(REGISTER_PATH) ||
      url.startsWith(REFRESH_PATH);

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        await refreshPromise;
        return instance(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearUser();
        return Promise.reject(toApiError(refreshError));
      } finally {
        refreshPromise = null;
      }
    }

    return Promise.reject(toApiError(error));
  },
);

function toApiError(error: unknown): unknown {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (isApiErrorEnvelope(data)) {
      return new ApiError(data);
    }
  }
  return error;
}

function unwrap<T>(envelope: ApiSuccessEnvelope<T>): T {
  return envelope.data;
}

function unwrapPaginated<T>(
  envelope: ApiSuccessEnvelope<T[]>,
): PaginatedResult<T> {
  const metadata: PaginationMetadata = envelope.metadata ?? {
    page: 1,
    limit: envelope.data.length,
    totalItems: envelope.data.length,
    totalPages: 1,
  };
  return { items: envelope.data, metadata };
}

export const httpRequest = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    instance.get<unknown, ApiSuccessEnvelope<T>>(url, config).then(unwrap<T>),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance
      .post<unknown, ApiSuccessEnvelope<T>>(url, data, config)
      .then(unwrap<T>),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance
      .put<unknown, ApiSuccessEnvelope<T>>(url, data, config)
      .then(unwrap<T>),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance
      .patch<unknown, ApiSuccessEnvelope<T>>(url, data, config)
      .then(unwrap<T>),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    instance
      .delete<unknown, ApiSuccessEnvelope<T>>(url, config)
      .then(unwrap<T>),
  getPaginated: <T>(url: string, config?: AxiosRequestConfig) =>
    instance
      .get<unknown, ApiSuccessEnvelope<T[]>>(url, config)
      .then(unwrapPaginated<T>),
};

export default httpRequest;
