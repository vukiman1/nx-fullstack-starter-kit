import { useEffect, useRef } from 'react';
import { appConfig } from '@/config/app-config';
import { ensureGoogleIdentity } from '@/lib/google-identity';

export function GoogleSignInButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientId = appConfig.google.clientId;

  useEffect(() => {
    const container = containerRef.current;
    if (!clientId || !container) {
      return;
    }
    let cancelled = false;

    // The credential callback is registered once by <GoogleOneTap />; this only draws the button.
    void ensureGoogleIdentity({ clientId, callback: () => undefined }).then((identity) => {
      if (!cancelled) {
        identity.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: 320,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) {
    return null;
  }

  return <div ref={containerRef} className="grid place-items-center" />;
}
