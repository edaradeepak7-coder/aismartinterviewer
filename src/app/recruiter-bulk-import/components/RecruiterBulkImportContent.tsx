'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Users, Briefcase, Calendar, CheckCircle, AlertCircle, Loader2, X, Trash2, Download, AlertTriangle, ChevronDown, ChevronUp, Mail, Check, Info, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { csrfHeaders } from '@/lib/api/apiClient';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface ParsedCandidate {
  rowIndex: number;
  name: string;
  email: string;
  phone?: string;
  skills?: string;
  experience?: string;
  errors: string[];
}

interface JobRole {
  id: string;
  title: string;
  department?: string;
}

interface ScheduledSlot {
  candidateIndex: number;
  date: string;
  time: string;
  duration: number;
  conflict?: boolean;
}

interface ImportResult {
  success: number;
  failed: number;
  conflicts: number;
  emailsSent: number;
  interviewsCreated: number;
}

const SAMPLE_CSV = `name,email,phone,skills,experience
Arjun Mehta,arjun@example.com,9876543210,"React,TypeScript,Node.js",3 years Priya Nair,priya@example.com,9876543211,"Python,Django,PostgreSQL",4 years Rahul Sharma,rahul@example.com,9876543212,"Java,Spring Boot,AWS",5 years Sneha Pillai,sneha@example.com,9876543213,"Python,SQL,Spark",3 years`;

const DURATION_OPTIONS = [30, 45, 60, 90];

