'use client';
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Search, X, Save, BookOpen, Target, Mic, Users, GitBranch, CheckCircle2, FolderOpen, Folder, Hash } from 'lucide-react';

interface SkillNode {
  id: string;
  name: string;
  description: string;
  level: number;
  parentId: string | null;
  children: SkillNode[];
  tags: string[];
  usedIn: ('courses' | 'assessments' | 'interviews' | 'profiles')[];
  status: 'active' | 'draft';
}

const INITIAL_TREE: SkillNode[] = [
  {
    id: 's1', name: 'Java', description: 'Java programming language and ecosystem', level: 0, parentId: null, tags: ['programming', 'backend'], usedIn: ['courses', 'assessments', 'interviews', 'profiles'], status: 'active',
    children: [
      {
        id: 's1-1', name: 'OOP', description: 'Object-Oriented Programming concepts in Java', level: 1, parentId: 's1', tags: ['design', 'fundamentals'], usedIn: ['courses', 'assessments'], status: 'active',
        children: [
          { id: 's1-1-1', name: 'Encapsulation', description: 'Data hiding and access control', level: 2, parentId: 's1-1', tags: ['oop'], usedIn: ['assessments'], status: 'active', children: [] },
          { id: 's1-1-2', name: 'Inheritance', description: 'Class hierarchy and code reuse', level: 2, parentId: 's1-1', tags: ['oop'], usedIn: ['assessments', 'interviews'], status: 'active', children: [] },
          { id: 's1-1-3', name: 'Polymorphism', description: 'Method overloading and overriding', level: 2, parentId: 's1-1', tags: ['oop'], usedIn: ['assessments'], status: 'active', children: [] },
          { id: 's1-1-4', name: 'Abstraction', description: 'Abstract classes and interfaces', level: 2, parentId: 's1-1', tags: ['oop'], usedIn: ['assessments', 'courses'], status: 'active', children: [] },
        ],
      },
      {
        id: 's1-2', name: 'Collections Framework', description: 'Java Collections API', level: 1, parentId: 's1', tags: ['data-structures'], usedIn: ['courses', 'assessments', 'interviews'], status: 'active',
        children: [
          { id: 's1-2-1', name: 'List & ArrayList', description: 'Dynamic arrays and list operations', level: 2, parentId: 's1-2', tags: ['collections'], usedIn: ['assessments'], status: 'active', children: [] },
          { id: 's1-2-2', name: 'HashMap & HashSet', description: 'Hash-based data structures', level: 2, parentId: 's1-2', tags: ['collections'], usedIn: ['assessments', 'interviews'], status: 'active', children: [] },
        ],
      },
      { id: 's1-3', name: 'Multithreading', description: 'Concurrent programming in Java', level: 1, parentId: 's1', tags: ['concurrency', 'advanced'], usedIn: ['interviews'], status: 'active', children: [] },
    ],
  },
  {
    id: 's2', name: 'Data Structures', description: 'Fundamental data organization concepts', level: 0, parentId: null, tags: ['cs-fundamentals', 'algorithms'], usedIn: ['courses', 'assessments', 'interviews', 'profiles'], status: 'active',
    children: [
      { id: 's2-1', name: 'Arrays & Strings', description: 'Linear data structures', level: 1, parentId: 's2', tags: ['linear'], usedIn: ['assessments', 'interviews'], status: 'active', children: [] },
      { id: 's2-2', name: 'Trees & Graphs', description: 'Hierarchical and network structures', level: 1, parentId: 's2', tags: ['non-linear'], usedIn: ['assessments', 'interviews'], status: 'active', children: [] },
      { id: 's2-3', name: 'Dynamic Programming', description: 'Optimization via memoization', level: 1, parentId: 's2', tags: ['algorithms', 'advanced'], usedIn: ['assessments', 'interviews'], status: 'active', children: [] },
    ],
  },
  {
    id: 's3', name: 'System Design', description: 'Large-scale system architecture', level: 0, parentId: null, tags: ['architecture', 'senior'], usedIn: ['interviews', 'profiles'], status: 'active',
    children: [
      { id: 's3-1', name: 'Scalability', description: 'Horizontal and vertical scaling', level: 1, parentId: 's3', tags: ['architecture'], usedIn: ['interviews'], status: 'active', children: [] },
      { id: 's3-2', name: 'Microservices', description: 'Service-oriented architecture', level: 1, parentId: 's3', tags: ['architecture', 'devops'], usedIn: ['interviews'], status: 'active', children: [] },
    ],
  },
  {
    id: 's4', name: 'Communication Skills', description: 'Verbal and written communication', level: 0, parentId: null, tags: ['soft-skills', 'lsrw'], usedIn: ['courses', 'interviews', 'profiles'], status: 'active',
    children: [
      { id: 's4-1', name: 'LSRW', description: 'Listening, Speaking, Reading, Writing', level: 1, parentId: 's4', tags: ['language', 'soft-skills'], usedIn: ['courses', 'assessments'], status: 'active', children: [] },
    ],
  },
];

