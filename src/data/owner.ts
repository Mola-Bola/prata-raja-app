// Owner allow-list: EXPO_PUBLIC_OWNER_EMAIL_SHA256 (comma-separated SHA-256 hex of lower-cased emails, set at build time).
// Unset: any signed-in user passes (dev, e2e). Set: only listed owners play and sign-up is hidden.
export const OWNER_HASHES = (process.env.EXPO_PUBLIC_OWNER_EMAIL_SHA256 ?? '').split(',').map((h: string) => h.trim().toLowerCase()).filter(Boolean);
export const SIGNUP_OPEN = OWNER_HASHES.length === 0;

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Fails closed: no email (anonymous guest) or no crypto means not allowed whenever a list is set. */
export async function isOwnerEmail(email: string | null | undefined, hashes: readonly string[] = OWNER_HASHES): Promise<boolean> {
  if (!hashes.length) return true;
  if (!email) return false;
  try {
    return hashes.includes(await sha256Hex(email.trim().toLowerCase()));
  } catch {
    return false;
  }
}
