import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { to, subject, html, eventType, adminEmail } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

    if (!RESEND_API_KEY) {
      // Graceful fallback: log the alert but don't throw — security alerts should not crash
      console.warn("[security-alert-email] RESEND_API_KEY not configured. Security alert logged server-side only:", { eventType, to, adminEmail });
      return new Response(
        JSON.stringify({
          success: true,
          fallback: true,
          message: "RESEND_API_KEY not configured. Alert logged server-side. Configure RESEND_API_KEY in Supabase Edge Function secrets to enable email delivery.",
        }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Build recipient list: explicit `to` or fallback to adminEmail
    const recipients: string[] = [];
    if (to) {
      if (Array.isArray(to)) recipients.push(...to);
      else recipients.push(to);
    } else if (adminEmail) {
      recipients.push(adminEmail);
    }

    if (recipients.length === 0) {
      throw new Error("No recipient email provided");
    }

    // Build email body based on event type if html not provided
    let emailHtml = html;
    if (!emailHtml && eventType) {
      emailHtml = buildSecurityEmailHtml(eventType, req);
    }

    const payload = {
      from: "onboarding@resend.dev",
      to: recipients,
      subject: subject ?? `[Security Alert] ${eventType ?? "Suspicious Activity Detected"}`,
      html: emailHtml ?? "<p>A security event was detected on your platform.</p>",
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message ?? "Failed to send email via Resend");
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});

function buildSecurityEmailHtml(eventType: string, _req: Request): string {
  const timestamp = new Date().toISOString();
  const eventLabels: Record<string, { title: string; color: string; icon: string }> = {
    failed_login: { title: "Multiple Failed Login Attempts", color: "#dc2626", icon: "🔐" },
    session_revoked: { title: "Session Revoked", color: "#d97706", icon: "🚫" },
    unusual_ip: { title: "Unusual IP Access Detected", color: "#7c3aed", icon: "🌐" },
    role_change: { title: "Admin Role Change", color: "#0891b2", icon: "👤" },
    suspicious_activity: { title: "Suspicious Activity Detected", color: "#dc2626", icon: "⚠️" },
  };

  const event = eventLabels[eventType] ?? { title: "Security Alert", color: "#dc2626", icon: "🔔" };

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${event.title}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: ${event.color}; padding: 24px 32px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">
        ${event.icon} ${event.title}
      </h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; margin: 0 0 16px; font-size: 15px;">
        A security event has been detected on your AI Interviewer platform that requires your attention.
      </p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #6b7280; font-size: 13px; padding: 4px 0; width: 40%;">Event Type</td>
            <td style="color: #111827; font-size: 13px; font-weight: 500; padding: 4px 0;">${event.title}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">Timestamp</td>
            <td style="color: #111827; font-size: 13px; font-weight: 500; padding: 4px 0;">${timestamp}</td>
          </tr>
        </table>
      </div>
      <p style="color: #6b7280; font-size: 13px; margin: 0;">
        Please review your admin dashboard for full details and take appropriate action if needed.
      </p>
    </div>
    <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        This is an automated security alert from AI Interviewer Platform. Do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}
