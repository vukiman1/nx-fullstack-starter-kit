import { Pagination } from './pagination.interface';

export interface FormatResponse {
  statusCode: number;
  success: boolean;
  data: unknown;
  errors?: unknown;
  metadata?: Pagination;
}
