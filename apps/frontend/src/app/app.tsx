import { RouterProvider } from '@tanstack/react-router';
import { useAuthBootstrap } from '@/features/auth/use-auth-bootstrap';
import { router } from './router';

export function App() {
  useAuthBootstrap();
  return <RouterProvider router={router} />;
}

export default App;
