import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { type, to, data } = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.warn("[send-platform-email] RESEND_API_KEY not configured. Email logged:", { type, to });
      return new Response(
        JSON.stringify({ success: true, fallback: true, message: "RESEND_API_KEY not configured." }),
        { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const baseStyle = `font-family:'Segoe UI',Arial,sans-serif;background:#F0F2F7;padding:32px 16px;`;
    const cardStyle = `background:#ffffff;border-radius:16px;padding:32px;max-width:560px;margin:0 auto;border:1px solid #E8ECF4;`;
    const headerStyle = `background:linear-gradient(135deg,#0D1B3E 0%,#1a3a6b 100%);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;`;
    const btnStyle = `display:inline-block;background:linear-gradient(135deg,#0D9488,#0891b2);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;margin-top:16px;`;
    const platformUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aismartint3906.builtwithrocket.new";

    let subject = "";
    let html = "";

    switch (type) {
      case "course_enrollment":
        subject = `🎓 You're enrolled in ${data.courseName}!`;
        html = `<div style="${baseStyle}"><div style="${cardStyle}">
          <div style="${headerStyle}"><div style="font-size:32px;margin-bottom:8px;">🎓</div><h1 style="color:#ffffff;font-size:20px;margin:0;">Course Enrollment Confirmed</h1></div>
          <p style="color:#0D1B3E;font-size:16px;font-weight:700;">Hi ${data.userName},</p>
          <p style="color:#6B7A99;font-size:14px;line-height:1.6;">You've successfully enrolled in <strong style="color:#0D1B3E;">${data.courseName}</strong>.</p>
          <div style="background:#F0F2F7;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#6B7A99;font-size:13px;">📚 <strong>Course:</strong> ${data.courseName}</p>
            <p style="margin:8px 0 0;color:#6B7A99;font-size:13px;">📅 <strong>Enrolled:</strong> ${data.enrolledDate || new Date().toLocaleDateString()}</p>
          </div>
          <a href="${data.courseUrl || platformUrl + "/courses"}" style="${btnStyle}">Start Learning →</a>
          <p style="color:#9BA8C0;font-size:12px;margin-top:24px;">AI Interviewer Platform</p>
        </div></div>`;
        break;

      case "assessment_completion":
        subject = `✅ Assessment Complete — ${data.assessmentName} (${data.score}%)`;
        html = `<div style="${baseStyle}"><div style="${cardStyle}">
          <div style="${headerStyle}"><div style="font-size:32px;margin-bottom:8px;">${data.passed ? "✅" : "📝"}</div><h1 style="color:#ffffff;font-size:20px;margin:0;">Assessment ${data.passed ? "Passed" : "Completed"}</h1></div>
          <p style="color:#0D1B3E;font-size:16px;font-weight:700;">Hi ${data.userName},</p>
          <p style="color:#6B7A99;font-size:14px;line-height:1.6;">You've completed <strong style="color:#0D1B3E;">${data.assessmentName}</strong>.</p>
          <div style="background:${data.passed ? "#f0fdf4" : "#fff7ed"};border:1px solid ${data.passed ? "#bbf7d0" : "#fed7aa"};border-radius:10px;padding:16px;margin:16px 0;text-align:center;">
            <p style="font-size:36px;font-weight:800;color:${data.passed ? "#16a34a" : "#ea580c"};margin:0;">${data.score}%</p>
            <p style="color:${data.passed ? "#16a34a" : "#ea580c"};font-size:13px;margin:4px 0 0;">${data.passed ? "Passed 🎉" : "Keep Practicing"}</p>
          </div>
          <a href="${data.resultsUrl || platformUrl + "/progress-center"}" style="${btnStyle}">View Results →</a>
          <p style="color:#9BA8C0;font-size:12px;margin-top:24px;">AI Interviewer Platform</p>
        </div></div>`;
        break;

      case "interview_scheduled":
        subject = `📅 Interview Scheduled — ${data.interviewType} on ${data.scheduledDate}`;
        html = `<div style="${baseStyle}"><div style="${cardStyle}">
          <div style="${headerStyle}"><div style="font-size:32px;margin-bottom:8px;">📅</div><h1 style="color:#ffffff;font-size:20px;margin:0;">Interview Scheduled</h1></div>
          <p style="color:#0D1B3E;font-size:16px;font-weight:700;">Hi ${data.userName},</p>
          <p style="color:#6B7A99;font-size:14px;line-height:1.6;">Your <strong style="color:#0D1B3E;">${data.interviewType}</strong> interview has been scheduled.</p>
          <div style="background:#F0F2F7;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#6B7A99;font-size:13px;">🏢 <strong>Type:</strong> ${data.interviewType}</p>
            <p style="margin:8px 0 0;color:#6B7A99;font-size:13px;">📅 <strong>Date:</strong> ${data.scheduledDate}</p>
            ${data.duration ? `<p style="margin:8px 0 0;color:#6B7A99;font-size:13px;">⏱️ <strong>Duration:</strong> ${data.duration}</p>` : ""}
          </div>
          <a href="${data.interviewUrl || platformUrl + "/interview-setup"}" style="${btnStyle}">Prepare Now →</a>
          <p style="color:#9BA8C0;font-size:12px;margin-top:24px;">AI Interviewer Platform</p>
        </div></div>`;
        break;

      case "interview_reminder_24h":
        subject = `⏰ Reminder: Your interview is tomorrow — ${data.interviewType}`;
        html = `<div style="${baseStyle}"><div style="${cardStyle}">
          <div style="${headerStyle}"><div style="font-size:32px;margin-bottom:8px;">⏰</div><h1 style="color:#ffffff;font-size:20px;margin:0;">Interview Tomorrow!</h1></div>
          <p style="color:#0D1B3E;font-size:16px;font-weight:700;">Hi ${data.userName},</p>
          <p style="color:#6B7A99;font-size:14px;line-height:1.6;">This is a reminder that your <strong style="color:#0D1B3E;">${data.interviewType}</strong> interview is scheduled for <strong style="color:#0D1B3E;">tomorrow</strong>.</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#1e40af;font-size:14px;font-weight:700;">📅 ${data.scheduledDate}</p>
            ${data.duration ? `<p style="margin:6px 0 0;color:#3b82f6;font-size:13px;">⏱️ Duration: ${data.duration}</p>` : ""}
            ${data.company ? `<p style="margin:6px 0 0;color:#3b82f6;font-size:13px;">🏢 Company: ${data.company}</p>` : ""}
          </div>
          <p style="color:#6B7A99;font-size:13px;line-height:1.6;">Make sure you're prepared! Review your notes, test your equipment, and get a good night's sleep.</p>
          <a href="${data.interviewUrl || platformUrl + "/interview-setup"}" style="${btnStyle}">Review Preparation →</a>
          <p style="color:#9BA8C0;font-size:12px;margin-top:24px;">AI Interviewer Platform</p>
        </div></div>`;
        break;

      case "score_notification":
        subject = `🎯 Your interview score is ready — ${data.score}%`;
        html = `<div style="${baseStyle}"><div style="${cardStyle}">
          <div style="${headerStyle}"><div style="font-size:32px;margin-bottom:8px;">🎯</div><h1 style="color:#ffffff;font-size:20px;margin:0;">Interview Score Ready</h1></div>
          <p style="color:#0D1B3E;font-size:16px;font-weight:700;">Hi ${data.userName},</p>
          <p style="color:#6B7A99;font-size:14px;line-height:1.6;">Your <strong style="color:#0D1B3E;">${data.interviewType || "interview"}</strong> has been evaluated. Here are your results:</p>
          <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin:16px 0;text-align:center;">
            <p style="font-size:48px;font-weight:800;color:#16a34a;margin:0;">${data.score}%</p>
            <p style="color:#15803d;font-size:14px;font-weight:600;margin:4px 0 0;">Overall Score</p>
            ${data.grade ? `<p style="color:#16a34a;font-size:20px;font-weight:800;margin:8px 0 0;">Grade: ${data.grade}</p>` : ""}
          </div>
          ${data.breakdown ? `<div style="background:#F0F2F7;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="font-size:13px;font-weight:700;color:#0D1B3E;margin:0 0 8px;">Score Breakdown:</p>
            ${Object.entries(data.breakdown).map(([k, v]) => `<p style="margin:4px 0;color:#6B7A99;font-size:13px;">• ${k}: <strong>${v}</strong></p>`).join("")}
          </div>` : ""}
          <a href="${data.resultsUrl || platformUrl + "/interview-results"}" style="${btnStyle}">View Full Report →</a>
          <p style="color:#9BA8C0;font-size:12px;margin-top:24px;">AI Interviewer Platform</p>
        </div></div>`;
        break;

      case "seat_purchase_confirmation":
        subject = `✅ Seat Purchase Confirmed — ${data.seats} seats added`;
        html = `<div style="${baseStyle}"><div style="${cardStyle}">
          <div style="${headerStyle}"><div style="font-size:32px;margin-bottom:8px;">🏫</div><h1 style="color:#ffffff;font-size:20px;margin:0;">Seat Purchase Confirmed</h1></div>
          <p style="color:#0D1B3E;font-size:16px;font-weight:700;">Hi ${data.institutionName || data.userName},</p>
          <p style="color:#6B7A99;font-size:14px;line-height:1.6;">Your seat purchase has been ${data.paymentMethod === "offline" ? "submitted for verification" : "confirmed"}.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#15803d;font-size:14px;font-weight:700;">📊 ${data.seats} seats ${data.paymentMethod === "offline" ? "requested" : "activated"}</p>
            <p style="margin:8px 0 0;color:#16a34a;font-size:13px;">💰 Amount: ₹${data.amount?.toLocaleString()}</p>
            <p style="margin:6px 0 0;color:#16a34a;font-size:13px;">💳 Method: ${data.paymentMethod === "online" ? "Online (Razorpay)" : "Offline / Bank Transfer"}</p>
            ${data.transactionId ? `<p style="margin:6px 0 0;color:#16a34a;font-size:13px;">🔖 Transaction: ${data.transactionId}</p>` : ""}
            ${data.paymentMethod === "offline" ? `<p style="margin:8px 0 0;color:#d97706;font-size:12px;">⏳ Seats will be activated after Super Admin verification.</p>` : ""}
          </div>
          ${data.newTotalSeats ? `<p style="color:#6B7A99;font-size:13px;">Your institution now has <strong style="color:#0D1B3E;">${data.newTotalSeats} total seats</strong>.</p>` : ""}
          <a href="${platformUrl + "/institution-admin"}" style="${btnStyle}">View Institution Dashboard →</a>
          <p style="color:#9BA8C0;font-size:12px;margin-top:24px;">AI Interviewer Platform</p>
        </div></div>`;
        break;

      case "auto_renewal_reminder":
        subject = `🔄 Subscription auto-renews in ${data.daysUntilRenewal} days — ${data.seats} seats`;
        html = `<div style="${baseStyle}"><div style="${cardStyle}">
          <div style="${headerStyle}"><div style="font-size:32px;margin-bottom:8px;">🔄</div><h1 style="color:#ffffff;font-size:20px;margin:0;">Subscription Renewal Reminder</h1></div>
          <p style="color:#0D1B3E;font-size:16px;font-weight:700;">Hi ${data.institutionName || data.userName},</p>
          <p style="color:#6B7A99;font-size:14px;line-height:1.6;">Your institutional seat subscription will auto-renew in <strong style="color:#0D1B3E;">${data.daysUntilRenewal} days</strong>.</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#1e40af;font-size:14px;font-weight:700;">📊 ${data.seats} seats</p>
            <p style="margin:6px 0 0;color:#3b82f6;font-size:13px;">💰 Renewal amount: ₹${data.renewalAmount?.toLocaleString()}</p>
            <p style="margin:6px 0 0;color:#3b82f6;font-size:13px;">📅 Renewal date: ${data.renewalDate}</p>
          </div>
          <p style="color:#6B7A99;font-size:13px;">To cancel or modify your subscription, visit your institution dashboard before the renewal date.</p>
          <a href="${platformUrl + "/institution-admin"}" style="${btnStyle}">Manage Subscription →</a>
          <p style="color:#9BA8C0;font-size:12px;margin-top:24px;">AI Interviewer Platform</p>
        </div></div>`;
        break;

      case "achievement_unlock":
        subject = `🏆 Achievement Unlocked — ${data.achievementName}!`;
        html = `<div style="${baseStyle}"><div style="${cardStyle}">
          <div style="${headerStyle}"><div style="font-size:40px;margin-bottom:8px;">${data.achievementIcon || "🏆"}</div><h1 style="color:#ffffff;font-size:20px;margin:0;">Achievement Unlocked!</h1></div>
          <p style="color:#0D1B3E;font-size:16px;font-weight:700;">Congratulations, ${data.userName}!</p>
          <p style="color:#6B7A99;font-size:14px;line-height:1.6;">You've unlocked <strong style="color:#0D1B3E;">${data.achievementName}</strong>.</p>
          <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:10px;padding:20px;margin:16px 0;text-align:center;">
            <p style="font-size:28px;margin:0;">${data.achievementIcon || "🏆"}</p>
            <p style="font-weight:800;color:#92400e;font-size:16px;margin:8px 0 4px;">${data.achievementName}</p>
            ${data.pointsEarned ? `<p style="color:#d97706;font-size:14px;font-weight:700;margin:8px 0 0;">+${data.pointsEarned} points earned</p>` : ""}
          </div>
          <a href="${platformUrl + "/progress-center"}" style="${btnStyle}">View Achievements →</a>
          <p style="color:#9BA8C0;font-size:12px;margin-top:24px;">AI Interviewer Platform</p>
        </div></div>`;
        break;

      case "leaderboard_milestone":
        subject = `🥇 Leaderboard Update — You're now Rank #${data.rank}!`;
        html = `<div style="${baseStyle}"><div style="${cardStyle}">
          <div style="${headerStyle}"><div style="font-size:40px;margin-bottom:8px;">🥇</div><h1 style="color:#ffffff;font-size:20px;margin:0;">Leaderboard Milestone!</h1></div>
          <p style="color:#0D1B3E;font-size:16px;font-weight:700;">Amazing work, ${data.userName}!</p>
          <div style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-radius:10px;padding:20px;margin:16px 0;text-align:center;">
            <p style="font-size:48px;font-weight:800;color:#7c3aed;margin:0;">#${data.rank}</p>
            <p style="color:#6d28d9;font-size:14px;margin:4px 0 0;">Global Rank</p>
          </div>
          <a href="${platformUrl + "/leaderboard"}" style="${btnStyle}">View Leaderboard →</a>
          <p style="color:#9BA8C0;font-size:12px;margin-top:24px;">AI Interviewer Platform</p>
        </div></div>`;
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to send email");

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
});
