'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { Building2, Briefcase, TrendingUp, Plus, Search, CheckCircle, Award, Download, Eye, Users, CreditCard, AlertCircle, Clock, X, Loader2, Lock, Unlock, Layers, FileText, BarChart2, RefreshCw, DollarSign, Activity, ToggleLeft, ToggleRight, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'candidates' | 'seats' | 'placements' | 'analytics' | 'bulk_import';

interface Institution {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'suspended';
  total_seats: number;
  used_seats: number;
  pending_seats: number;
  plan: string;
  approved_at?: string;
  auto_renewal: boolean;
  renewal_date?: string;
  monthly_cost?: number;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  program: string;
  year: string;
  course: string;
  branch: string;
  section: string;
  status: 'active' | 'inactive' | 'placed' | 'interviewing';
  score?: number;
  registered_at: string;
  seat_issued: boolean;
}

interface SeatTransaction {
  id: string;
  seats_requested: number;
  amount: number;
  payment_method: 'online' | 'offline';
  status: 'pending' | 'completed' | 'failed' | 'pending_verification';
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  created_at: string;
  verified_at?: string;
  notes?: string;
}

const SEAT_PRICE_PER_UNIT = 299;

const CSV_TEMPLATE_HEADERS = ['name', 'email', 'program', 'year', 'course', 'branch', 'section'];

const CSV_TEMPLATE_EXAMPLE = [
  'Arjun Sharma,arjun@example.com,B.Tech,3rd Year,Computer Science,CSE,A',
  'Priya Mehta,priya@example.com,M.Tech,1st Year,Electronics,ECE,B',
  'Rahul Verma,rahul@example.com,MBA,2nd Year,Management,HR,A',
];

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockInstitution: Institution = {
  id: 'inst-001',
  name: 'IIT Bombay',
  status: 'approved',
  total_seats: 100,
  used_seats: 67,
  pending_seats: 0,
  plan: 'Institution Pro',
  approved_at: '2026-08-01T10:00:00Z',
  auto_renewal: true,
  renewal_date: '2026-10-01',
  monthly_cost: 29900,
};

const mockCandidates: Candidate[] = [
  { id: 'c1', name: 'Arjun Sharma', email: 'arjun@iitb.ac.in', program: 'B.Tech', year: '3rd Year', course: 'Computer Science', branch: 'CSE', section: 'A', status: 'active', score: 88, registered_at: '2026-08-10T09:00:00Z', seat_issued: true },
  { id: 'c2', name: 'Priya Mehta', email: 'priya@iitb.ac.in', program: 'B.Tech', year: '4th Year', course: 'Electronics', branch: 'ECE', section: 'B', status: 'placed', score: 92, registered_at: '2026-08-11T10:00:00Z', seat_issued: true },
  { id: 'c3', name: 'Rahul Verma', email: 'rahul@iitb.ac.in', program: 'M.Tech', year: '1st Year', course: 'Computer Science', branch: 'CSE', section: 'A', status: 'interviewing', score: 79, registered_at: '2026-08-12T11:00:00Z', seat_issued: true },
  { id: 'c4', name: 'Sneha Patel', email: 'sneha@iitb.ac.in', program: 'B.Tech', year: '3rd Year', course: 'Mechanical', branch: 'ME', section: 'C', status: 'active', score: 74, registered_at: '2026-08-13T12:00:00Z', seat_issued: true },
  { id: 'c5', name: 'Kiran Rao', email: 'kiran@iitb.ac.in', program: 'B.Tech', year: '4th Year', course: 'Computer Science', branch: 'CSE', section: 'B', status: 'active', score: 95, registered_at: '2026-08-14T09:30:00Z', seat_issued: true },
  { id: 'c6', name: 'Divya Nair', email: 'divya@iitb.ac.in', program: 'MBA', year: '2nd Year', course: 'Management', branch: 'HR', section: 'A', status: 'active', score: 81, registered_at: '2026-08-15T10:00:00Z', seat_issued: true },
  { id: 'c7', name: 'Amit Kumar', email: 'amit@iitb.ac.in', program: 'B.Tech', year: '2nd Year', course: 'Civil', branch: 'CE', section: 'A', status: 'inactive', registered_at: '2026-08-16T11:00:00Z', seat_issued: false },
  { id: 'c8', name: 'Neha Singh', email: 'neha@iitb.ac.in', program: 'M.Tech', year: '2nd Year', course: 'Data Science', branch: 'DS', section: 'A', status: 'active', score: 87, registered_at: '2026-08-17T09:00:00Z', seat_issued: true },
];

