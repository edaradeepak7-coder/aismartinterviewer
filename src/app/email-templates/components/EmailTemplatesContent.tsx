'use client';
import React, { useState } from 'react';
import { Save, Eye, RefreshCw, Type, AlignLeft, Palette, CheckCircle2, AlertTriangle, Send, BookOpen, Award, Mic, Trophy } from 'lucide-react';

type TemplateKey = 'enrollment' | 'completion' | 'achievement' | 'interview' | 'leaderboard';

interface EmailTemplate {
  key: TemplateKey;
  label: string;
  icon: React.ReactNode;
  subject: string;
  preheader: string;
  headerTitle: string;
  bodyHtml: string;
  footerText: string;
  ctaLabel: string;
  ctaUrl: string;
  accentColor: string;
}

const DEFAULT_TEMPLATES: Record<TemplateKey, EmailTemplate> = {
  enrollment: {
    key: 'enrollment', label: 'Course Enrollment', icon: <BookOpen size={15} />,
    subject: '🎓 You\'re enrolled in {{course_name}}!',
    preheader: 'Your learning journey starts now.',
    headerTitle: 'Welcome to {{course_name}}',
    bodyHtml: `<p>Hi {{candidate_name}},</p>
<p>Congratulations! You've successfully enrolled in <strong>{{course_name}}</strong>. Your learning journey begins now.</p>
<p>Here's what you can expect:</p>
<ul>
  <li>📚 Structured modules with hands-on exercises</li>
  <li>🎯 Practice assessments after each module</li>
  <li>🏆 Certificate upon successful completion</li>
</ul>
<p>Start learning today and take the first step toward your career goals.</p>`,
    footerText: 'You received this email because you enrolled on the Triveda AI Platform. To unsubscribe, click here.',
    ctaLabel: 'Start Learning',
    ctaUrl: '{{course_url}}',
    accentColor: '#0d9488',
  },
  completion: {
    key: 'completion', label: 'Course Completion', icon: <CheckCircle2 size={15} />,
    subject: '🏆 You completed {{course_name}} — Certificate Ready!',
    preheader: 'Your certificate is waiting for you.',
    headerTitle: 'Course Completed!',
    bodyHtml: `<p>Hi {{candidate_name}},</p>
<p>Amazing work! You've successfully completed <strong>{{course_name}}</strong> with a score of <strong>{{score}}%</strong>.</p>
<p>Your certificate has been issued and is ready to download. Share it on LinkedIn to showcase your achievement!</p>
<p>What's next? Explore more courses or schedule a mock interview to put your skills to the test.</p>`,
    footerText: 'You received this email because you completed a course on the Triveda AI Platform.',
    ctaLabel: 'Download Certificate',
    ctaUrl: '{{certificate_url}}',
    accentColor: '#7c3aed',
  },
  achievement: {
    key: 'achievement', label: 'Achievement Unlock', icon: <Award size={15} />,
    subject: '🌟 New Achievement Unlocked: {{achievement_name}}',
    preheader: 'You earned a new badge!',
    headerTitle: 'Achievement Unlocked!',
    bodyHtml: `<p>Hi {{candidate_name}},</p>
<p>You just unlocked the <strong>{{achievement_name}}</strong> achievement! 🎉</p>
<p><em>{{achievement_description}}</em></p>
<p>Keep up the great work. You're on track to becoming a top performer on the platform.</p>
<p>Check your profile to see all your earned badges and certificates.</p>`,
    footerText: 'You received this email because you earned an achievement on the Triveda AI Platform.',
    ctaLabel: 'View My Achievements',
    ctaUrl: '{{achievements_url}}',
    accentColor: '#d97706',
  },
  interview: {
    key: 'interview', label: 'Interview Scheduled', icon: <Mic size={15} />,
    subject: '📅 Interview Scheduled: {{interview_type}} on {{interview_date}}',
    preheader: 'Your interview is confirmed.',
    headerTitle: 'Interview Confirmed',
    bodyHtml: `<p>Hi {{candidate_name}},</p>
<p>Your <strong>{{interview_type}}</strong> interview has been scheduled for <strong>{{interview_date}} at {{interview_time}}</strong>.</p>
<p><strong>Interview Details:</strong></p>
<ul>
  <li>📋 Type: {{interview_type}}</li>
  <li>🏢 Company: {{company_name}}</li>
  <li>⏱️ Duration: {{duration}} minutes</li>
  <li>🔗 Join Link: {{join_url}}</li>
</ul>
<p>Make sure you're in a quiet environment with a stable internet connection. Good luck!</p>`,
    footerText: 'You received this email because an interview was scheduled for you on the Triveda AI Platform.',
    ctaLabel: 'Join Interview',
    ctaUrl: '{{join_url}}',
    accentColor: '#2563eb',
  },
  leaderboard: {
    key: 'leaderboard', label: 'Leaderboard Milestone', icon: <Trophy size={15} />,
    subject: '🏅 You\'re in the Top {{rank}} on the Leaderboard!',
    preheader: 'Your hard work is paying off.',
    headerTitle: 'Leaderboard Milestone!',
    bodyHtml: `<p>Hi {{candidate_name}},</p>
<p>Incredible! You've reached <strong>Rank #{{rank}}</strong> on the {{leaderboard_type}} leaderboard with a score of <strong>{{score}} points</strong>.</p>
<p>You're outperforming {{percentile}}% of all candidates on the platform. Keep pushing!</p>
<p>Continue practicing to maintain and improve your ranking.</p>`,
    footerText: 'You received this email because you reached a leaderboard milestone on the Triveda AI Platform.',
    ctaLabel: 'View Leaderboard',
    ctaUrl: '{{leaderboard_url}}',
    accentColor: '#dc2626',
  },
};

