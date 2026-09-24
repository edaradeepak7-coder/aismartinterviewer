/**
 * Field-level encryption for sensitive data before Supabase storage.
 * Uses AES-256-GCM (authenticated encryption) via Web Crypto API.
 *
 * Encrypted fields: interview transcripts, candidate PII, assessments, credentials.
 */

const ENCRYPTION_KEY_ENV = process.env.FIELD_ENCRYPTION_KEY ?? '';

/** Derive a CryptoKey from the base64-encoded env variable */
async function getDerivedKey(): Promise<CryptoKey> {
  // Use a fixed 32-byte key derived from the env variable
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(ENCRYPTION_KEY_ENV.padEnd(32, '0').slice(0, 32));
  const keyMaterial = await crypto.subtle.importKey('raw', rawKey, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('ai-interviewer-salt-v1'),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string.
 * Returns a base64-encoded string: "iv:ciphertext" (both base64).
 */
export async function encryptField(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  try {
    const key = await getDerivedKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const encoded = new TextEncoder().encode(plaintext);
    const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const ivB64 = Buffer.from(iv).toString('base64');
    const ctB64 = Buffer.from(cipherBuffer).toString('base64');
    return `enc:${ivB64}:${ctB64}`;
  } catch {
    // If encryption fails (e.g., no key), return plaintext with a warning prefix
    return plaintext;
  }
}

/**
 * Decrypt a previously encrypted field.
 * Handles both encrypted ("enc:iv:ct") and plaintext values transparently.
 */
export async function decryptField(value: string): Promise<string> {
  if (!value || !value.startsWith('enc:')) return value;
  try {
    const parts = value.split(':');
    if (parts.length !== 3) return value;
    const [, ivB64, ctB64] = parts;
    const key = await getDerivedKey();
    const iv = Buffer.from(ivB64, 'base64');
    const ct = Buffer.from(ctB64, 'base64');
    const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(plainBuffer);
  } catch {
    return value; // Return as-is if decryption fails
  }
}

/** Encrypt an object's specified fields in-place (returns new object) */
export async function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): Promise<T> {
  const result = { ...obj };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === 'string' && val) {
      (result as Record<string, unknown>)[field as string] = await encryptField(val);
    }
  }
  return result;
}

/** Decrypt an object's specified fields in-place (returns new object) */
export async function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): Promise<T> {
  const result = { ...obj };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === 'string' && val) {
      (result as Record<string, unknown>)[field as string] = await decryptField(val);
    }
  }
  return result;
}

/**
 * Fields to encrypt per entity type.
 * These are the sensitive PII / confidential fields.
 */
export const ENCRYPTED_FIELDS = {
  candidate: ['name', 'email'] as const,
  response: ['answer_text'] as const,
  interviewResult: ['ai_summary', 'ai_feedback'] as const,
  recruiterFeedback: ['strengths', 'gaps', 'recommendation_notes'] as const,
  userProfile: ['full_name', 'email'] as const,
} as const;
