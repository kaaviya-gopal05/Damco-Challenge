// AES-GCM encrypt/decrypt for Gmail OAuth tokens at rest, using the server-only
// GMAIL_TOKEN_ENCRYPTION_KEY secret (a base64-encoded 32-byte key — generate one with
// `openssl rand -base64 32` and set it via `supabase secrets set`). Only these edge functions
// ever see a raw token; gmail_oauth_tokens in Postgres only ever stores ciphertext.

async function importKey(base64Key: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function encryptToken(plaintext: string, base64Key: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await importKey(base64Key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return { ciphertext: toBase64(new Uint8Array(cipherBuffer)), iv: toBase64(iv) };
}

export async function decryptToken(ciphertextB64: string, ivB64: string, base64Key: string): Promise<string> {
  const key = await importKey(base64Key);
  const iv = fromBase64(ivB64);
  const cipherBytes = fromBase64(ciphertextB64);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
  return new TextDecoder().decode(plainBuffer);
}
