import type { GoogleIdentityApi } from '@/types/google-identity';

// hl pins the language for everything Google renders, the One Tap prompt included. Left off, it
// follows the browser, so one part of an English app speaks whatever the visitor's browser does.
const GIS_SRC = 'https://accounts.google.com/gsi/client?hl=en';

let scriptPromise: Promise<GoogleIdentityApi> | null = null;
let initialized = false;
let api: GoogleIdentityApi | null = null;

interface EnsureOptions {
  clientId: string;
  callback: (credential: string) => void;
}

function loadScript(): Promise<GoogleIdentityApi> {
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<GoogleIdentityApi>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google.accounts.id);
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id);
      } else {
        reject(new Error('Google Identity Services loaded without an accounts API'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function ensureGoogleIdentity({
  clientId,
  callback,
}: EnsureOptions): Promise<GoogleIdentityApi> {
  const identity = await loadScript();
  if (!initialized) {
    identity.initialize({
      client_id: clientId,
      callback: (response) => callback(response.credential),
      use_fedcm_for_prompt: true,
    });
    initialized = true;
    api = identity;
  }
  return identity;
}

export function promptGoogleOneTap(): void {
  api?.prompt();
}

// Test-only hook to clear the module singleton between cases.
export function resetGoogleIdentityForTests(): void {
  scriptPromise = null;
  initialized = false;
  api = null;
}