function parseCSV(text: string): ParsedCandidate[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const nameIdx = headers.findIndex(h => h === 'name' || h === 'full name' || h === 'candidate name');
  const emailIdx = headers.findIndex(h => h === 'email' || h === 'email address');
  const phoneIdx = headers.findIndex(h => h === 'phone' || h === 'mobile' || h === 'contact');
  const skillsIdx = headers.findIndex(h => h === 'skills' || h === 'skill set');
  const expIdx = headers.findIndex(h => h === 'experience' || h === 'exp' || h === 'years');

  return lines.slice(1).map((line, i) => {
    // Handle quoted fields with commas
    const cols: string[] = [];
    let inQuote = false;
    let cur = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());

    const errors: string[] = [];
    const name = nameIdx >= 0 ? cols[nameIdx]?.replace(/"/g, '') || '' : '';
    const email = emailIdx >= 0 ? cols[emailIdx]?.replace(/"/g, '') || '' : '';
    if (!name) errors.push('Name is required');
    if (!email) errors.push('Email is required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');

    return {
      rowIndex: i + 2,
      name,
      email,
      phone: phoneIdx >= 0 ? cols[phoneIdx] : undefined,
      skills: skillsIdx >= 0 ? cols[skillsIdx]?.replace(/"/g, '') : undefined,
      experience: expIdx >= 0 ? cols[expIdx] : undefined,
      errors,
    };
  });
}

function downloadSampleCSV() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'candidate_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const STEPS = ['Upload CSV', 'Assign Job Role', 'Schedule Interviews', 'Review & Import'];

export default function RecruiterBulkImportContent() {
  const supabase = createClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [slots, setSlots] = useState<ScheduledSlot[]>([]);
  const [defaultDate, setDefaultDate] = useState('');
  const [defaultTime, setDefaultTime] = useState('09:00');
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [existingSlots, setExistingSlots] = useState<{ date: string; time: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  useEffect(() => {
    loadJobRoles();
  }, []);

  useEffect(() => {
    loadExistingSlots();
  }, [user?.id]);

  const loadJobRoles = async () => {
    try {
      const res = await fetch('/api/job-postings?active=true');
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json.data)) {
        setJobRoles(
          json.data.map((j: { id: string; title: string; department?: string }) => ({
            id: j.id,
            title: j.title,
            department: j.department,
          })),
        );
        return;
      }
    } catch {
      /* fall through */
    }
    const { data } = await supabase
      .from('job_postings')
      .select('id, title, department')
      .eq('is_active', true)
      .limit(50);
    setJobRoles((data as JobRole[]) || []);
  };

  const loadExistingSlots = async () => {
    let query = supabase
      .from('recruiter_availability')
      .select('slot_date, start_time')
      .in('status', ['available', 'booked'])
      .gte('slot_date', new Date().toISOString().split('T')[0]);
    if (user?.id) query = query.eq('recruiter_id', user.id);
    const { data } = await query;
    setExistingSlots(
      (data || []).map((s: { slot_date: string; start_time: string }) => ({
        date: s.slot_date,
        time: s.start_time?.slice(0, 5),
      })),
    );
  };

  const handleFile = useCallback((file: File) => {
    setParseError('');
    if (!file.name.endsWith('.csv')) { setParseError('Please upload a .csv file'); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (!parsed.length) { setParseError('No valid rows found. Check your CSV format.'); return; }
      setCandidates(parsed);
      setSelectedCandidates(new Set(parsed.filter(c => !c.errors.length).map((_, i) => i)));
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toggleCandidate = (idx: number) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const generateSlots = () => {
    if (!defaultDate) return;
    const selected = candidates.filter((_, i) => selectedCandidates.has(i));
    const generated: ScheduledSlot[] = selected.map((_, i) => {
      const [h, m] = defaultTime.split(':').map(Number);
      const totalMins = h * 60 + m + i * (defaultDuration + 15);
      const slotH = Math.floor(totalMins / 60) % 24;
      const slotM = totalMins % 60;
      const time = `${slotH.toString().padStart(2, '0')}:${slotM.toString().padStart(2, '0')}`;
      const conflict = existingSlots.some(s => s.date === defaultDate && s.time === time);
      return { candidateIndex: candidates.indexOf(candidates.filter((_, ci) => selectedCandidates.has(ci))[i]), date: defaultDate, time, duration: defaultDuration, conflict };
    });
    setSlots(generated);
  };

  const updateSlot = (i: number, field: keyof ScheduledSlot, value: string | number) => {
    setSlots(prev => {
      const next = [...prev];
      const updated = { ...next[i], [field]: value };
      if (field === 'date' || field === 'time') {
        updated.conflict = existingSlots.some(s => s.date === updated.date && s.time === updated.time);
      }
      next[i] = updated;
      return next;
    });
  };

  const removeSlot = (i: number) => setSlots(prev => prev.filter((_, idx) => idx !== i));

  const handleImport = async () => {
    setImporting(true);
    const roleName = selectedJobId
      ? jobRoles.find((j) => j.id === selectedJobId)?.title || customRole
      : customRole;

    if (!roleName.trim()) {
      toast.error('Select a job role or enter a custom role');
      setImporting(false);
      return;
    }

    const payloadSlots = slots
      .map((slot) => {
        const candidate = candidates[slot.candidateIndex];
        if (!candidate || candidate.errors.length) return null;
        return {
          email: candidate.email,
          name: candidate.name,
          experience: candidate.experience,
          date: slot.date,
          time: slot.time,
          duration: slot.duration,
        };
      })
      .filter(Boolean);

    if (payloadSlots.length === 0) {
      toast.error('No valid candidates to import');
      setImporting(false);
      return;
    }

    try {
      const res = await fetch('/api/recruiter/bulk-import', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          role: roleName,
          job_posting_id: selectedJobId || null,
          send_confirmation: sendConfirmation,
          slots: payloadSlots,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || 'Import failed');
        setImporting(false);
        return;
      }
      const d = json.data || {};
      setResult({
        success: d.success || 0,
        failed: d.failed || 0,
        conflicts: d.conflicts || slots.filter((s) => s.conflict).length,
        emailsSent: d.emailsSent || 0,
        interviewsCreated: d.interviewsCreated || 0,
      });
      if (d.success > 0) toast.success(`Imported ${d.success} candidate(s)`);
      setStep(4);
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const validCount = candidates.filter((_, i) => selectedCandidates.has(i) && !candidates[i].errors.length).length;
  const conflictCount = slots.filter(s => s.conflict).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-600 text-foreground flex items-center gap-2">
            <Upload size={22} className="text-primary" />
            Bulk Candidate Import
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Import candidates from CSV, assign job roles, and schedule interview slots with conflict detection
          </p>
        </div>
        <button
          onClick={downloadSampleCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
        >
          <Download size={14} />
          Download Template
        </button>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-600 transition-colors ${
                i === step ? 'bg-primary/10 text-primary' :
                i < step ? 'text-emerald-500' : 'text-muted-foreground'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-700 ${
                  i < step ? 'bg-emerald-500 text-white' :
                  i === step ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {i < step ? <Check size={10} /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-1" />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Step 0: Upload CSV */}
      {step === 0 && (
        <div className="space-y-5">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-primary' : 'text-muted-foreground/50'}`} />
            <p className="text-foreground font-500 mb-1">
              {fileName ? fileName : 'Drop your CSV file here or click to browse'}
            </p>
            <p className="text-sm text-muted-foreground">Supports .csv files with columns: name, email, phone, skills, experience</p>
          </div>

          {parseError && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-400/10 border border-red-400/20 rounded-lg">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <p className="text-[13px] text-red-400">{parseError}</p>
            </div>
          )}

          {candidates.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                <p className="text-sm font-600 text-foreground">
                  {candidates.length} rows parsed — {validCount} valid, {candidates.length - validCount} with errors
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedCandidates(new Set(candidates.filter(c => !c.errors.length).map((_, i) => i)))} className="text-[12px] text-primary hover:underline">Select valid</button>
                  <span className="text-muted-foreground/30">|</span>
                  <button onClick={() => setSelectedCandidates(new Set())} className="text-[12px] text-muted-foreground hover:underline">Deselect all</button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-[13px]">
                  <thead className="bg-muted/30 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-[11px] font-600 text-muted-foreground w-8">#</th>
                      <th className="px-4 py-2 text-left text-[11px] font-600 text-muted-foreground">Select</th>
                      <th className="px-4 py-2 text-left text-[11px] font-600 text-muted-foreground">Name</th>
                      <th className="px-4 py-2 text-left text-[11px] font-600 text-muted-foreground">Email</th>
                      <th className="px-4 py-2 text-left text-[11px] font-600 text-muted-foreground">Skills</th>
                      <th className="px-4 py-2 text-left text-[11px] font-600 text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {candidates.map((c, i) => (
                      <tr key={i} className={`hover:bg-muted/30 transition-colors ${c.errors.length ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-2.5 text-muted-foreground">{c.rowIndex}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={selectedCandidates.has(i)}
                            onChange={() => toggleCandidate(i)}
                            disabled={!!c.errors.length}
                            className="accent-primary"
                          />
                        </td>
                        <td className="px-4 py-2.5 font-500 text-foreground">{c.name || <span className="text-red-400 italic">missing</span>}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{c.email || <span className="text-red-400 italic">missing</span>}</td>
                        <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[120px]">{c.skills || '—'}</td>
                        <td className="px-4 py-2.5">
                          {c.errors.length ? (
                            <button onClick={() => setExpandedRow(expandedRow === i ? null : i)} className="flex items-center gap-1 text-red-400 text-[11px] font-600">
                              <AlertCircle size={12} />
                              {c.errors.length} error{c.errors.length > 1 ? 's' : ''}
                              {expandedRow === i ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-500 text-[11px] font-600">
                              <CheckCircle size={12} /> Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep(1)}
              disabled={validCount === 0}
              className="px-5 py-2 text-sm font-600 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue with {validCount} candidates →
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Assign Job Role */}
      {step === 1 && (
        <div className="space-y-5 max-w-xl">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div>
              <label className="text-sm font-600 text-foreground block mb-2">Select Job Role</label>
              <div className="relative">
                <select
                  value={selectedJobId}
                  onChange={e => { setSelectedJobId(e.target.value); setCustomRole(''); }}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary/50 appearance-none"
                >
                  <option value="">— Select from active job postings —</option>
                  {jobRoles.map(j => (
                    <option key={j.id} value={j.id}>{j.title}{j.department ? ` (${j.department})` : ''}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[12px] text-muted-foreground">or enter custom role</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div>
              <label className="text-sm font-600 text-foreground block mb-2">Custom Role Title</label>
              <input
                value={customRole}
                onChange={e => { setCustomRole(e.target.value); setSelectedJobId(''); }}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-400/5 border border-blue-400/20 rounded-lg">
              <Info size={14} className="text-blue-400 shrink-0" />
              <p className="text-[12px] text-muted-foreground">
                All {validCount} selected candidates will be assigned to this role
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => setStep(0)} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors">← Back</button>
            <button
              onClick={() => setStep(2)}
              disabled={!selectedJobId && !customRole.trim()}
              className="px-5 py-2 text-sm font-600 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Scheduling →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Schedule Interviews */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Bulk schedule generator */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-600 text-foreground mb-4 flex items-center gap-2">
              <Calendar size={14} className="text-primary" />
              Auto-generate Interview Slots
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-[12px] font-600 text-muted-foreground block mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={defaultDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDefaultDate(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-[12px] font-600 text-muted-foreground block mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={defaultTime}
                  onChange={e => setDefaultTime(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-[12px] font-600 text-muted-foreground block mb-1.5">Duration (min)</label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDefaultDuration(d)}
                      className={`flex-1 py-2 rounded-lg text-[12px] font-600 border transition-colors ${
                        defaultDuration === d ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={generateSlots}
              disabled={!defaultDate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-600 bg-primary/10 text-primary border border-primary/30 rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap size={14} />
              Auto-generate {validCount} slots (15 min gap between each)
            </button>
          </div>

          {/* Conflict warning */}
          {conflictCount > 0 && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-400/10 border border-amber-400/20 rounded-lg">
              <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[13px] text-amber-400">
                {conflictCount} slot{conflictCount > 1 ? 's' : ''} conflict with existing bookings. Please adjust the time for highlighted rows.
              </p>
            </div>
          )}

          {/* Slots table */}
          {slots.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                <p className="text-sm font-600 text-foreground">{slots.length} Interview Slots</p>
                <button onClick={() => setSlots([])} className="text-[12px] text-red-400 hover:underline flex items-center gap-1">
                  <Trash2 size={12} /> Clear all
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground">S.No</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground">Candidate</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground">Date</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground">Time</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground">Duration</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground">Status</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-600 text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {slots.map((slot, i) => {
                      const cand = candidates[slot.candidateIndex];
                      return (
                        <tr key={i} className={`hover:bg-muted/30 transition-colors ${slot.conflict ? 'bg-amber-400/5' : ''}`}>
                          <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2.5 font-500 text-foreground">{cand?.name}</td>
                          <td className="px-4 py-2.5">
                            <input
                              type="date"
                              value={slot.date}
                              min={new Date().toISOString().split('T')[0]}
                              onChange={e => updateSlot(i, 'date', e.target.value)}
                              className={`bg-muted/40 border rounded px-2 py-1 text-[12px] text-foreground outline-none focus:border-primary/50 ${slot.conflict ? 'border-amber-400/40' : 'border-border'}`}
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="time"
                              value={slot.time}
                              onChange={e => updateSlot(i, 'time', e.target.value)}
                              className={`bg-muted/40 border rounded px-2 py-1 text-[12px] text-foreground outline-none focus:border-primary/50 ${slot.conflict ? 'border-amber-400/40' : 'border-border'}`}
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              value={slot.duration}
                              onChange={e => updateSlot(i, 'duration', Number(e.target.value))}
                              className="bg-muted/40 border border-border rounded px-2 py-1 text-[12px] text-foreground outline-none"
                            >
                              {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            {slot.conflict ? (
                              <span className="flex items-center gap-1 text-amber-400 text-[11px] font-600">
                                <AlertTriangle size={11} /> Conflict
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-emerald-500 text-[11px] font-600">
                                <CheckCircle size={11} /> Clear
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <button onClick={() => removeSlot(i)} className="text-red-400 hover:text-red-500 transition-colors">
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors">← Back</button>
            <button
              onClick={() => setStep(3)}
              disabled={slots.length === 0}
              className="px-5 py-2 text-sm font-600 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review & Import →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Import */}
      {step === 3 && (
        <div className="space-y-5 max-w-2xl">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <p className="text-sm font-600 text-foreground">Import Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Candidates', value: validCount, icon: <Users size={16} />, color: 'text-primary' },
                { label: 'Job Role', value: selectedJobId ? jobRoles.find(j => j.id === selectedJobId)?.title || '—' : customRole || '—', icon: <Briefcase size={16} />, color: 'text-blue-400' },
                { label: 'Slots', value: slots.length, icon: <Calendar size={16} />, color: 'text-emerald-400' },
                { label: 'Conflicts', value: conflictCount, icon: <AlertTriangle size={16} />, color: conflictCount > 0 ? 'text-amber-400' : 'text-muted-foreground' },
              ].map(item => (
                <div key={item.label} className="bg-muted/30 rounded-xl p-4 text-center border border-border">
                  <div className={`flex justify-center mb-1.5 ${item.color}`}>{item.icon}</div>
                  <p className={`text-lg font-700 ${item.color}`}>{item.value}</p>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            {conflictCount > 0 && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-400/10 border border-amber-400/20 rounded-lg">
                <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[13px] text-amber-400">
                  {conflictCount} conflicting slot{conflictCount > 1 ? 's' : ''} will still be created but marked for review.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 py-3 px-4 bg-muted/30 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setSendConfirmation(c => !c)}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${sendConfirmation ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendConfirmation ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <div>
                <p className="text-[13px] font-500 text-foreground flex items-center gap-1.5">
                  <Mail size={13} className="text-primary" />
                  Send confirmation emails to candidates
                </p>
                <p className="text-[11px] text-muted-foreground">Interview slot details will be emailed to each candidate</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors">← Back</button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-600 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {importing ? 'Importing...' : `Import ${validCount} Candidates`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 4 && result && (
        <div className="max-w-lg mx-auto text-center space-y-6 py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle size={28} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-600 text-foreground mb-1">Import Complete</h2>
            <p className="text-sm text-muted-foreground">Candidates, slots, and interviews were created from your CSV</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Imported', value: result.success, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Failed', value: result.failed, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
              { label: 'Interviews', value: result.interviewsCreated, color: 'text-teal-400', bg: 'bg-teal-400/10 border-teal-400/20' },
              { label: 'Emails Sent', value: result.emailsSent, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
            ].map(item => (
              <div key={item.label} className={`rounded-xl p-4 border ${item.bg}`}>
                <p className={`text-2xl font-700 ${item.color}`}>{item.value}</p>
                <p className="text-[12px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          {result.conflicts > 0 && (
            <p className="text-xs text-amber-500">{result.conflicts} slot time(s) overlapped existing availability</p>
          )}
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => { setStep(0); setCandidates([]); setSlots([]); setResult(null); setFileName(''); setSelectedCandidates(new Set()); }}
              className="px-5 py-2 text-sm font-600 border border-border text-muted-foreground rounded-md hover:bg-muted transition-colors"
            >
              Import More
            </button>
            <Link href="/recruiter-dashboard" className="px-5 py-2 text-sm font-600 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
              View Candidates →
            </Link>
            <Link href="/invitations" className="px-5 py-2 text-sm font-600 border border-border text-muted-foreground rounded-md hover:bg-muted transition-colors">
              Invitations
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
