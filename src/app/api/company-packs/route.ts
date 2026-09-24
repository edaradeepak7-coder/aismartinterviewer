import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

/**
 * GET /api/company-packs — published packs + unlock state
 * POST /api/company-packs — { packId } unlock (consumes credits when cost > 0)
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const [packsRes, unlocksRes, subRes] = await Promise.all([
      supabase
        .from('company_packs')
        .select('id, company_name, title, description, credit_cost, is_published')
        .eq('is_published', true)
        .order('company_name'),
      supabase
        .from('company_pack_unlocks')
        .select('pack_id, unlocked_at')
        .eq('user_id', user.id),
      supabase
        .from('subscriptions')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .in('status', ['active', 'paused', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (packsRes.error) return secureJson({ error: packsRes.error.message }, 500);

    const unlockedIds = new Set((unlocksRes.data || []).map((u) => u.pack_id));
    const packs = (packsRes.data || []).map((p) => ({
      id: p.id,
      companyName: p.company_name,
      title: p.title,
      description: p.description || '',
      creditCost: p.credit_cost,
      unlocked: unlockedIds.has(p.id),
    }));

    return secureJson({
      packs,
      unlockedIds: [...unlockedIds],
      creditsRemaining: subRes.data?.credits_remaining ?? 0,
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
    const packId = body.packId || body.pack_id;
    if (!packId || typeof packId !== 'string') {
      return badRequestResponse('packId is required');
    }

    const { data: pack } = await supabase
      .from('company_packs')
      .select('id, credit_cost, is_published, title')
      .eq('id', packId)
      .maybeSingle();

    if (!pack || !pack.is_published) {
      return secureJson({ error: 'Pack not found' }, 404);
    }

    const { data: existing } = await supabase
      .from('company_pack_unlocks')
      .select('id')
      .eq('user_id', user.id)
      .eq('pack_id', packId)
      .maybeSingle();

    if (existing) {
      return secureJson({ success: true, alreadyUnlocked: true });
    }

    const cost = Number(pack.credit_cost) || 0;
    if (cost > 0) {
      const { data: creditResult, error: creditError } = await supabase.rpc('consume_credits', {
        p_user_id: user.id,
        p_action_type: 'unlock',
        p_feature: 'company_pack',
        p_credits: cost,
        p_reference_id: packId,
        p_reference_type: 'company_pack',
      });

      if (creditError) {
        return secureJson({ error: creditError.message || 'Credit deduction failed' }, 500);
      }
      const result = creditResult as { success?: boolean; error?: string } | null;
      if (result && result.success === false) {
        return secureJson(
          { error: result.error || 'Insufficient credits', creditsRequired: cost },
          402
        );
      }
    }

    const { error: unlockError } = await supabase.from('company_pack_unlocks').insert({
      user_id: user.id,
      pack_id: packId,
    });

    if (unlockError) return secureJson({ error: unlockError.message }, 500);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('credits_remaining')
      .eq('user_id', user.id)
      .in('status', ['active', 'paused', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return secureJson({
      success: true,
      packId,
      creditsRemaining: sub?.credits_remaining ?? null,
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
