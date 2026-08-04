import { toast } from 'react-toastify';

const AUTO_CLOSE_MS = 4000;

/**
 * One place to raise user-facing feedback, so callers do not each pick their own wording style or
 * duration. Errors stay up longer than confirmations because they usually need reading twice.
 */
export const notify = {
  success(message: string) {
    toast.success(message, { autoClose: AUTO_CLOSE_MS });
  },
  error(message: string) {
    toast.error(message, { autoClose: AUTO_CLOSE_MS * 2 });
  },
  info(message: string) {
    toast.info(message, { autoClose: AUTO_CLOSE_MS });
  },
};
