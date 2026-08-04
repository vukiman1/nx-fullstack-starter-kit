import { useNavigate, useSearch } from '@tanstack/react-router';
import { isInternalPath } from './route-guards';

export type AuthModalView = 'login' | 'register';

/**
 * The modal is driven by the `auth` search param, so it survives a reload, closes with the back
 * button, and can be linked to. `redirect` carries the page a guard bounced the user away from.
 */
export function useAuthModal() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { auth?: AuthModalView; redirect?: string };

  const open = (view: AuthModalView) =>
    navigate({ to: '.', search: (previous) => ({ ...previous, auth: view }) });

  const close = () =>
    navigate({
      to: '.',
      search: (previous) => {
        const next = { ...(previous as Record<string, unknown>) };
        delete next.auth;
        delete next.redirect;
        return next;
      },
    });

  /** Called after a successful sign-in: leave the modal and honour a guard's redirect if there is one. */
  const finish = async () => {
    const target = isInternalPath(search.redirect) ? search.redirect : null;
    if (target) {
      await navigate({ to: target as never });
      return;
    }
    await close();
  };

  return { view: search.auth ?? null, redirect: search.redirect, open, close, finish };
}
