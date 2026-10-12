// What this device keeps belongs to one signed-in person: the query cache (saved in storage so the app works
// offline) and drafts saved on the device. Whenever a different person, or nobody, is signed in, all of it is
// cleared, so the next person on this phone or browser never sees it. Not only on "Sign out": a session can also
// end because it expired or was revoked, or someone else signs in from another tab.

const OWNER_KEY = 'prata-raja-data-owner';

/** Whose data the device holds: a user id, '' for nobody signed in, or null when unknown (older app versions). */
export function dataOwner(): string | null {
  try {
    return globalThis.localStorage?.getItem(OWNER_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setDataOwner(userId: string | null) {
  try {
    globalThis.localStorage?.setItem(OWNER_KEY, userId ?? '');
  } catch {
    /* storage unavailable */
  }
}

/** Must data kept for `owner` be cleared now that `userId` is signed in? Unknown owners always are. */
export function ownerChanged(owner: string | null, userId: string | null): boolean {
  return owner !== (userId ?? '');
}

const resets = new Set<() => void>();

/** Per-person state kept outside the query cache (e.g. an unsent draft) registers how to clear itself. */
export function onSignedInUserChange(reset: () => void): () => void {
  resets.add(reset);
  return () => {
    resets.delete(reset);
  };
}

export function runUserChangeResets() {
  resets.forEach((reset) => {
    try {
      reset();
    } catch {
      /* one broken reset must not stop the others */
    }
  });
}
