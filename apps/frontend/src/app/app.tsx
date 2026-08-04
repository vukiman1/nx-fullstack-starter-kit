import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { useAuthBootstrap } from '@/features/auth/use-auth-bootstrap';
import { queryClient } from '@/lib/query-client';
import { router } from './router';

export function App() {
  useAuthBootstrap();
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
      <ToastContainer
        autoClose={4000}
        closeOnClick
        newestOnTop
        position="top-right"
        theme="colored"
      />
    </QueryClientProvider>
  );
}

export default App;
