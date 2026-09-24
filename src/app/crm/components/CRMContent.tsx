'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, DollarSign, Target, CheckSquare, Plus, Search, Trash2,
  Building2, Loader2, X, Circle, CheckCircle2, RefreshCw,
} from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

type Tab = 'leads' | 'pipeline' | 'tasks';
type Stage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  stage: Stage;
  value: number;
  created_at: string;
}

interface Task {
  id: string;
  lead_id: string | null;
  title: string;
  due_at: string | null;
  done: boolean;
  created_at: string;
}

const STAGES: { id: Stage; label: string; color: string }[] = [
  { id: 'new', label: 'New', color: 'bg-blue-500' },
  { id: 'qualified', label: 'Qualified', color: 'bg-violet-500' },
  { id: 'proposal', label: 'Proposal', color: 'bg-amber-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { id: 'won', label: 'Won', color: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'bg-gray-400' },
];

function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700',
    qualified: 'bg-teal-50 text-teal-700',
    proposal: 'bg-amber-50 text-amber-700',
    negotiation: 'bg-orange-50 text-orange-700',
    won: 'bg-green-50 text-green-700',
    lost: 'bg-gray-50 text-gray-600',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-600 ${map[stage] || 'bg-gray-50 text-gray-600'}`}>
      {stage}
    </span>
  );
}

export default function CRMContent() {
  const [tab, setTab] = useState<Tab>('pipeline');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kpis, setKpis] = useState({ total: 0, pipelineValue: 0, won: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', value: '', stage: 'new' as Stage });
  const [taskTitle, setTaskTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/leads');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setLeads(json.leads || []);
      setTasks(json.tasks || []);
      setKpis(json.kpis || { total: 0, pipelineValue: 0, won: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setLeads([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.email.toLowerCase().includes(q);
  });

  async function addLead() {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.company,
          value: Number(form.value) || 0,
          stage: form.stage,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Create failed');
      setShowAdd(false);
      setForm({ name: '', email: '', company: '', value: '', stage: 'new' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function updateStage(id: string, stage: Stage) {
    await fetch('/api/crm/leads', {
      method: 'PATCH',
      headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id, stage }),
    });
    await load();
  }

  async function deleteLead(id: string) {
    await fetch(`/api/crm/leads?id=${id}`, { method: 'DELETE', headers: csrfHeaders() });
    await load();
  }

  async function addTask() {
    if (!taskTitle.trim()) return;
    setBusy(true);
    try {
      await fetch('/api/crm/leads', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ resource: 'task', title: taskTitle }),
      });
      setTaskTitle('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleTask(t: Task) {
    await fetch('/api/crm/leads', {
      method: 'PATCH',
      headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ resource: 'task', id: t.id, done: !t.done }),
    });
    await load();
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Target size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-800 text-[#0D1B3E]">CRM Pipeline</h1>
            <p className="text-xs sm:text-sm text-[#6B7A99] mt-0.5">Leads, pipeline, and tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-3 py-2 shadow-sm">
            <DollarSign size={14} className="text-green-600" />
            <div>
              <p className="text-sm font-800 text-[#0D1B3E]">₹{Number(kpis.pipelineValue).toLocaleString()}</p>
              <p className="text-[10px] text-[#6B7A99]">Pipeline Value</p>
            </div>
          </div>
          <button onClick={load} className="p-2 border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] text-white rounded-lg">
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      <div className="flex gap-0 border-b border-[#E8ECF4]">
        {([
          { id: 'pipeline' as Tab, label: 'Pipeline', icon: <Target size={15} /> },
          { id: 'leads' as Tab, label: 'Leads', icon: <Users size={15} /> },
          { id: 'tasks' as Tab, label: 'Tasks', icon: <CheckSquare size={15} /> },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-600 border-b-2 -mb-px ${
              tab === t.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99]'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#6B7A99] gap-2">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {(tab === 'leads' || tab === 'pipeline') && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E8ECF4] rounded-lg bg-white"
              />
            </div>
          )}

          {tab === 'pipeline' && (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {STAGES.filter((s) => s.id !== 'lost').map((col) => {
                const colLeads = filtered.filter((l) => l.stage === col.id);
                return (
                  <div key={col.id} className="min-w-[200px] shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${col.color}`} />
                      <span className="text-xs font-700 text-[#0D1B3E] uppercase">{col.label}</span>
                      <span className="ml-auto text-xs text-[#6B7A99] bg-[#F4F6FA] px-1.5 py-0.5 rounded-full">{colLeads.length}</span>
                    </div>
                    <div className="space-y-2">
                      {colLeads.length === 0 && (
                        <p className="text-xs text-[#6B7A99] py-4 text-center border border-dashed border-[#E8ECF4] rounded-xl">No leads</p>
                      )}
                      {colLeads.map((lead) => (
                        <div key={lead.id} className="bg-white border border-[#E8ECF4] rounded-xl p-3">
                          <p className="text-sm font-700 text-[#0D1B3E]">{lead.name}</p>
                          <p className="text-xs text-[#6B7A99] mt-1">{lead.company || lead.email}</p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-sm font-800 text-[#0D9488]">₹{Number(lead.value).toLocaleString()}</span>
                            <select
                              value={lead.stage}
                              onChange={(e) => updateStage(lead.id, e.target.value as Stage)}
                              className="text-[10px] border border-[#E8ECF4] rounded px-1 py-0.5"
                            >
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'leads' && (
            <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
              {filtered.length === 0 ? (
                <p className="text-sm text-[#6B7A99] text-center py-12">No leads yet. Add your first lead.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8ECF4] bg-[#F8FAFC]">
                      <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99]">Lead</th>
                      <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99]">Company</th>
                      <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99]">Stage</th>
                      <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99]">Value</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead) => (
                      <tr key={lead.id} className="border-b border-[#F4F6FA]">
                        <td className="px-4 py-3">
                          <p className="font-600 text-[#0D1B3E]">{lead.name}</p>
                          <p className="text-xs text-[#6B7A99]">{lead.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-sm"><Building2 size={13} />{lead.company || '—'}</span>
                        </td>
                        <td className="px-4 py-3"><StageBadge stage={lead.stage} /></td>
                        <td className="px-4 py-3 font-700">₹{Number(lead.value).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => deleteLead(lead.id)} className="p-1.5 text-[#6B7A99] hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="New task…"
                  className="flex-1 px-3 py-2.5 text-sm border border-[#E8ECF4] rounded-lg"
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                />
                <button onClick={addTask} disabled={busy} className="px-4 py-2 bg-[#0D9488] text-white text-sm font-600 rounded-lg disabled:opacity-50">
                  <Plus size={14} />
                </button>
              </div>
              {tasks.length === 0 ? (
                <p className="text-sm text-[#6B7A99] text-center py-12">No tasks yet.</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <div key={t.id} className={`bg-white border border-[#E8ECF4] rounded-xl p-4 flex items-start gap-3 ${t.done ? 'opacity-60' : ''}`}>
                      <button onClick={() => toggleTask(t)} className="mt-0.5">
                        {t.done ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} className="text-[#E8ECF4]" />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm font-600 ${t.done ? 'line-through text-[#6B7A99]' : 'text-[#0D1B3E]'}`}>{t.title}</p>
                        {t.due_at && <p className="text-xs text-[#6B7A99] mt-1">{new Date(t.due_at).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Add Lead</h3>
              <button onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            {(['name', 'email', 'company', 'value'] as const).map((f) => (
              <input
                key={f}
                value={form[f]}
                onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                className="w-full px-3 py-2.5 text-sm border border-[#E8ECF4] rounded-lg"
              />
            ))}
            <select
              value={form.stage}
              onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value as Stage }))}
              className="w-full px-3 py-2.5 text-sm border border-[#E8ECF4] rounded-lg"
            >
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button onClick={addLead} disabled={busy} className="w-full py-2.5 bg-[#0D9488] text-white text-sm font-600 rounded-xl disabled:opacity-50">
              {busy ? 'Saving…' : 'Create Lead'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
