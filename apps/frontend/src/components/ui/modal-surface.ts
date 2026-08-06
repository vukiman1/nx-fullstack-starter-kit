/**
 * Shared by Dialog and AlertDialog so an animation change cannot land on one and miss the other.
 * `data-slot` is what the reduced-motion rule in styles.css targets; a modal without it keeps
 * animating for users who asked the system to stop.
 */
export const MODAL_BACKDROP_PROPS = {
  className:
    'fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-backdrop-in data-[state=closed]:animate-backdrop-out',
  'data-slot': 'modal-backdrop',
} as const;

export const MODAL_PANEL_PROPS = {
  className:
    'fixed left-1/2 top-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg data-[state=open]:animate-modal-in data-[state=closed]:animate-modal-out',
  'data-slot': 'modal',
} as const;
