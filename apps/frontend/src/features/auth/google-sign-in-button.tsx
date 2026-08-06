import { useEffect, useRef, useState } from 'react';
import { GoogleIcon } from '@/components/icons/google-icon';
import { Button } from '@/components/ui/button';
import { appConfig } from '@/config/app-config';
import { ensureGoogleIdentity } from '@/lib/google-identity';

/** Google clamps the rendered button to this width. */
const MAX_BUTTON_WIDTH = 400;

/**
 * Our own button, with Google's real one laid transparently over it.
 *
 * Only Google's button produces the ID token the backend verifies, so it has to be the thing that
 * actually gets clicked — but its own styling cannot be made to match the buttons beside it, and
 * it centres its label inside whatever width it is given. Rendering it invisibly on top keeps the
 * credential flow intact while the visible button follows the design system, which is also what
 * lets further providers line up with it later.
 */
export function GoogleSignInButton() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const clientId = appConfig.google.clientId;

  // renderButton takes a number, never a percentage, so the overlay has to be measured to cover
  // the visible button exactly. Anything narrower would leave a dead strip that swallows clicks.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.min(Math.round(entry.contentRect.width), MAX_BUTTON_WIDTH));
    });
    observer.observe(overlay);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!clientId || !overlay || width === 0) {
      return;
    }
    let cancelled = false;

    // The credential callback is registered once by <GoogleOneTap />; this only draws the button.
    void ensureGoogleIdentity({ clientId, callback: () => undefined }).then((identity) => {
      if (!cancelled) {
        identity.renderButton(overlay, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width,
          locale: 'en',
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clientId, width]);

  if (!clientId) {
    return null;
  }

  return (
    <div className="relative">
      <Button className="w-full" tabIndex={-1} type="button" variant="outline">
        <GoogleIcon className="size-4" />
        Continue with Google
      </Button>

      {/* Transparent, but on top: this is what receives the click. */}
      <div className="absolute inset-0 overflow-hidden opacity-0" ref={overlayRef} />
    </div>
  );
}
