/**
 * TOTP (Time-based One-Time Password) + SMS OTP utilities for MFA.
 * Used for super_admin and institution_admin role logins.
 *
 * Primary: Supabase Auth built-in MFA (TOTP) enrollment and verification.
 * Fallback: SMS-based 6-digit OTP when authenticator app is unavailable.
 */

import { createClient } from '@/lib/supabase/client';

export type MFAFactor = {
  id: string;
  type: 'totp';
  status: 'verified' | 'unverified';
  friendly_name?: string;
};

/** Roles that require MFA */
export const MFA_REQUIRED_ROLES = ['super_admin', 'institution_admin'] as const;
export type MFARequiredRole = (typeof MFA_REQUIRED_ROLES)[number];

/** Check if a role requires MFA */
export function requiresMFA(role: string): boolean {
  return MFA_REQUIRED_ROLES.includes(role as MFARequiredRole);
}

/**
 * Get enrolled MFA factors for the current user.
 */
export async function getMFAFactors(): Promise<MFAFactor[]> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return [];
  return (data.totp ?? []) as MFAFactor[];
}

/**
 * Enroll a new TOTP factor.
 * Returns the QR code URI and secret for the authenticator app.
 */
export async function enrollTOTP(friendlyName = 'AI Interviewer'): Promise<{
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
} | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  });
  if (error || !data) return null;
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/**
 * Verify a TOTP code during enrollment (to confirm the factor).
 */
export async function verifyTOTPEnrollment(factorId: string, code: string): Promise<boolean> {
  const supabase = createClient();
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challengeData) return false;

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });
  return !error;
}

/**
 * Challenge and verify a TOTP code during login.
 * Returns true if verification succeeds.
 */
export async function verifyTOTPLogin(factorId: string, code: string): Promise<boolean> {
  const supabase = createClient();
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challengeData) return false;

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });
  return !error;
}

/**
 * Unenroll (remove) a TOTP factor.
 */
export async function unenrollTOTP(factorId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  return !error;
}

/**
 * Get the MFA assurance level of the current session.
 * Returns 'aal1' (password only) or 'aal2' (password + MFA).
 */
export async function getMFAAssuranceLevel(): Promise<'aal1' | 'aal2' | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return null;
  return data.currentLevel as 'aal1' | 'aal2';
}

/**
 * Check if the current session has completed MFA (AAL2).
 */
export async function isMFAComplete(): Promise<boolean> {
  const level = await getMFAAssuranceLevel();
  return level === 'aal2';
}

/**
 * Check if the user has any verified TOTP factors enrolled.
 */
export async function hasVerifiedTOTP(): Promise<boolean> {
  const factors = await getMFAFactors();
  return factors.some((f) => f.status === 'verified');
}

// ─── SMS OTP Fallback ─────────────────────────────────────────────────────────

/** In-memory SMS OTP store (server-side only; use Redis/DB in production) */
const smsOtpStore = new Map<string, { code: string; expiresAt: number; phone: string }>();

/**
 * Generate a 6-digit SMS OTP and store it for the given user ID.
 * In production, integrate with Twilio/AWS SNS/MSG91 to send the SMS.
 * Returns the code (for server-side sending) and expiry timestamp.
 */
export function generateSmsOtp(userId: string, phone: string): { code: string; expiresAt: number } {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  smsOtpStore.set(userId, { code, expiresAt, phone });
  return { code, expiresAt };
}

/**
 * Verify an SMS OTP for the given user ID.
 * Returns true if the code matches and has not expired.
 */
export function verifySmsOtp(userId: string, code: string): boolean {
  const entry = smsOtpStore.get(userId);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    smsOtpStore.delete(userId);
    return false;
  }
  if (entry.code !== code) return false;
  smsOtpStore.delete(userId); // single-use
  return true;
}

/**
 * Check if a pending SMS OTP exists for the user.
 */
export function hasPendingSmsOtp(userId: string): boolean {
  const entry = smsOtpStore.get(userId);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    smsOtpStore.delete(userId);
    return false;
  }
  return true;
}
