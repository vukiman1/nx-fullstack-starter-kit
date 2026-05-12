import { Pagination } from './pagination.interface';

export interface FormatResponse {
  statusCode: number;
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors?: any;
  metadata?: Pagination;
}
