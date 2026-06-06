/** Global exclusive playback — only one video plays at a time. */

type Listener = (activeId: string | null) => void;

let _activeId: string | null = null;
const _listeners = new Set<Listener>();

function _notify() {
  for (const fn of _listeners) fn(_activeId);
}

/** Subscribe to active video changes. Returns unsubscribe fn. */
export function onActiveVideoChange(fn: Listener): () => void {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

/** Get the currently active video widget ID. */
export function getActiveVideoId(): string | null {
  return _activeId;
}

/** Register this video as the active one, pausing any other. */
export function claimActiveVideo(id: string): void {
  if (_activeId === id) return;
  _activeId = id;
  _notify();
}

/** Release active status (e.g. on unmount or pause). */
export function releaseActiveVideo(id: string): void {
  if (_activeId !== id) return;
  _activeId = null;
  _notify();
}
