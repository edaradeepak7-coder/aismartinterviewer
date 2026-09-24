'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Save, Eye, RefreshCw, AlignLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  body_html: string;
  updated_at?: string;
}

export default function EmailTemplatesContent() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'preview'>('content');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/email-templates');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      const list: EmailTemplate[] = json.templates || [];
      setTemplates(list);
      if (list.length && !activeId) setActiveId(list[0].id);
      else if (list.length && activeId && !list.find((t) => t.id === activeId)) setActiveId(list[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tpl = templates.find((t) => t.id === activeId) || templates[0];

  function updateLocal(field: 'subject' | 'body_html' | 'name', value: string) {
    if (!tpl) return;
    setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? { ...t, [field]: value } : t)));
  }

  async function saveAll() {
    if (!tpl) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/email-templates', {
        method: 'PUT',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          id: tpl.id,
          slug: tpl.slug,
          name: tpl.name,
          subject: tpl.subject,
          body_html: tpl.body_html,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const previewHtml = tpl
    ? `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;background:#f8fafc"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px"><h2>${tpl.subject}</h2>${tpl.body_html}</div></body></html>`
    : '';

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-700 text-foreground">Email Template Customizer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Edit platform notification email templates</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={saveAll}
            disabled={saving || !tpl}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
              saved ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'
            }`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {saved ? 'Saved!' : 'Save Template'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">No email templates found. Run the migration to seed defaults.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          <div className="space-y-2">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide px-1 mb-3">Templates</p>
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-500 ${
                  activeId === t.id ? 'bg-primary/5 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {tpl && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex border-b border-border">
                {([['content', 'Content', <AlignLeft size={14} key="c" />], ['preview', 'Preview', <Eye size={14} key="p" />]] as const).map(
                  ([tab, label, icon]) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-2 px-5 py-3.5 text-sm font-500 border-b-2 ${
                        activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ),
                )}
              </div>
              {activeTab === 'content' && (
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase">Name</label>
                    <input value={tpl.name} onChange={(e) => updateLocal('name', e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase">Subject</label>
                    <input value={tpl.subject} onChange={(e) => updateLocal('subject', e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase">Body (HTML)</label>
                    <textarea value={tpl.body_html} onChange={(e) => updateLocal('body_html', e.target.value)} rows={12} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-mono resize-y" />
                  </div>
                  <p className="text-xs text-muted-foreground">Slug: {tpl.slug}</p>
                </div>
              )}
              {activeTab === 'preview' && (
                <div className="p-4">
                  <iframe srcDoc={previewHtml} className="w-full h-[500px] border border-border rounded-xl" title="Email Preview" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