const mockTransactions: SeatTransaction[] = [
  { id: 'txn-1', seats_requested: 100, amount: 29900, payment_method: 'online', status: 'completed', razorpay_order_id: 'order_abc123', razorpay_payment_id: 'pay_xyz789', created_at: '2026-08-01T10:00:00Z', verified_at: '2026-08-01T10:05:00Z' },
  { id: 'txn-2', seats_requested: 50, amount: 14950, payment_method: 'offline', status: 'pending_verification', created_at: '2026-09-01T14:00:00Z', notes: 'Bank transfer reference: NEFT2026090112345' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Candidate['status'] }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    inactive: 'bg-gray-50 text-gray-600 border-gray-200',
    placed: 'bg-violet-50 text-violet-700 border-violet-200',
    interviewing: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${map[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Seat Purchase Modal ──────────────────────────────────────────────────────
function SeatPurchaseModal({ institution, onClose, onSuccess }: {
  institution: Institution;
  onClose: () => void;
  onSuccess: (seats: number, method: 'online' | 'offline') => void;
}) {
  const [seats, setSeats] = useState(10);
  const [method, setMethod] = useState<'online' | 'offline'>('online');
  const [offlineRef, setOfflineRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'configure' | 'processing' | 'success'>('configure');

  const totalAmount = seats * SEAT_PRICE_PER_UNIT;

  const handlePurchase = async () => {
    if (seats < 1) { setError('Minimum 1 seat required'); return; }
    if (method === 'offline' && !offlineRef.trim()) { setError('Please provide payment reference for offline registration'); return; }
    setError('');
    setLoading(true);
    setStep('processing');

    try {
      if (method === 'online') {
        const orderRes = await fetch('/api/razorpay/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: totalAmount, currency: 'INR', receipt: `seats_${institution.id}_${Date.now()}` }),
        });
        const orderData = await orderRes.json();
        if (!orderData.success) throw new Error(orderData.error || 'Failed to create order');

        await new Promise<void>((resolve, reject) => {
          if ((window as any).Razorpay) { resolve(); return; }
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load payment gateway'));
          document.body.appendChild(script);
        });

        await new Promise<void>((resolve, reject) => {
          const rzp = new (window as any).Razorpay({
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'AI Interviewer Platform',
            description: `${seats} Institutional Seats`,
            order_id: orderData.orderId,
            handler: async (response: any) => {
              const verifyRes = await fetch('/api/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                // Send confirmation email
                try {
                  await fetch('/api/email/seat-purchase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ seats, amount: totalAmount, paymentMethod: 'online', transactionId: response.razorpay_payment_id }),
                  });
                } catch {}
                setStep('success');
                onSuccess(seats, 'online');
                resolve();
              } else {
                reject(new Error('Payment verification failed'));
              }
            },
            modal: { ondismiss: () => { setStep('configure'); setLoading(false); reject(new Error('Payment cancelled')); } },
            prefill: { name: institution.name },
            theme: { color: '#0D9488' },
          });
          rzp.open();
        });
      } else {
        await new Promise(r => setTimeout(r, 1000));
        setStep('success');
        onSuccess(seats, 'offline');
      }
    } catch (err: any) {
      if (err?.message !== 'Payment cancelled') {
        setError(err?.message || 'Payment failed. Please try again.');
        setStep('configure');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <CreditCard size={16} className="text-teal-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Purchase Additional Seats</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {step === 'success' ? (
          <div className="px-6 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-700 text-slate-900 mb-2">
              {method === 'online' ? 'Payment Successful!' : 'Request Submitted!'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {method === 'online'
                ? `${seats} seats have been added to your institution.`
                : `Your offline payment request for ${seats} seats has been submitted. Admin will verify and activate seats after confirmation.`}
            </p>
            <button onClick={onClose} className="px-6 py-2.5 bg-teal-600 text-white text-sm font-600 rounded-xl hover:bg-teal-700 transition-colors">
              Done
            </button>
          </div>
        ) : step === 'processing' ? (
          <div className="px-6 py-8 text-center">
            <Loader2 size={32} className="animate-spin text-teal-600 mx-auto mb-4" />
            <p className="text-sm text-slate-600">Processing your {method === 'online' ? 'payment' : 'request'}…</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-600 text-teal-800">Seat Pricing</span>
                <span className="text-lg font-800 text-teal-700">₹{SEAT_PRICE_PER_UNIT.toLocaleString()}/seat</span>
              </div>
              <p className="text-xs text-teal-600">Current usage: {institution.used_seats}/{institution.total_seats} seats</p>
            </div>

            <div>
              <label className="block text-xs font-700 text-slate-700 mb-2">Number of Seats</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setSeats(s => Math.max(1, s - 10))} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 font-700 text-lg">−</button>
                <input
                  type="number"
                  min={1}
                  value={seats}
                  onChange={e => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 text-center text-xl font-800 text-slate-900 border border-slate-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                />
                <button onClick={() => setSeats(s => s + 10)} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 font-700 text-lg">+</button>
              </div>
              <div className="flex gap-2 mt-2">
                {[10, 25, 50, 100].map(n => (
                  <button key={n} onClick={() => setSeats(n)} className={`flex-1 py-1 text-xs font-600 rounded-lg border transition-colors ${seats === n ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 text-slate-600 hover:border-teal-300'}`}>{n}</button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-slate-600">{seats} seats × ₹{SEAT_PRICE_PER_UNIT}</span>
              <span className="text-xl font-800 text-slate-900">₹{totalAmount.toLocaleString()}</span>
            </div>

            <div>
              <label className="block text-xs font-700 text-slate-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMethod('online')} className={`p-3 rounded-xl border-2 text-left transition-all ${method === 'online' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <CreditCard size={16} className={method === 'online' ? 'text-teal-600' : 'text-slate-400'} />
                  <p className={`text-xs font-700 mt-1 ${method === 'online' ? 'text-teal-700' : 'text-slate-600'}`}>Online Payment</p>
                  <p className="text-[10px] text-slate-400">Instant activation</p>
                </button>
                <button onClick={() => setMethod('offline')} className={`p-3 rounded-xl border-2 text-left transition-all ${method === 'offline' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <FileText size={16} className={method === 'offline' ? 'text-teal-600' : 'text-slate-400'} />
                  <p className={`text-xs font-700 mt-1 ${method === 'offline' ? 'text-teal-700' : 'text-slate-600'}`}>Offline / Bank Transfer</p>
                  <p className="text-[10px] text-slate-400">Verified by Admin</p>
                </button>
              </div>
            </div>

            {method === 'offline' && (
              <div>
                <label className="block text-xs font-700 text-slate-700 mb-1.5">Payment Reference / Transaction ID <span className="text-red-500">*</span></label>
                <input
                  value={offlineRef}
                  onChange={e => setOfflineRef(e.target.value)}
                  placeholder="e.g. NEFT2026090112345 or Cheque No."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">Seats will be activated after Admin verifies the payment.</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm font-600 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button
                onClick={handlePurchase}
                disabled={loading}
                className="flex-1 py-2.5 text-sm font-700 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                {method === 'online' ? `Pay ₹${totalAmount.toLocaleString()}` : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Issue Seat Modal ─────────────────────────────────────────────────────────
function IssueSeatModal({ candidate, onClose, onIssue }: {
  candidate: Candidate;
  onClose: () => void;
  onIssue: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <Unlock size={18} className="text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Issue Seat</h3>
            <p className="text-xs text-slate-500">Grant platform access to this candidate</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 mb-5">
          <p className="text-sm font-600 text-slate-800">{candidate.name}</p>
          <p className="text-xs text-slate-500">{candidate.email}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{candidate.program}</span>
            <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-full">{candidate.branch}</span>
            <span className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full">{candidate.section}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-600 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={() => { onIssue(candidate.id); onClose(); }} className="flex-1 py-2.5 text-sm font-700 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors">Issue Seat</button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Import Modal ────────────────────────────────────────────────────────
function BulkImportModal({
  institution,
  availableSeats,
  onClose,
  onImport,
}: {
  institution: Institution;
  availableSeats: number;
  onClose: () => void;
  onImport: (candidates: Candidate[]) => void;
}) {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<Candidate[]>([]);
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) { setImportError('CSV file is empty.'); return; }

    // Detect header row
    const firstLine = lines[0].toLowerCase();
    const hasHeader = CSV_TEMPLATE_HEADERS.some(h => firstLine.includes(h));
    const dataLines = hasHeader ? lines.slice(1) : lines;

    if (dataLines.length === 0) { setImportError('No data rows found in CSV.'); return; }

    const rowErrors: { row: number; message: string }[] = [];
    const candidates: Candidate[] = [];

    dataLines.forEach((line, idx) => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const rowNum = idx + (hasHeader ? 2 : 1);

      if (cols.length < 4) {
        rowErrors.push({ row: rowNum, message: `Row ${rowNum}: Insufficient columns (expected at least 4: name, email, program, year)` });
        return;
      }

      const [name, email, program, year, course, branch, section] = cols;

      if (!name || name.length < 2) {
        rowErrors.push({ row: rowNum, message: `Row ${rowNum}: Invalid or missing name` });
        return;
      }
      if (!email || !email.includes('@')) {
        rowErrors.push({ row: rowNum, message: `Row ${rowNum}: Invalid email address` });
        return;
      }

      candidates.push({
        id: `import-${Date.now()}-${idx}`,
        name,
        email,
        program: program || 'B.Tech',
        year: year || '1st Year',
        course: course || 'General',
        branch: branch || 'General',
        section: section || 'A',
        status: 'inactive',
        registered_at: new Date().toISOString(),
        seat_issued: false,
      });
    });

    setErrors(rowErrors);
    setParsedRows(candidates);

    // Seat availability check
    if (candidates.length > availableSeats) {
      setImportError(
        `Import exceeds available seat capacity. You have ${availableSeats} available seat${availableSeats !== 1 ? 's' : ''}, but the list contains ${candidates.length} candidate${candidates.length !== 1 ? 's' : ''}. Please purchase more seats or reduce the import list.`
      );
    } else {
      setImportError('');
    }

    if (candidates.length > 0 || rowErrors.length > 0) {
      setStep('preview');
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setImportError('Please upload a CSV file (.csv)');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const downloadTemplate = () => {
    const content = [CSV_TEMPLATE_HEADERS.join(','), ...CSV_TEMPLATE_EXAMPLE].join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (importError) return;
    setImporting(true);
    await new Promise(r => setTimeout(r, 1200));
    onImport(parsedRows);
    setImportResult({ success: parsedRows.length, failed: errors.length });
    setStep('result');
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <Upload size={16} className="text-teal-600" />
            </div>
            <div>
              <h2 className="font-700 text-slate-900 text-sm">Bulk Import Candidates</h2>
              <p className="text-xs text-slate-500">Available seats: <strong className={availableSeats === 0 ? 'text-red-600' : 'text-teal-600'}>{availableSeats}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="px-6 py-5 space-y-4">
              {/* Template download */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
                <FileSpreadsheet size={18} className="text-teal-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-700 text-teal-800">Download CSV Template</p>
                  <p className="text-xs text-teal-600 mt-0.5">
                    Required columns: <code className="bg-teal-100 px-1 rounded text-[11px]">name, email, program, year, course, branch, section</code>
                  </p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-700 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Download size={12} /> Template
                </button>
              </div>

              {/* Seat availability warning */}
              {availableSeats === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-700 text-red-700">No Available Seats</p>
                    <p className="text-xs text-red-600 mt-0.5">You have no available seats. Please purchase more seats before importing candidates.</p>
                  </div>
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'}`}
              >
                <Upload size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-600 text-slate-700">Drop your CSV file here</p>
                <p className="text-xs text-slate-400 mt-1">or click to browse — .csv files only</p>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
              </div>

              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{importError}</p>
                </div>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="px-6 py-5 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-800 text-slate-800">{parsedRows.length + errors.length}</p>
                  <p className="text-xs text-slate-500">Total Rows</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-800 text-green-700">{parsedRows.length}</p>
                  <p className="text-xs text-green-600">Valid Rows</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${errors.length > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <p className={`text-xl font-800 ${errors.length > 0 ? 'text-red-700' : 'text-slate-400'}`}>{errors.length}</p>
                  <p className={`text-xs ${errors.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>Errors</p>
                </div>
              </div>

              {/* Seat availability error */}
              {importError && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-700 text-red-700">Import Error — Seat Limit Exceeded</p>
                    <p className="text-xs text-red-600 mt-1">{importError}</p>
                  </div>
                </div>
              )}

              {/* Row errors */}
              {errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-700 text-amber-800 mb-2">Row Errors ({errors.length})</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {errors.map((err, i) => (
                      <p key={i} className="text-xs text-amber-700">• {err.message}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview table */}
              {parsedRows.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                    <p className="text-xs font-700 text-slate-700">Preview — {parsedRows.length} candidates to import</p>
                  </div>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr>
                          {['#', 'Name', 'Email', 'Program', 'Year', 'Branch', 'Section'].map(h => (
                            <th key={h} className="text-left px-3 py-2 font-700 text-slate-600 uppercase tracking-wide text-[10px]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((row, i) => (
                          <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                            <td className="px-3 py-2 font-600 text-slate-800">{row.name}</td>
                            <td className="px-3 py-2 text-slate-500">{row.email}</td>
                            <td className="px-3 py-2"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-600">{row.program}</span></td>
                            <td className="px-3 py-2 text-slate-500">{row.year}</td>
                            <td className="px-3 py-2"><span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-600">{row.branch}</span></td>
                            <td className="px-3 py-2 text-slate-500">{row.section}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && importResult && (
            <div className="px-6 py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-700 text-slate-900 mb-2">Import Successful!</h3>
              <p className="text-sm text-slate-500 mb-6">
                {importResult.success} candidate{importResult.success !== 1 ? 's' : ''} imported successfully.
                {importResult.failed > 0 && ` ${importResult.failed} row${importResult.failed !== 1 ? 's' : ''} skipped due to errors.`}
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={onClose} className="px-6 py-2.5 bg-teal-600 text-white text-sm font-600 rounded-xl hover:bg-teal-700 transition-colors">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
            <button onClick={() => { setStep('upload'); setParsedRows([]); setErrors([]); setImportError(''); setFileName(''); }} className="px-4 py-2 text-sm font-600 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              ← Back
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{fileName}</span>
              <button
                onClick={handleImport}
                disabled={importing || !!importError || parsedRows.length === 0}
                className="flex items-center gap-2 px-5 py-2 text-sm font-700 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Import {parsedRows.length} Candidates
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InstitutionAdminContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [institution, setInstitution] = useState<Institution>(mockInstitution);
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
  const [transactions, setTransactions] = useState<SeatTransaction[]>(mockTransactions);
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [issueSeatCandidate, setIssueSeatCandidate] = useState<Candidate | null>(null);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart2 size={14} /> },
    { id: 'candidates', label: 'Candidates', icon: <Users size={14} /> },
    { id: 'bulk_import', label: 'Bulk Import', icon: <Upload size={14} /> },
    { id: 'seats', label: 'Seat Management', icon: <Layers size={14} /> },
    { id: 'placements', label: 'Placements', icon: <Briefcase size={14} /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={14} /> },
  ];

  const programs = ['All', ...Array.from(new Set(candidates.map(c => c.program)))];
  const years = ['All', ...Array.from(new Set(candidates.map(c => c.year)))];
  const courses = ['All', ...Array.from(new Set(candidates.map(c => c.course)))];
  const branches = ['All', ...Array.from(new Set(candidates.map(c => c.branch)))];
  const sections = ['All', ...Array.from(new Set(candidates.map(c => c.section)))];

  const filteredCandidates = candidates.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchProgram = programFilter === 'All' || c.program === programFilter;
    const matchYear = yearFilter === 'All' || c.year === yearFilter;
    const matchCourse = courseFilter === 'All' || c.course === courseFilter;
    const matchBranch = branchFilter === 'All' || c.branch === branchFilter;
    const matchSection = sectionFilter === 'All' || c.section === sectionFilter;
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchProgram && matchYear && matchCourse && matchBranch && matchSection && matchStatus;
  });

  const issueSeat = (candidateId: string) => {
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, seat_issued: true, status: 'active' } : c));
    setInstitution(prev => ({ ...prev, used_seats: prev.used_seats + 1 }));
  };

  const handleSeatPurchaseSuccess = (seats: number, method: 'online' | 'offline') => {
    if (method === 'online') {
      setInstitution(prev => ({ ...prev, total_seats: prev.total_seats + seats }));
    } else {
      setInstitution(prev => ({ ...prev, pending_seats: prev.pending_seats + seats }));
    }
    const newTxn: SeatTransaction = {
      id: `txn-${Date.now()}`,
      seats_requested: seats,
      amount: seats * SEAT_PRICE_PER_UNIT,
      payment_method: method,
      status: method === 'online' ? 'completed' : 'pending_verification',
      created_at: new Date().toISOString(),
      notes: method === 'offline' ? 'Pending Admin verification' : undefined,
    };
    setTransactions(prev => [newTxn, ...prev]);
  };

  const handleBulkImport = (importedCandidates: Candidate[]) => {
    setCandidates(prev => [...prev, ...importedCandidates]);
  };

  const seatUsagePct = institution.total_seats > 0 ? Math.round((institution.used_seats / institution.total_seats) * 100) : 0;
  const availableSeats = institution.total_seats - institution.used_seats;
  const unusedSeats = institution.total_seats - institution.used_seats;
  const costPerSeat = institution.used_seats > 0 ? Math.round((institution.monthly_cost || 0) / institution.used_seats) : SEAT_PRICE_PER_UNIT;
  const monthlyBurnRate = institution.monthly_cost || (institution.used_seats * SEAT_PRICE_PER_UNIT);

  // Monthly burn rate trend (mock: last 6 months)
  const burnRateTrend = [
    { month: 'Apr', seats: 45, cost: 45 * SEAT_PRICE_PER_UNIT },
    { month: 'May', seats: 52, cost: 52 * SEAT_PRICE_PER_UNIT },
    { month: 'Jun', seats: 58, cost: 58 * SEAT_PRICE_PER_UNIT },
    { month: 'Jul', seats: 61, cost: 61 * SEAT_PRICE_PER_UNIT },
    { month: 'Aug', seats: 65, cost: 65 * SEAT_PRICE_PER_UNIT },
    { month: 'Sep', seats: institution.used_seats, cost: institution.used_seats * SEAT_PRICE_PER_UNIT },
  ];

  return (
    <AppLayout role="admin">
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-800 text-[#0D1B3E]">Institution Admin</h1>
                <span className={`px-2 py-0.5 text-xs font-700 rounded-full ${institution.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' : institution.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {institution.status === 'approved' ? '✓ Approved' : institution.status === 'pending' ? '⏳ Pending Approval' : '⚠ Suspended'}
                </span>
              </div>
              <p className="text-sm text-[#6B7A99] mt-0.5">{institution.name} — {institution.plan}</p>
            </div>
          </div>
          {institution.status === 'approved' && (
            <div className="hidden sm:flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] bg-white">
                <Download size={14} /> Export
              </button>
              <button
                onClick={() => setShowSeatModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg"
              >
                <Plus size={14} /> Buy More Seats
              </button>
            </div>
          )}
        </div>

        {institution.status === 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-700 text-amber-800">Awaiting Admin Approval</p>
              <p className="text-xs text-amber-600 mt-0.5">Your institution registration is under review. You will receive access once approved and seat quota is assigned.</p>
            </div>
          </div>
        )}

        {institution.status === 'approved' && (
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-700 text-[#0D1B3E]">Seat Usage</p>
                <p className="text-xs text-[#6B7A99] mt-0.5">{institution.used_seats} used of {institution.total_seats} total seats</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-800 text-[#0D1B3E]">{availableSeats}</p>
                <p className="text-xs text-[#6B7A99]">available</p>
              </div>
            </div>
            <div className="h-3 bg-[#F4F6FA] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${seatUsagePct >= 90 ? 'bg-red-500' : seatUsagePct >= 70 ? 'bg-amber-500' : 'bg-[#0D9488]'}`}
                style={{ width: `${seatUsagePct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-[#6B7A99]">{seatUsagePct}% used</span>
              {institution.pending_seats > 0 && (
                <span className="text-xs text-amber-600 font-600 flex items-center gap-1">
                  <Clock size={11} /> {institution.pending_seats} seats pending verification
                </span>
              )}
              {seatUsagePct >= 80 && (
                <button onClick={() => setShowSeatModal(true)} className="text-xs font-700 text-teal-600 hover:underline flex items-center gap-1">
                  <Plus size={11} /> Buy more seats
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Nav */}
        <div className="flex gap-0 border-b border-[#E8ECF4] overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap',
                activeTab === tab.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
              ].join(' ')}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Dashboard Tab ── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Candidates', value: candidates.length, icon: <Users size={16} />, color: 'bg-blue-50 text-blue-600' },
                { label: 'Seats Used', value: institution.used_seats, icon: <Layers size={16} />, color: 'bg-teal-50 text-teal-600' },
                { label: 'Placed', value: candidates.filter(c => c.status === 'placed').length, icon: <Award size={16} />, color: 'bg-violet-50 text-violet-600' },
                { label: 'Avg Score', value: `${Math.round(candidates.filter(c => c.score).reduce((s, c) => s + (c.score || 0), 0) / candidates.filter(c => c.score).length)}%`, icon: <TrendingUp size={16} />, color: 'bg-amber-50 text-amber-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-[#E8ECF4] rounded-xl p-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>{stat.icon}</div>
                  <p className="text-xl font-800 text-[#0D1B3E]">{stat.value}</p>
                  <p className="text-xs text-[#6B7A99] mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Candidates by Branch/Department</h3>
              <div className="space-y-3">
                {Array.from(new Set(candidates.map(c => c.branch))).map(branch => {
                  const branchCandidates = candidates.filter(c => c.branch === branch);
                  const pct = Math.round((branchCandidates.length / candidates.length) * 100);
                  return (
                    <div key={branch} className="flex items-center gap-3">
                      <span className="text-xs font-600 text-[#6B7A99] w-16 shrink-0">{branch}</span>
                      <div className="flex-1 h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                        <div className="h-full bg-[#0D9488] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-700 text-[#0D1B3E] w-8 text-right">{branchCandidates.length}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Candidates Tab ── */}
        {activeTab === 'candidates' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates…" className="w-full pl-9 pr-4 py-2 text-sm border border-[#E8ECF4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-[#E8ECF4] rounded-lg px-2.5 py-2 bg-white focus:outline-none text-[#6B7A99]">
                  <option value="All">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="placed">Placed</option>
                  <option value="interviewing">Interviewing</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={programFilter} onChange={e => setProgramFilter(e.target.value)} className="text-xs border border-[#E8ECF4] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none text-[#6B7A99]">
                  {programs.map(p => <option key={p}>{p === 'All' ? 'All Programs' : p}</option>)}
                </select>
                <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="text-xs border border-[#E8ECF4] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none text-[#6B7A99]">
                  {years.map(y => <option key={y}>{y === 'All' ? 'All Years' : y}</option>)}
                </select>
                <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="text-xs border border-[#E8ECF4] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none text-[#6B7A99]">
                  {courses.map(c => <option key={c}>{c === 'All' ? 'All Courses' : c}</option>)}
                </select>
                <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="text-xs border border-[#E8ECF4] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none text-[#6B7A99]">
                  {branches.map(b => <option key={b}>{b === 'All' ? 'All Branches' : b}</option>)}
                </select>
                <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="text-xs border border-[#E8ECF4] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none text-[#6B7A99]">
                  {sections.map(s => <option key={s}>{s === 'All' ? 'All Sections' : s}</option>)}
                </select>
                <span className="ml-auto text-xs text-[#6B7A99] self-center">{filteredCandidates.length} candidates</span>
              </div>
            </div>

            <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8ECF4] bg-[#F8FAFC]">
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide w-10">S.No</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Candidate</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Program</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Year</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Branch / Section</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Score</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Seat</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate, idx) => (
                    <tr key={candidate.id} className="border-b border-[#F4F6FA] hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0D9488] flex items-center justify-center text-xs font-700 text-white shrink-0">
                            {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-600 text-[#0D1B3E] text-sm">{candidate.name}</p>
                            <p className="text-xs text-[#6B7A99]">{candidate.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-600">{candidate.program}</span></td>
                      <td className="px-4 py-3 text-xs text-[#6B7A99]">{candidate.year}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded font-500">{candidate.branch}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded font-500">Sec {candidate.section}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={candidate.status} /></td>
                      <td className="px-4 py-3">
                        {candidate.score ? (
                          <span className={`font-700 text-sm ${candidate.score >= 85 ? 'text-green-600' : candidate.score >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>{candidate.score}%</span>
                        ) : <span className="text-xs text-[#6B7A99]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {candidate.seat_issued ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-600"><CheckCircle size={12} /> Issued</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-600"><Lock size={12} /> Not issued</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {!candidate.seat_issued && availableSeats > 0 && (
                            <button onClick={() => setIssueSeatCandidate(candidate)} className="px-2.5 py-1 text-xs font-600 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">Issue Seat</button>
                          )}
                          <button className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D1B3E] transition-colors"><Eye size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCandidates.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-[#6B7A99]">No candidates match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Bulk Import Tab ── */}
        {activeTab === 'bulk_import' && (
          <div className="space-y-5">
            {/* Info Banner */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                <Upload size={20} className="text-teal-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-700 text-teal-800">Bulk Import Candidates via CSV</h3>
                <p className="text-xs text-teal-600 mt-1">
                  Upload a CSV file with candidate details. The system validates each row against available seat count.
                  If the list exceeds available seats, the import will be blocked with an error.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={11} /> Validates seat availability
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={11} /> Row-level error reporting
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={11} /> Preview before import
                  </div>
                </div>
              </div>
            </div>

            {/* Seat Status */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 text-center">
                <p className="text-2xl font-800 text-[#0D1B3E]">{institution.total_seats}</p>
                <p className="text-xs text-[#6B7A99] mt-0.5">Total Seats</p>
              </div>
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 text-center">
                <p className="text-2xl font-800 text-[#0D1B3E]">{institution.used_seats}</p>
                <p className="text-xs text-[#6B7A99] mt-0.5">Used Seats</p>
              </div>
              <div className={`border rounded-xl p-4 text-center ${availableSeats === 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <p className={`text-2xl font-800 ${availableSeats === 0 ? 'text-red-700' : 'text-green-700'}`}>{availableSeats}</p>
                <p className={`text-xs mt-0.5 ${availableSeats === 0 ? 'text-red-500' : 'text-green-600'}`}>Available for Import</p>
              </div>
            </div>

            {availableSeats === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-700 text-red-700">No Available Seats</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    All seats are currently in use. Please purchase additional seats before importing new candidates.
                  </p>
                  <button onClick={() => setShowSeatModal(true)} className="mt-2 text-xs font-700 text-red-700 underline hover:no-underline">
                    Purchase More Seats →
                  </button>
                </div>
              </div>
            )}

            {/* Template Info */}
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-3">CSV Template Format</h3>
              <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-lg p-4 font-mono text-xs text-[#0D1B3E] overflow-x-auto">
                <p className="text-[#0D9488] font-700">name,email,program,year,course,branch,section</p>
                {CSV_TEMPLATE_EXAMPLE.map((row, i) => (
                  <p key={i} className="text-[#6B7A99] mt-1">{row}</p>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { field: 'name', required: true, desc: 'Full name' },
                  { field: 'email', required: true, desc: 'Valid email' },
                  { field: 'program', required: false, desc: 'e.g. B.Tech' },
                  { field: 'year', required: false, desc: 'e.g. 3rd Year' },
                  { field: 'course', required: false, desc: 'e.g. CSE' },
                  { field: 'branch', required: false, desc: 'Department code' },
                  { field: 'section', required: false, desc: 'Section A/B/C' },
                ].map(f => (
                  <div key={f.field} className="bg-[#F8FAFC] rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <code className="text-[11px] font-700 text-[#0D9488]">{f.field}</code>
                      {f.required && <span className="text-[9px] font-700 text-red-500 bg-red-50 px-1 rounded">REQ</span>}
                    </div>
                    <p className="text-[10px] text-[#6B7A99]">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload CTA */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-600 text-[#0D1B3E]">Ready to import?</p>
                <p className="text-xs text-[#6B7A99] mt-0.5">You can import up to {availableSeats} candidate{availableSeats !== 1 ? 's' : ''} based on available seats.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const content = [CSV_TEMPLATE_HEADERS.join(','), ...CSV_TEMPLATE_EXAMPLE].join('\n');
                    const blob = new Blob([content], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'candidate_import_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] bg-white"
                >
                  <Download size={14} /> Template
                </button>
                <button
                  onClick={() => setShowBulkImport(true)}
                  disabled={availableSeats === 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-700 bg-[#0D9488] text-white rounded-lg hover:bg-[#0B8076] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={14} /> Upload CSV
                </button>
              </div>
            </div>

            {/* Recent imports */}
            {candidates.filter(c => c.id.startsWith('import-')).length > 0 && (
              <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E8ECF4] bg-[#F8FAFC]">
                  <p className="text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Recently Imported</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8ECF4]">
                      {['#', 'Name', 'Email', 'Program', 'Branch', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.filter(c => c.id.startsWith('import-')).map((c, i) => (
                      <tr key={c.id} className="border-b border-[#F4F6FA] hover:bg-[#F8FAFC]">
                        <td className="px-4 py-2.5 text-xs text-[#6B7A99]">{i + 1}</td>
                        <td className="px-4 py-2.5 font-600 text-[#0D1B3E] text-xs">{c.name}</td>
                        <td className="px-4 py-2.5 text-xs text-[#6B7A99]">{c.email}</td>
                        <td className="px-4 py-2.5"><span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-600">{c.program}</span></td>
                        <td className="px-4 py-2.5"><span className="text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded font-600">{c.branch}</span></td>
                        <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Seat Management Tab ── */}
        {activeTab === 'seats' && (
          <div className="space-y-5">
            {/* Seat Analytics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center"><Layers size={14} className="text-teal-600" /></div>
                  <p className="text-xs text-[#6B7A99]">Active Seats</p>
                </div>
                <p className="text-3xl font-800 text-[#0D1B3E]">{institution.used_seats}</p>
                <p className="text-xs text-teal-600 font-600 mt-1">{seatUsagePct}% utilization</p>
              </div>
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center"><Activity size={14} className="text-slate-500" /></div>
                  <p className="text-xs text-[#6B7A99]">Unused Seats</p>
                </div>
                <p className="text-3xl font-800 text-[#0D1B3E]">{unusedSeats}</p>
                <p className="text-xs text-[#6B7A99] mt-1">{100 - seatUsagePct}% available</p>
              </div>
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><DollarSign size={14} className="text-amber-600" /></div>
                  <p className="text-xs text-[#6B7A99]">Monthly Burn Rate</p>
                </div>
                <p className="text-2xl font-800 text-[#0D1B3E]">₹{monthlyBurnRate.toLocaleString()}</p>
                <p className="text-xs text-[#6B7A99] mt-1">Based on active seats</p>
              </div>
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center"><TrendingUp size={14} className="text-violet-600" /></div>
                  <p className="text-xs text-[#6B7A99]">Cost per Active Seat</p>
                </div>
                <p className="text-2xl font-800 text-[#0D1B3E]">₹{costPerSeat.toLocaleString()}</p>
                <p className="text-xs text-[#6B7A99] mt-1">Per seat / month</p>
              </div>
            </div>

            {/* Auto-Renewal Subscription */}
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} className="text-[#0D9488]" />
                  <h3 className="text-sm font-700 text-[#0D1B3E]">Auto-Renewal Subscription</h3>
                </div>
                <button
                  onClick={() => setInstitution(prev => ({ ...prev, auto_renewal: !prev.auto_renewal }))}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-700 transition-colors ${institution.auto_renewal ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}
                >
                  {institution.auto_renewal ? <ToggleRight size={16} className="text-teal-600" /> : <ToggleLeft size={16} className="text-slate-400" />}
                  {institution.auto_renewal ? 'Auto-Renewal ON' : 'Auto-Renewal OFF'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <p className="text-xs text-[#6B7A99] mb-1">Renewal Date</p>
                  <p className="text-base font-700 text-[#0D1B3E]">{institution.renewal_date || 'Not set'}</p>
                  <p className="text-xs text-[#6B7A99] mt-0.5">Next billing cycle</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <p className="text-xs text-[#6B7A99] mb-1">Renewal Amount</p>
                  <p className="text-base font-700 text-[#0D1B3E]">₹{(institution.total_seats * SEAT_PRICE_PER_UNIT).toLocaleString()}</p>
                  <p className="text-xs text-[#6B7A99] mt-0.5">{institution.total_seats} seats × ₹{SEAT_PRICE_PER_UNIT}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <p className="text-xs text-[#6B7A99] mb-1">Status</p>
                  <p className={`text-base font-700 ${institution.auto_renewal ? 'text-teal-600' : 'text-slate-500'}`}>
                    {institution.auto_renewal ? '✓ Active' : '✗ Disabled'}
                  </p>
                  <p className="text-xs text-[#6B7A99] mt-0.5">{institution.auto_renewal ? 'Will renew automatically' : 'Manual renewal required'}</p>
                </div>
              </div>
              {institution.auto_renewal && (
                <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <p className="text-xs text-teal-700">
                    <strong>Auto-renewal is active.</strong> Your subscription will automatically renew on {institution.renewal_date}. A reminder email will be sent 7 days before renewal.
                  </p>
                </div>
              )}
            </div>

            {/* Monthly Burn Rate Trend */}
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Monthly Seat Usage Trend</h3>
              <div className="space-y-2">
                {burnRateTrend.map((m, i) => {
                  const maxCost = Math.max(...burnRateTrend.map(b => b.cost));
                  const pct = Math.round((m.cost / maxCost) * 100);
                  return (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs font-600 text-[#6B7A99] w-8 shrink-0">{m.month}</span>
                      <div className="flex-1 h-5 bg-[#F4F6FA] rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all ${i === burnRateTrend.length - 1 ? 'bg-[#0D9488]' : 'bg-[#0D9488]/40'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-700 text-[#0D1B3E] w-20 text-right">₹{m.cost.toLocaleString()}</span>
                      <span className="text-xs text-[#6B7A99] w-16 text-right">{m.seats} seats</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Buy more seats CTA */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-white font-700 text-base">Need more seats?</p>
                <p className="text-teal-100 text-sm mt-0.5">₹{SEAT_PRICE_PER_UNIT}/seat — Pay online for instant activation or register offline for Admin verification.</p>
              </div>
              <button onClick={() => setShowSeatModal(true)} className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white text-teal-700 text-sm font-700 rounded-xl hover:bg-teal-50 transition-colors">
                <Plus size={16} /> Buy Seats
              </button>
            </div>

            {/* Transaction history */}
            <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E8ECF4]">
                <h3 className="text-sm font-700 text-[#0D1B3E]">Seat Purchase History</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E8ECF4]">
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide w-10">S.No</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Seats</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Method</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn, idx) => (
                    <tr key={txn.id} className="border-b border-[#F4F6FA] hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                      <td className="px-4 py-3 text-xs text-[#6B7A99]">{new Date(txn.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-700 text-[#0D1B3E]">{txn.seats_requested}</td>
                      <td className="px-4 py-3 font-700 text-[#0D1B3E]">₹{txn.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-600 ${txn.payment_method === 'online' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                          {txn.payment_method === 'online' ? '💳 Online' : '🏦 Offline'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-600 ${txn.status === 'completed' ? 'bg-green-50 text-green-700' : txn.status === 'pending_verification' ? 'bg-amber-50 text-amber-700' : txn.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                          {txn.status === 'completed' ? '✓ Completed' : txn.status === 'pending_verification' ? '⏳ Pending Verification' : txn.status === 'failed' ? '✗ Failed' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6B7A99]">{txn.notes || (txn.razorpay_payment_id ? `Pay ID: ${txn.razorpay_payment_id.slice(0, 12)}…` : '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Placements Tab ── */}
        {activeTab === 'placements' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Candidates', value: candidates.length, color: 'text-slate-800' },
                { label: 'Placed', value: candidates.filter(c => c.status === 'placed').length, color: 'text-green-600' },
                { label: 'Interviewing', value: candidates.filter(c => c.status === 'interviewing').length, color: 'text-blue-600' },
                { label: 'Placement Rate', value: `${Math.round((candidates.filter(c => c.status === 'placed').length / candidates.length) * 100)}%`, color: 'text-teal-600' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-[#E8ECF4] rounded-xl p-4 text-center">
                  <p className={`text-2xl font-800 ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-[#6B7A99] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Placement by Program</h3>
              <div className="space-y-3">
                {programs.filter(p => p !== 'All').map(program => {
                  const prog = candidates.filter(c => c.program === program);
                  const placed = prog.filter(c => c.status === 'placed').length;
                  const pct = prog.length > 0 ? Math.round((placed / prog.length) * 100) : 0;
                  return (
                    <div key={program}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-600 text-[#0D1B3E]">{program}</span>
                        <span className="text-xs font-700 text-[#0D9488]">{pct}% ({placed}/{prog.length})</span>
                      </div>
                      <div className="h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                        <div className="h-full bg-[#0D9488] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Analytics Tab ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Score Distribution by Branch</h3>
                <div className="space-y-3">
                  {Array.from(new Set(candidates.map(c => c.branch))).map(branch => {
                    const branchCandidates = candidates.filter(c => c.branch === branch && c.score);
                    const avg = branchCandidates.length > 0 ? Math.round(branchCandidates.reduce((s, c) => s + (c.score || 0), 0) / branchCandidates.length) : 0;
                    return (
                      <div key={branch} className="flex items-center gap-3">
                        <span className="text-xs font-600 text-[#6B7A99] w-12 shrink-0">{branch}</span>
                        <div className="flex-1 h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                          <div className="h-full bg-[#0D9488] rounded-full" style={{ width: `${avg}%` }} />
                        </div>
                        <span className="text-xs font-700 text-[#0D1B3E] w-10 text-right">{avg}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Candidates by Year</h3>
                <div className="space-y-3">
                  {years.filter(y => y !== 'All').map(year => {
                    const yearCandidates = candidates.filter(c => c.year === year);
                    const pct = Math.round((yearCandidates.length / candidates.length) * 100);
                    return (
                      <div key={year} className="flex items-center gap-3">
                        <span className="text-xs font-600 text-[#6B7A99] w-20 shrink-0">{year}</span>
                        <div className="flex-1 h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-700 text-[#0D1B3E] w-8 text-right">{yearCandidates.length}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSeatModal && (
        <SeatPurchaseModal
          institution={institution}
          onClose={() => setShowSeatModal(false)}
          onSuccess={handleSeatPurchaseSuccess}
        />
      )}
      {issueSeatCandidate && (
        <IssueSeatModal
          candidate={issueSeatCandidate}
          onClose={() => setIssueSeatCandidate(null)}
          onIssue={issueSeat}
        />
      )}
      {showBulkImport && (
        <BulkImportModal
          institution={institution}
          availableSeats={availableSeats}
          onClose={() => setShowBulkImport(false)}
          onImport={handleBulkImport}
        />
      )}
    </AppLayout>
  );
}
