import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

/**
 * GET /api/referral — referral code + invite history
 * POST /api/referral — { inviteeEmail } create invite
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle();

    const referralCode = 'SMART' + user.id.replace(/-/g, '').slice(0, 6).toUpperCase();

    const { data: rows, error } = await supabase
      .from('referrals')
      .select('id, invitee_email, status, created_at, completed_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return secureJson({ error: error.message }, 500);

    const referrals = rows || [];
    const pending = referrals.filter((r) => r.status === 'pending').length;
    const completed = referrals.filter(
      (r) => r.status === 'completed' || r.status === 'signed_up'
    ).length;

    return secureJson({
      referralCode,
      referralLink: `/register?ref=${referralCode}`,
      isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin',
      stats: {
        totalReferrals: referrals.length,
        pendingReferrals: pending,
        completedReferrals: completed,
        conversionRate:
          referrals.length > 0 ? Math.round((completed / referrals.length) * 1000) / 10 : 0,
      },
      referrals: referrals.map((r) => ({
        id: r.id,
        inviteeEmail: r.invitee_email,
        status: r.status,
        createdAt: r.created_at,
        completedAt: r.completed_at,
      })),
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json().catch(() => ({}));
    const inviteeEmail = String(body.inviteeEmail || body.invitee_email || '')
      .trim()
      .toLowerCase();

    if (!inviteeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail)) {
      return badRequestResponse('Valid inviteeEmail is required');
    }

    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: user.id,
        invitee_email: inviteeEmail,
        status: 'pending',
      })
      .select('id, invitee_email, status, created_at, completed_at')
      .single();

    if (error) return secureJson({ error: error.message }, 500);

    return secureJson({
      success: true,
      referral: {
        id: referral.id,
        inviteeEmail: referral.invitee_email,
        status: referral.status,
        createdAt: referral.created_at,
        completedAt: referral.completed_at,
      },
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