const BRANDING_DEFAULTS = {
  logoUrl: '',
  logoAlt: 'Triveda AI Platform',
  brandName: 'Triveda',
  primaryColor: '#0d9488',
  backgroundColor: '#f8fafc',
  fontFamily: 'DM Sans, sans-serif',
  footerAddress: '123 Tech Park, Bengaluru, Karnataka 560001, India',
  socialLinks: { linkedin: '', twitter: '', website: 'https://triveda.ai' },
};

export default function EmailTemplatesContent() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey>('enrollment');
  const [templates, setTemplates] = useState<Record<TemplateKey, EmailTemplate>>(DEFAULT_TEMPLATES);
  const [branding, setBranding] = useState(BRANDING_DEFAULTS);
  const [activeTab, setActiveTab] = useState<'content' | 'branding' | 'preview'>('content');
  const [saved, setSaved] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const tpl = templates[activeTemplate];

  function updateTemplate(field: keyof EmailTemplate, value: string) {
    setTemplates(prev => ({ ...prev, [activeTemplate]: { ...prev[activeTemplate], [field]: value } }));
  }

  function saveAll() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function sendTestEmail() {
    if (!testEmail) return;
    setSendingTest(true);
    await new Promise(r => setTimeout(r, 1500));
    setSendingTest(false);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  }

  function resetTemplate() {
    setTemplates(prev => ({ ...prev, [activeTemplate]: DEFAULT_TEMPLATES[activeTemplate] }));
  }

  const previewHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: ${branding.backgroundColor}; font-family: ${branding.fontFamily}; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
    .card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: ${tpl.accentColor}; padding: 32px 32px 24px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; }
    .body { padding: 32px; color: #374151; font-size: 15px; line-height: 1.7; }
    .body p { margin: 0 0 16px; }
    .body ul { padding-left: 20px; margin: 0 0 16px; }
    .body li { margin-bottom: 6px; }
    .cta { text-align: center; margin: 28px 0 8px; }
    .cta a { display: inline-block; background: ${tpl.accentColor}; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .footer { padding: 20px 32px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.logoAlt}" style="height:40px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />` : `<div style="font-size:13px;color:rgba(255,255,255,0.8);margin-bottom:8px;font-weight:600;letter-spacing:0.05em;">${branding.brandName}</div>`}
        <h1>${tpl.headerTitle}</h1>
      </div>
      <div class="body">
        ${tpl.bodyHtml}
        <div class="cta"><a href="${tpl.ctaUrl}">${tpl.ctaLabel}</a></div>
      </div>
      <div class="footer">
        ${tpl.footerText}<br/>
        ${branding.footerAddress}
      </div>
    </div>
  </div>
</body>
</html>`;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-700 text-foreground">Email Template Customizer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Customize Resend email templates for all platform notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetTemplate} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <RefreshCw size={14} /> Reset
          </button>
          <button onClick={saveAll} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
            {saved ? <><CheckCircle2 size={14} /> Saved!</> : <><Save size={14} /> Save All Templates</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Template Selector */}
        <div className="space-y-2">
          <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide px-1 mb-3">Notification Types</p>
          {(Object.keys(DEFAULT_TEMPLATES) as TemplateKey[]).map(key => {
            const t = DEFAULT_TEMPLATES[key];
            return (
              <button key={key} onClick={() => setActiveTemplate(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${activeTemplate === key ? 'bg-primary/5 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                <span className={activeTemplate === key ? 'text-primary' : ''}>{t.icon}</span>
                <span className="text-sm font-500">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {([['content', 'Content', <AlignLeft size={14} />], ['branding', 'Branding', <Palette size={14} />], ['preview', 'Preview', <Eye size={14} />]] as const).map(([tab, label, icon]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-500 border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {activeTab === 'content' && (
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Subject Line</label>
                <input value={tpl.subject} onChange={e => updateTemplate('subject', e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                <p className="text-xs text-muted-foreground mt-1">Use {'{{variable}}'} for dynamic values</p>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Preheader Text</label>
                <input value={tpl.preheader} onChange={e => updateTemplate('preheader', e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Header Title</label>
                <input value={tpl.headerTitle} onChange={e => updateTemplate('headerTitle', e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Email Body (HTML)</label>
                <textarea value={tpl.bodyHtml} onChange={e => updateTemplate('bodyHtml', e.target.value)} rows={10}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">CTA Button Label</label>
                  <input value={tpl.ctaLabel} onChange={e => updateTemplate('ctaLabel', e.target.value)}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">CTA URL</label>
                  <input value={tpl.ctaUrl} onChange={e => updateTemplate('ctaUrl', e.target.value)}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Footer Text</label>
                <textarea value={tpl.footerText} onChange={e => updateTemplate('footerText', e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={tpl.accentColor} onChange={e => updateTemplate('accentColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                  <input value={tpl.accentColor} onChange={e => updateTemplate('accentColor', e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              {/* Test Email */}
              <div className="pt-4 border-t border-border">
                <label className="block text-xs font-600 text-muted-foreground mb-2 uppercase tracking-wide">Send Test Email</label>
                <div className="flex items-center gap-2">
                  <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com"
                    className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  <button onClick={sendTestEmail} disabled={sendingTest || !testEmail}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${testSent ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
                    {sendingTest ? <RefreshCw size={14} className="animate-spin" /> : testSent ? <CheckCircle2 size={14} /> : <Send size={14} />}
                    {testSent ? 'Sent!' : sendingTest ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
                {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1"><AlertTriangle size={11} /> Set RESEND_API_KEY in your environment to send real emails.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Brand Name</label>
                  <input value={branding.brandName} onChange={e => setBranding(b => ({ ...b, brandName: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={branding.primaryColor} onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                    <input value={branding.primaryColor} onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))}
                      className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Logo URL</label>
                <input value={branding.logoUrl} onChange={e => setBranding(b => ({ ...b, logoUrl: e.target.value }))} placeholder="https://your-domain.com/logo.png"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Logo Alt Text</label>
                <input value={branding.logoAlt} onChange={e => setBranding(b => ({ ...b, logoAlt: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Background Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={branding.backgroundColor} onChange={e => setBranding(b => ({ ...b, backgroundColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                  <input value={branding.backgroundColor} onChange={e => setBranding(b => ({ ...b, backgroundColor: e.target.value }))}
                    className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Footer Address</label>
                <input value={branding.footerAddress} onChange={e => setBranding(b => ({ ...b, footerAddress: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Website URL</label>
                <input value={branding.socialLinks.website} onChange={e => setBranding(b => ({ ...b, socialLinks: { ...b.socialLinks, website: e.target.value } }))}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Previewing: <strong className="text-foreground">{tpl.label}</strong></span>
                <span className="ml-auto text-xs text-muted-foreground">Subject: {tpl.subject}</span>
              </div>
              <div className="border border-border rounded-xl overflow-hidden bg-[#f8fafc]">
                <iframe srcDoc={previewHtml} className="w-full h-[600px] border-0" title="Email Preview" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
