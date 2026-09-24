'use server';
import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const BREVO_BASE = 'https://api.brevo.com/v3';

type CampaignType = 'trial_drip' | 'upgrade_nudge' | 'weekly_digest' | 'reengagement';

interface DripPayload {
  type: CampaignType;
  email: string;
  name?: string;
  planName?: string;
  trialDaysLeft?: number;
  weeklyStats?: { interviews: number; avgScore: number; topSkill: string };
  inactiveDays?: number;
}

const SENDER = { name: 'AI Interviewer', email: 'noreply@aiinterviewer.app' };

function buildEmailContent(payload: DripPayload): { subject: string; htmlContent: string } {
  const { type, name = 'there', planName, trialDaysLeft, weeklyStats, inactiveDays } = payload;

  switch (type) {
    case 'trial_drip':
      return {
        subject: `${trialDaysLeft ? `${trialDaysLeft} days left` : 'Your trial'} — keep the momentum going`,
        htmlContent: `
          <div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#0d9488,#0891b2);padding:32px 40px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">Hi ${name} 👋</h1>
              <p style="margin:8px 0 0;color:#ccfbf1;font-size:15px;">Your Triveda trial is in full swing</p>
            </div>
            <div style="padding:32px 40px;">
              ${trialDaysLeft ? `<div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <span style="color:#f59e0b;font-weight:600;font-size:14px;">⏳ ${trialDaysLeft} days remaining on your trial</span>
              </div>` : ''}
              <p style="color:#94a3b8;line-height:1.7;margin:0 0 20px;">You've unlocked AI-powered mock interviews, real-time feedback, and domain competency scoring. Don't let it go to waste.</p>
              <p style="color:#e2e8f0;font-weight:600;margin:0 0 16px;">What you can do right now:</p>
              <ul style="color:#94a3b8;line-height:2;padding-left:20px;margin:0 0 28px;">
                <li>Run a full mock interview with AI coaching</li>
                <li>Check your ATS resume score</li>
                <li>Explore company-specific prep packs</li>
              </ul>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/interview-setup" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#0891b2);color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Start a Mock Interview →</a>
            </div>
            <div style="padding:20px 40px;border-top:1px solid #1e293b;text-align:center;">
              <p style="color:#475569;font-size:12px;margin:0;">Triveda AI · <a href="${process.env.NEXT_PUBLIC_SITE_URL}/pricing" style="color:#0d9488;">View Plans</a> · <a href="#" style="color:#475569;">Unsubscribe</a></p>
            </div>
          </div>`,
      };

    case 'upgrade_nudge':
      return {
        subject: `You're outgrowing Free — here's what's waiting for you`,
        htmlContent: `
          <div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 40px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">Ready for the full picture, ${name}?</h1>
              <p style="margin:8px 0 0;color:#ddd6fe;font-size:15px;">Unlock everything that's been locked behind the curtain</p>
            </div>
            <div style="padding:32px 40px;">
              <p style="color:#94a3b8;line-height:1.7;margin:0 0 24px;">You've been using Triveda on the Free plan. Candidates on <strong style="color:#a78bfa;">${planName || 'Starter'}</strong> get 10× more practice, full AI coaching, and domain competency breakdowns per answer.</p>
              <div style="display:grid;gap:12px;margin-bottom:28px;">
                ${[
                  ['🎯', 'All AI improvement tips unlocked per answer'],
                  ['📊', 'Communication + Clarity + Domain Competency scores'],
                  ['🏢', 'Company-specific interview prep packs'],
                  ['📄', 'Unlimited ATS resume checks'],
                ].map(([icon, text]) => `
                  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:14px 18px;display:flex;align-items:center;gap:12px;">
                    <span style="font-size:18px;">${icon}</span>
                    <span style="color:#e2e8f0;font-size:14px;">${text}</span>
                  </div>`).join('')}
              </div>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/pricing" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">See Pricing Plans →</a>
            </div>
            <div style="padding:20px 40px;border-top:1px solid #1e293b;text-align:center;">
              <p style="color:#475569;font-size:12px;margin:0;">Triveda AI · <a href="#" style="color:#475569;">Unsubscribe</a></p>
            </div>
          </div>`,
      };

    case 'weekly_digest':
      return {
        subject: `Your week in review — ${weeklyStats?.interviews ?? 0} interviews, avg score ${weeklyStats?.avgScore ?? 0}`,
        htmlContent: `
          <div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#0d9488,#059669);padding:32px 40px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">Weekly Digest 📈</h1>
              <p style="margin:8px 0 0;color:#ccfbf1;font-size:15px;">Here's how you performed this week, ${name}</p>
            </div>
            <div style="padding:32px 40px;">
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:28px;">
                ${[
                  ['Interviews', weeklyStats?.interviews ?? 0, '#0d9488'],
                  ['Avg Score', `${weeklyStats?.avgScore ?? 0}%`, '#7c3aed'],
                  ['Top Skill', weeklyStats?.topSkill ?? 'N/A', '#f59e0b'],
                ].map(([label, value, color]) => `
                  <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:${color};">${value}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:4px;">${label}</div>
                  </div>`).join('')}
              </div>
              <p style="color:#94a3b8;line-height:1.7;margin:0 0 24px;">Keep building momentum. Consistent practice is the #1 predictor of interview success.</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/interview-history" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#059669);color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">View Full History →</a>
            </div>
            <div style="padding:20px 40px;border-top:1px solid #1e293b;text-align:center;">
              <p style="color:#475569;font-size:12px;margin:0;">Triveda AI · <a href="#" style="color:#475569;">Unsubscribe</a></p>
            </div>
          </div>`,
      };

    case 'reengagement':
      return {
        subject: `${name}, it's been ${inactiveDays ?? 7} days — your skills are waiting`,
        htmlContent: `
          <div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 40px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">We miss you, ${name} 👀</h1>
              <p style="margin:8px 0 0;color:#fecaca;font-size:15px;">You haven't practiced in ${inactiveDays ?? 7} days</p>
            </div>
            <div style="padding:32px 40px;">
              <p style="color:#94a3b8;line-height:1.7;margin:0 0 24px;">Interview skills fade without practice. Candidates who practice consistently score <strong style="color:#f87171;">40% higher</strong> in real interviews. Jump back in — it only takes 15 minutes.</p>
              <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#e2e8f0;font-weight:600;">Quick restart options:</p>
                <ul style="color:#94a3b8;line-height:2;padding-left:20px;margin:0;">
                  <li>5-min rapid-fire Q&amp;A session</li>
                  <li>Resume ATS check (takes 2 min)</li>
                  <li>Review your last interview feedback</li>
                </ul>
              </div>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/practice" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Jump Back In →</a>
            </div>
            <div style="padding:20px 40px;border-top:1px solid #1e293b;text-align:center;">
              <p style="color:#475569;font-size:12px;margin:0;">Triveda AI · <a href="#" style="color:#475569;">Unsubscribe</a></p>
            </div>
          </div>`,
      };
  }
}

