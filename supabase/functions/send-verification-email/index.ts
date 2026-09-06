import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req?.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { email, fullName, role, confirmationUrl } = await req?.json();

    if (!email || !confirmationUrl) {
      return new Response(
        JSON.stringify({ error: "email and confirmationUrl are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const RESEND_API_KEY = (globalThis as any)?.Deno?.env?.get("RESEND_API_KEY");

    // Graceful fallback: if RESEND_API_KEY is not configured, log and return success
    // so the auth flow is not blocked. Users can still confirm via Supabase's built-in email.
    if (!RESEND_API_KEY) {
      console.warn("[send-verification-email] RESEND_API_KEY not configured. Skipping custom email. Supabase built-in email will be used.");
      return new Response(
        JSON.stringify({
          success: true,
          fallback: true,
          message: "Custom email skipped — RESEND_API_KEY not configured. Supabase built-in confirmation email will be sent.",
        }),
        { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const roleLabel = role === "recruiter" ? "Recruiter" : role === "admin" ? "Admin" : "Candidate";
    const displayName = fullName || email?.split("@")?.[0];

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email — AI Interviewer</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1117;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#1a1d27;border-radius:12px;border:1px solid #2a2d3a;overflow:hidden;max-width:560px;width:100%;">
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #2a2d3a;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-flex;align-items:center;gap:10px;">
                      <div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;">
                        <span style="color:#fff;font-size:18px;font-weight:700;line-height:36px;display:block;text-align:center;">A</span>
                      </div>
                      <span style="color:#ffffff;font-size:16px;font-weight:600;letter-spacing:-0.3px;vertical-align:middle;margin-left:10px;">AI Interviewer</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <h1 style="margin:0 0 8px;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:-0.4px;">Verify your email address</h1>
              <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;line-height:1.6;">
                Hi ${displayName}, welcome to AI Interviewer as a <strong style="color:#a5b4fc;">${roleLabel}</strong>. Please confirm your email address to activate your account.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;">
                    <a href="${confirmationUrl}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.1px;">
                      Confirm Email Address →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 28px;color:#6366f1;font-size:12px;word-break:break-all;line-height:1.5;">
                ${confirmationUrl}
              </p>
              <div style="background-color:#111827;border-radius:8px;padding:16px;border-left:3px solid #6366f1;">
                <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                  ⚠️ This link expires in <strong style="color:#e5e7eb;">24 hours</strong>. If you didn't create an account, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #2a2d3a;">
              <p style="margin:0;color:#4b5563;font-size:12px;text-align:center;line-height:1.6;">
                © 2026 AI Interviewer · You're receiving this because you registered on our platform.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [email],
        subject: "Verify your email — AI Interviewer",
        html: htmlBody,
      }),
    });

    const resendData = await resendResponse?.json();

    if (!resendResponse?.ok) {
      console.error("Resend error:", resendData);
      // Graceful fallback: don't block auth flow on email delivery failure
      return new Response(
        JSON.stringify({
          success: true,
          fallback: true,
          warning: resendData?.message || "Custom email delivery failed. Supabase built-in email will be used.",
        }),
        { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  } catch (error) {
    // Graceful fallback: log error but don't block auth flow
    console.error("[send-verification-email] Unexpected error:", error?.message ?? error);
    return new Response(
      JSON.stringify({
        success: true,
        fallback: true,
        warning: "Email function encountered an error. Supabase built-in email will be used.",
      }),
      { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});
