import { NextRequest } from 'next/server';
import { secureJson, serverErrorResponse } from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

type TxStatus = 'confirmed' | 'pending' | 'failed' | 'refunded';

function mapInvoiceStatus(status: string): TxStatus {
  if (status === 'paid') return 'confirmed';
  if (status === 'void' || status === 'uncollectible') return 'failed';
  if (status === 'draft' || status === 'open') return 'pending';
  return 'pending';
}

/**
 * GET /api/admin/payment-sync
 * Returns billing_invoices as transactions + monthly settlement aggregates.
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const db = createServiceRoleClient();
    const { data: invoices, error } = await db
      .from('billing_invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return secureJson({ error: error.message }, 500);

    const userIds = [...new Set((invoices || []).map((i) => i.user_id).filter(Boolean))];
    const subIds = [
      ...new Set((invoices || []).map((i) => i.subscription_id).filter(Boolean)),
    ];

    const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
      userIds.length
        ? db.from('user_profiles').select('id, email, full_name').in('id', userIds)
        : Promise.resolve({ data: [] as { id: string; email: string; full_name: string }[] }),
      subIds.length
        ? db.from('subscriptions').select('id, plan_name, plan_id').in('id', subIds)
        : Promise.resolve({ data: [] as { id: string; plan_name: string; plan_id: string }[] }),
    ]);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const subMap = new Map((subscriptions || []).map((s) => [s.id, s]));

    const transactions = (invoices || []).map((inv) => {
      const profile = profileMap.get(inv.user_id);
      const sub = inv.subscription_id ? subMap.get(inv.subscription_id) : null;
      let status = mapInvoiceStatus(inv.status || 'open');
      if (inv.invoice_type === 'prorated_refund') status = 'refunded';

      return {
        id: inv.id,
        user_id: inv.user_id,
        user_email: profile?.email || '—',
        user_name: profile?.full_name || '—',
        amount_inr: inv.total_amount_inr || inv.amount_inr || 0,
        status,
        payment_method: inv.razorpay_payment_id ? 'Card/UPI' : 'Manual',
        plan_name: sub?.plan_name || sub?.plan_id || '—',
        razorpay_payment_id: inv.razorpay_payment_id,
        razorpay_order_id: inv.razorpay_order_id,
        created_at: inv.created_at,
        settled_at: inv.paid_at,
        refund_reason: null,
        retry_attempt: 0,
      };
    });

    // Monthly settlement from invoices
    const monthMap = new Map<
      string,
      {
        period: string;
        sortKey: string;
        gross_inr: number;
        refunds_inr: number;
        net_inr: number;
        tx_count: number;
        refund_count: number;
      }
    >();

    for (const tx of transactions) {
      const d = new Date(tx.created_at);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const period = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const entry = monthMap.get(sortKey) || {
        period,
        sortKey,
        gross_inr: 0,
        refunds_inr: 0,
        net_inr: 0,
        tx_count: 0,
        refund_count: 0,
      };
      if (tx.status === 'refunded') {
        entry.refunds_inr += tx.amount_inr;
        entry.refund_count += 1;
      } else if (tx.status === 'confirmed') {
        entry.gross_inr += tx.amount_inr;
        entry.tx_count += 1;
      } else {
        entry.tx_count += 1;
      }
      entry.net_inr = entry.gross_inr - entry.refunds_inr;
      monthMap.set(sortKey, entry);
    }

    const settlement = [...monthMap.values()]
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      .map(({ sortKey: _s, ...rest }) => rest);

    const confirmed = transactions.filter((t) => t.status === 'confirmed');
    const pending = transactions.filter((t) => t.status === 'pending');
    const refunded = transactions.filter((t) => t.status === 'refunded');
    const failed = transactions.filter((t) => t.status === 'failed');

    return secureJson({
      data: {
        transactions,
        settlement,
      },
      kpis: {
        confirmed_count: confirmed.length,
        pending_count: pending.length,
        refunded_count: refunded.length,
        failed_count: failed.length,
        confirmed_inr: confirmed.reduce((s, t) => s + t.amount_inr, 0),
        pending_inr: pending.reduce((s, t) => s + t.amount_inr, 0),
        refunded_inr: refunded.reduce((s, t) => s + t.amount_inr, 0),
      },
    });
  } catch {
    return serverErrorResponse();
  }
}
