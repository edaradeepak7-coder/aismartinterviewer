'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, ChevronRight, ChevronDown, Search, X, Save,
  GitBranch, CheckCircle2, FolderOpen, Folder, Loader2, RefreshCw,
} from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

interface SkillNode {
  id: string;
  name: string;
  description: string;
  parent_id: string | null;
  sort_order: number;
  level: number;
  children: SkillNode[];
}

export default function SkillsTreeContent() {
  const [tree, setTree] = useState<SkillNode[]>([]);
  const [flat, setFlat] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', parentId: null as string | null });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/skills-tree');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setTree(json.tree || []);
      setFlat(json.nodes || []);
      const roots = (json.tree || []).map((n: SkillNode) => n.id);
      setExpanded(new Set(roots));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function openCreate(parentId: string | null = null) {
    setEditingId(null);
    setForm({ name: '', description: '', parentId });
    setShowModal(true);
  }

  function openEdit(node: SkillNode) {
    setEditingId(node.id);
    setForm({ name: node.name, description: node.description, parentId: node.parent_id });
    setShowModal(true);
  }

  async function saveNode() {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        const res = await fetch('/api/skills-tree', {
          method: 'PATCH',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ id: editingId, name: form.name, description: form.description }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
      } else {
        const res = await fetch('/api/skills-tree', {
          method: 'POST',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            parent_id: form.parentId,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Create failed');
      }
      setShowModal(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function deleteNode(id: string) {
    await fetch(`/api/skills-tree?id=${id}`, { method: 'DELETE', headers: csrfHeaders() });
    await load();
  }

  function SkillRow({ node }: { node: SkillNode }) {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children.length > 0;
    const highlight = search && node.name.toLowerCase().includes(search.toLowerCase());
    return (
      <>
        <div
          className={`flex items-center gap-2 px-4 py-2.5 border-b border-border/50 hover:bg-muted/20 group ${highlight ? 'bg-primary/5' : ''}`}
          style={{ paddingLeft: `${16 + node.level * 24}px` }}
        >
          <div className="w-5 shrink-0">
            {hasChildren ? (
              <button onClick={() => toggleExpand(node.id)} className="p-0.5 text-muted-foreground">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : <span className="w-5 block" />}
          </div>
          {hasChildren ? <FolderOpen size={14} className="text-amber-500" /> : <Folder size={14} className="text-muted-foreground/50" />}
          <div className="flex-1 min-w-0">
            <span className={`text-sm font-500 ${highlight ? 'text-primary' : 'text-foreground'}`}>{node.name}</span>
            {node.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{node.description}</p>}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <button onClick={() => openCreate(node.id)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground"><Plus size={13} /></button>
            <button onClick={() => openEdit(node)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground"><Edit2 size={13} /></button>
            <button onClick={() => deleteNode(node.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500"><Trash2 size={13} /></button>
          </div>
        </div>
        {isExpanded && node.children.map((c) => <SkillRow key={c.id} node={c} />)}
      </>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-700 text-foreground">Skills Tree</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Hierarchical skills for courses, assessments, and interviews</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 border border-border rounded-lg"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => openCreate(null)} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
            <Plus size={14} /> Add Root Skill
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"><GitBranch size={15} /></div>
          <div><p className="text-lg font-700">{flat.length}</p><p className="text-xs text-muted-foreground">Total Skills</p></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600"><FolderOpen size={15} /></div>
          <div><p className="text-lg font-700">{tree.length}</p><p className="text-xs text-muted-foreground">Root Categories</p></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 size={15} /></div>
          <div><p className="text-lg font-700">{flat.length}</p><p className="text-xs text-muted-foreground">Active</p></div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search skills…" className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm" />
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 size={18} className="animate-spin" /> Loading…</div>
        ) : tree.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">No skills yet. Add a root skill to get started.</div>
        ) : (
          tree.map((n) => <SkillRow key={n.id} node={n} />)
        )}
        <div className="px-4 py-3 border-t border-border">
          <button onClick={() => openCreate(null)} className="flex items-center gap-1.5 text-sm text-primary">
            <Plus size={14} /> Add root-level skill
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-base font-700">{editingId ? 'Edit Skill' : 'Add Skill'}</h2>
              <button onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Skill name *" className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm" />
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Description" className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm resize-none" />
              {!editingId && (
                <select value={form.parentId ?? ''} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value || null }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm">
                  <option value="">— Root Level —</option>
                  {flat.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
              <button onClick={saveNode} disabled={busy} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                {busy ? 'Saving…' : editingId ? 'Save Changes' : 'Add Skill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