async function upsertBrevoContact(email: string, name?: string, listId?: number) {
  // Create or update contact
  const contactRes = await fetch(`${BREVO_BASE}/contacts`, {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      attributes: name ? { FIRSTNAME: name.split(' ')[0], LASTNAME: name.split(' ').slice(1).join(' ') || '' } : {},
      listIds: listId ? [listId] : [],
      updateEnabled: true,
    }),
  });
  return contactRes.ok || contactRes.status === 204;
}

async function sendBrevoEmail(to: string, name: string, subject: string, htmlContent: string) {
  const res = await fetch(`${BREVO_BASE}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: to, name }],
      subject,
      htmlContent,
      tags: ['triveda-drip'],
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Brevo send failed');
  }
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const payload: DripPayload = await request.json();
    const { type, email, name = '' } = payload;

    if (!email || !type) {
      return NextResponse.json({ success: false, error: 'email and type are required' }, { status: 400 });
    }

    // Map campaign type to Brevo list IDs (configure in Brevo dashboard)
    const listMap: Record<CampaignType, number> = {
      trial_drip: 2,
      upgrade_nudge: 3,
      weekly_digest: 4,
      reengagement: 5,
    };

    // Upsert contact into appropriate list
    await upsertBrevoContact(email, name, listMap[type]);

    // Build and send email
    const { subject, htmlContent } = buildEmailContent(payload);
    const result = await sendBrevoEmail(email, name, subject, htmlContent);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      type,
      email,
    });
  } catch (error: any) {
    console.error('[Brevo Drip] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to send drip email' }, { status: 500 });
  }
}

// GET endpoint to check campaign status / list contacts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as CampaignType | null;

  try {
    const listMap: Record<string, number> = {
      trial_drip: 2,
      upgrade_nudge: 3,
      weekly_digest: 4,
      reengagement: 5,
    };

    const listId = type ? listMap[type] : null;
    const url = listId
      ? `${BREVO_BASE}/contacts?listIds=${listId}&limit=50`
      : `${BREVO_BASE}/contacts?limit=50`;

    const res = await fetch(url, {
      headers: { 'api-key': BREVO_API_KEY },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to fetch contacts');
    }

    const data = await res.json();
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
