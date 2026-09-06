import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { sanitizeRedirectUrl } from '@/lib/security/sessionSecurity';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');
  const type = searchParams.get('type');

  // Sanitize the redirect target to prevent open redirect attacks
  const next = sanitizeRedirectUrl(rawNext, '/');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If this is a password recovery flow, redirect to reset-password page
      if (type === 'recovery' || next === '/reset-password') {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // On failure, redirect to login without leaking error details
  return NextResponse.redirect(`${origin}/login`);
}