const USAGE_ICONS: Record<string, React.ReactNode> = {
  courses: <BookOpen size={10} />,
  assessments: <Target size={10} />,
  interviews: <Mic size={10} />,
  profiles: <Users size={10} />,
};

const USAGE_COLORS: Record<string, string> = {
  courses: 'bg-blue-50 text-blue-600 border-blue-200',
  assessments: 'bg-violet-50 text-violet-600 border-violet-200',
  interviews: 'bg-teal-50 text-teal-600 border-teal-200',
  profiles: 'bg-amber-50 text-amber-600 border-amber-200',
};

function countNodes(nodes: SkillNode[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countNodes(n.children), 0);
}

function flattenTree(nodes: SkillNode[], result: SkillNode[] = []): SkillNode[] {
  nodes.forEach(n => { result.push(n); flattenTree(n.children, result); });
  return result;
}

interface SkillFormData {
  name: string;
  description: string;
  tags: string;
  usedIn: ('courses' | 'assessments' | 'interviews' | 'profiles')[];
  parentId: string | null;
}

const DEFAULT_FORM: SkillFormData = { name: '', description: '', tags: '', usedIn: [], parentId: null };

function SkillRow({ node, expanded, onToggle, onEdit, onDelete, onAddChild, search }: {
  node: SkillNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (n: SkillNode) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  search: string;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const indent = node.level * 24;
  const highlight = search && node.name.toLowerCase().includes(search.toLowerCase());

  return (
    <>
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-border/50 hover:bg-muted/20 transition-colors group ${highlight ? 'bg-primary/5' : ''}`}
        style={{ paddingLeft: `${16 + indent}px` }}>
        <div className="w-5 shrink-0">
          {hasChildren ? (
            <button onClick={() => onToggle(node.id)} className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : <span className="w-5 block" />}
        </div>
        <div className="shrink-0 text-muted-foreground">
          {hasChildren ? <FolderOpen size={14} className="text-amber-500" /> : <Folder size={14} className="text-muted-foreground/50" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-500 ${highlight ? 'text-primary' : 'text-foreground'}`}>{node.name}</span>
            {node.tags.slice(0, 2).map(t => (
              <span key={t} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">#{t}</span>
            ))}
            <div className="flex items-center gap-1 ml-1">
              {node.usedIn.map(u => (
                <span key={u} className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border font-500 ${USAGE_COLORS[u]}`}>
                  {USAGE_ICONS[u]} {u}
                </span>
              ))}
            </div>
          </div>
          {node.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{node.description}</p>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onAddChild(node.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Add child skill">
            <Plus size={13} />
          </button>
          <button onClick={() => onEdit(node)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Edit">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(node.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {isExpanded && node.children.map(child => (
        <SkillRow key={child.id} node={child} expanded={expanded} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} search={search} />
      ))}
    </>
  );
}

function deleteNodeById(nodes: SkillNode[], id: string): SkillNode[] {
  return nodes.filter(n => n.id !== id).map(n => ({ ...n, children: deleteNodeById(n.children, id) }));
}

function updateNodeById(nodes: SkillNode[], id: string, updates: Partial<SkillNode>): SkillNode[] {
  return nodes.map(n => n.id === id ? { ...n, ...updates } : { ...n, children: updateNodeById(n.children, id, updates) });
}

function addChildToNode(nodes: SkillNode[], parentId: string, child: SkillNode): SkillNode[] {
  return nodes.map(n => n.id === parentId ? { ...n, children: [...n.children, child] } : { ...n, children: addChildToNode(n.children, parentId, child) });
}

export default function SkillsTreeContent() {
  const [tree, setTree] = useState<SkillNode[]>(INITIAL_TREE);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['s1', 's1-1', 's2', 's3', 's4']));
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingNode, setEditingNode] = useState<SkillNode | null>(null);
  const [form, setForm] = useState<SkillFormData>(DEFAULT_FORM);
  const [saved, setSaved] = useState(false);

  const allNodes = flattenTree(tree);
  const totalCount = countNodes(tree);

  function toggleExpand(id: string) {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function expandAll() { setExpanded(new Set(allNodes.map(n => n.id))); }
  function collapseAll() { setExpanded(new Set()); }

  function openCreate(parentId: string | null = null) {
    setEditingNode(null);
    setForm({ ...DEFAULT_FORM, parentId });
    setShowModal(true);
  }

  function openEdit(node: SkillNode) {
    setEditingNode(node);
    setForm({ name: node.name, description: node.description, tags: node.tags.join(', '), usedIn: node.usedIn, parentId: node.parentId });
    setShowModal(true);
  }

  function deleteNode(id: string) {
    setTree(prev => deleteNodeById(prev, id));
  }

  function saveNode() {
    if (!form.name.trim()) return;
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (editingNode) {
      setTree(prev => updateNodeById(prev, editingNode.id, { name: form.name, description: form.description, tags, usedIn: form.usedIn }));
    } else {
      const parentNode = form.parentId ? allNodes.find(n => n.id === form.parentId) : null;
      const newNode: SkillNode = {
        id: `s${Date.now()}`, name: form.name, description: form.description, tags, usedIn: form.usedIn,
        level: parentNode ? parentNode.level + 1 : 0, parentId: form.parentId, children: [], status: 'active',
      };
      if (form.parentId) {
        setTree(prev => addChildToNode(prev, form.parentId!, newNode));
        setExpanded(prev => new Set([...prev, form.parentId!]));
      } else {
        setTree(prev => [...prev, newNode]);
      }
    }
    setShowModal(false);
  }

  function toggleUsedIn(usage: 'courses' | 'assessments' | 'interviews' | 'profiles') {
    setForm(f => ({ ...f, usedIn: f.usedIn.includes(usage) ? f.usedIn.filter(u => u !== usage) : [...f.usedIn, usage] }));
  }

  const filteredTree = search
    ? tree.map(n => ({ ...n })) // show all when searching (highlight handled in row)
    : tree;

  const stats = {
    total: totalCount,
    roots: tree.length,
    active: allNodes.filter(n => n.status === 'active').length,
    usedInInterviews: allNodes.filter(n => n.usedIn.includes('interviews')).length,
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-700 text-foreground">Skills Tree</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define and organize hierarchical skills used across courses, assessments, mock interviews, and candidate profiles</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
            {saved ? <><CheckCircle2 size={14} /> Saved!</> : <><Save size={14} /> Save Tree</>}
          </button>
          <button onClick={() => openCreate(null)} className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Plus size={14} /> Add Root Skill
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Skills', value: stats.total, icon: <GitBranch size={15} />, color: 'text-foreground', bg: 'bg-muted/50' },
          { label: 'Root Categories', value: stats.roots, icon: <FolderOpen size={15} />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Active Skills', value: stats.active, icon: <CheckCircle2 size={15} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Used in Interviews', value: stats.usedInInterviews, icon: <Mic size={15} />, color: 'text-teal-600', bg: 'bg-teal-50' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-lg font-700 text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tree Panel */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-border flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search skills..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={expandAll} className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Expand All</button>
          <button onClick={collapseAll} className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Collapse All</button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/20 border-b border-border flex-wrap">
          <span className="text-xs text-muted-foreground font-500">Used in:</span>
          {(['courses', 'assessments', 'interviews', 'profiles'] as const).map(u => (
            <span key={u} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-500 ${USAGE_COLORS[u]}`}>
              {USAGE_ICONS[u]} {u}
            </span>
          ))}
        </div>

        {/* Tree */}
        <div className="divide-y divide-border/0">
          {filteredTree.map(node => (
            <SkillRow key={node.id} node={node} expanded={expanded} onToggle={toggleExpand}
              onEdit={openEdit} onDelete={deleteNode} onAddChild={(pid) => openCreate(pid)} search={search} />
          ))}
          {filteredTree.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No skills found.</div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border">
          <button onClick={() => openCreate(null)} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            <Plus size={14} /> Add root-level skill category
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-base font-700 text-foreground">{editingNode ? 'Edit Skill' : 'Add New Skill'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {form.parentId && !editingNode && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <GitBranch size={14} className="text-primary" />
                  <span className="text-xs text-primary font-500">Adding child skill under: <strong>{allNodes.find(n => n.id === form.parentId)?.name}</strong></span>
                </div>
              )}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Skill Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Encapsulation"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Brief description of this skill..."
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. oop, java, fundamentals"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-2 uppercase tracking-wide">Used In</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {(['courses', 'assessments', 'interviews', 'profiles'] as const).map(u => (
                    <button key={u} onClick={() => toggleUsedIn(u)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-500 transition-colors ${form.usedIn.includes(u) ? `${USAGE_COLORS[u]} border-current` : 'border-border text-muted-foreground hover:bg-muted'}`}>
                      {USAGE_ICONS[u]} {u}
                    </button>
                  ))}
                </div>
              </div>
              {!editingNode && (
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Parent Skill (optional)</label>
                  <select value={form.parentId ?? ''} onChange={e => setForm(f => ({ ...f, parentId: e.target.value || null }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">— Root Level —</option>
                    {allNodes.map(n => (
                      <option key={n.id} value={n.id}>{'  '.repeat(n.level)}{n.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={saveNode} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                {editingNode ? 'Save Changes' : 'Add Skill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
