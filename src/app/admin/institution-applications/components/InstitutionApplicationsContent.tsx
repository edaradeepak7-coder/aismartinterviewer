'use client';
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Building2, Clock, CheckCircle, XCircle, Eye, Search, Download, AlertCircle, CreditCard, Layers, X, Loader2, Phone, Globe, MapPin, User, Mail, Check, Ban } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type AppStatus = 'pending' | 'approved' | 'rejected' | 'under_review';

interface InstitutionApplication {
  id: string;
  institution_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  institution_type: string;
  address?: string;
  website?: string;
  seats_requested: number;
  payment_method: 'online' | 'offline';
  payment_reference?: string;
  payment_amount?: number;
  bank_name?: string;
  transfer_date?: string;
  status: AppStatus;
  seats_allocated?: number;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  reviewed_at?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_APPLICATIONS: InstitutionApplication[] = [
  {
    id: 'app-1', institution_name: 'VIT Vellore', contact_name: 'Dr. Ramesh Kumar',
    contact_email: 'ramesh@vit.ac.in', contact_phone: '+91-9876543210',
    institution_type: 'Engineering', address: 'Vellore, Tamil Nadu', website: 'https://vit.ac.in',
    seats_requested: 200, payment_method: 'offline', payment_reference: 'NEFT20260901VIT001',
    payment_amount: 59800, bank_name: 'State Bank of India', transfer_date: '2026-09-01',
    status: 'pending', notes: 'Large batch — 200 seats for B.Tech final year',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'app-2', institution_name: 'BITS Pilani', contact_name: 'Prof. Anita Sharma',
    contact_email: 'anita@bits.ac.in', contact_phone: '+91-9123456789',
    institution_type: 'Engineering', address: 'Pilani, Rajasthan', website: 'https://bits-pilani.ac.in',
    seats_requested: 150, payment_method: 'offline', payment_reference: 'RTGS20260902BITS002',
    payment_amount: 44850, bank_name: 'HDFC Bank', transfer_date: '2026-09-02',
    status: 'pending', notes: 'BITS Pilani campus — 150 seats for placement season',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'app-3', institution_name: 'IIM Ahmedabad', contact_name: 'Dr. Priya Nair',
    contact_email: 'priya@iima.ac.in', contact_phone: '+91-9988776655',
    institution_type: 'Management', address: 'Ahmedabad, Gujarat', website: 'https://iima.ac.in',
    seats_requested: 80, payment_method: 'online', payment_amount: 23920,
    status: 'pending', notes: 'MBA batch — 80 seats for summer placements',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'app-4', institution_name: 'NIT Warangal', contact_name: 'Prof. Suresh Reddy',
    contact_email: 'suresh@nitw.ac.in', contact_phone: '+91-9654321098',
    institution_type: 'Engineering', address: 'Warangal, Telangana', website: 'https://nitw.ac.in',
    seats_requested: 120, payment_method: 'offline', payment_reference: 'IMPS20260830NIT003',
    payment_amount: 35880, bank_name: 'Axis Bank', transfer_date: '2026-08-30',
    status: 'approved', seats_allocated: 120,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    reviewed_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'app-5', institution_name: 'Amity University', contact_name: 'Dr. Kavita Joshi',
    contact_email: 'kavita@amity.edu', contact_phone: '+91-9871234567',
    institution_type: 'Private University', address: 'Noida, Uttar Pradesh',
    seats_requested: 300, payment_method: 'offline', payment_reference: 'NEFT20260825AMT004',
    payment_amount: 89700, bank_name: 'ICICI Bank', transfer_date: '2026-08-25',
    status: 'rejected', rejection_reason: 'Payment reference could not be verified with bank records.',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    reviewed_at: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
];

const SEAT_PRICE = 299;

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: AppStatus }) {
  const map: Record<AppStatus, { cls: string; label: string }> = {
    pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: '⏳ Pending' },
    under_review: { cls: 'bg-blue-50 text-blue-700 border-blue-200', label: '🔍 Under Review' },
    approved: { cls: 'bg-green-50 text-green-700 border-green-200', label: '✓ Approved' },
    rejected: { cls: 'bg-red-50 text-red-700 border-red-200', label: '✗ Rejected' },
  };
  const { cls, label } = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({
  app,
  onClose,
  onApprove,
  onReject,
}: {
  app: InstitutionApplication;
  onClose: () => void;
  onApprove: (id: string, seats: number) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [seatsAllocated, setSeatsAllocated] = useState(app.seats_requested);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (action === 'approve' && seatsAllocated < 1) return;
    if (action === 'reject' && !rejectionReason.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    if (action === 'approve') onApprove(app.id, seatsAllocated);
    else if (action === 'reject') onReject(app.id, rejectionReason);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Building2 size={18} className="text-teal-600" />
            </div>
            <div>
              <h2 className="font-700 text-slate-900">{app.institution_name}</h2>
              <p className="text-xs text-slate-500">{app.institution_type} · Applied {new Date(app.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Institution Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-xs font-700 text-slate-500 uppercase tracking-wide">Contact Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <User size={13} className="text-slate-400" />
                  <span>{app.contact_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Mail size={13} className="text-slate-400" />
                  <span>{app.contact_email}</span>
                </div>
                {app.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Phone size={13} className="text-slate-400" />
                    <span>{app.contact_phone}</span>
                  </div>
                )}
                {app.address && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <MapPin size={13} className="text-slate-400" />
                    <span>{app.address}</span>
                  </div>
                )}
                {app.website && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Globe size={13} className="text-slate-400" />
                    <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">{app.website}</a>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-700 text-slate-500 uppercase tracking-wide">Seat Request</h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Seats Requested</span>
                  <span className="font-700 text-slate-900">{app.seats_requested}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Price per Seat</span>
                  <span className="font-600 text-slate-700">₹{SEAT_PRICE}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                  <span className="text-slate-700 font-600">Expected Amount</span>
                  <span className="font-800 text-teal-700">₹{(app.seats_requested * SEAT_PRICE).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-xs font-700 text-amber-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <CreditCard size={13} /> Payment Verification
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-amber-600 text-xs">Payment Method</span>
                <p className="font-700 text-amber-900 mt-0.5">
                  {app.payment_method === 'online' ? '💳 Online Payment' : '🏦 Bank Transfer (Offline)'}
                </p>
              </div>
              {app.payment_amount && (
                <div>
                  <span className="text-amber-600 text-xs">Amount Claimed</span>
                  <p className="font-700 text-amber-900 mt-0.5">₹{app.payment_amount.toLocaleString()}</p>
                </div>
              )}
              {app.payment_reference && (
                <div>
                  <span className="text-amber-600 text-xs">Reference / UTR</span>
                  <p className="font-700 text-amber-900 mt-0.5 font-mono text-xs">{app.payment_reference}</p>
                </div>
              )}
              {app.bank_name && (
                <div>
                  <span className="text-amber-600 text-xs">Bank Name</span>
                  <p className="font-700 text-amber-900 mt-0.5">{app.bank_name}</p>
                </div>
              )}
              {app.transfer_date && (
                <div>
                  <span className="text-amber-600 text-xs">Transfer Date</span>
                  <p className="font-700 text-amber-900 mt-0.5">{new Date(app.transfer_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
            {app.payment_method === 'offline' && (
              <div className="mt-3 flex items-start gap-2 bg-amber-100 rounded-lg p-3">
                <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>Verify offline payment:</strong> Cross-check the UTR/reference number with your bank statement before approving. Seats will be activated only after your approval.
                </p>
              </div>
            )}
          </div>

          {app.notes && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-xs font-700 text-slate-500 uppercase tracking-wide mb-2">Notes</h3>
              <p className="text-sm text-slate-700">{app.notes}</p>
            </div>
          )}

          {/* Action Section */}
          {app.status === 'pending' || app.status === 'under_review' ? (
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <h3 className="text-sm font-700 text-slate-800">Take Action</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAction('approve')}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${action === 'approve' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-green-300'}`}
                >
                  <CheckCircle size={16} className={action === 'approve' ? 'text-green-600' : 'text-slate-400'} />
                  <p className={`text-xs font-700 mt-1 ${action === 'approve' ? 'text-green-700' : 'text-slate-600'}`}>Approve & Allocate Seats</p>
                  <p className="text-[10px] text-slate-400">Institution gets access immediately</p>
                </button>
                <button
                  onClick={() => setAction('reject')}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${action === 'reject' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-300'}`}
                >
                  <XCircle size={16} className={action === 'reject' ? 'text-red-600' : 'text-slate-400'} />
                  <p className={`text-xs font-700 mt-1 ${action === 'reject' ? 'text-red-700' : 'text-slate-600'}`}>Reject Application</p>
                  <p className="text-[10px] text-slate-400">Notify institution with reason</p>
                </button>
              </div>

              {action === 'approve' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                  <label className="block text-xs font-700 text-green-800">Seats to Allocate</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSeatsAllocated(s => Math.max(1, s - 10))} className="w-9 h-9 rounded-lg border border-green-300 flex items-center justify-center text-green-700 hover:bg-green-100 font-700 text-lg">−</button>
                    <input
                      type="number"
                      min={1}
                      value={seatsAllocated}
                      onChange={e => setSeatsAllocated(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 text-center text-xl font-800 text-slate-900 border border-green-300 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white"
                    />
                    <button onClick={() => setSeatsAllocated(s => s + 10)} className="w-9 h-9 rounded-lg border border-green-300 flex items-center justify-center text-green-700 hover:bg-green-100 font-700 text-lg">+</button>
                  </div>
                  <p className="text-xs text-green-700">
                    Requested: <strong>{app.seats_requested}</strong> seats · Revenue: <strong>₹{(seatsAllocated * SEAT_PRICE).toLocaleString()}</strong>
                  </p>
                </div>
              )}

              {action === 'reject' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  <label className="block text-xs font-700 text-red-800">Rejection Reason <span className="text-red-500">*</span></label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Payment reference could not be verified with bank records."
                    className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white resize-none"
                  />
                </div>
              )}

              {action && (
                <div className="flex gap-3">
                  <button onClick={() => setAction(null)} className="flex-1 py-2.5 text-sm font-600 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || (action === 'reject' && !rejectionReason.trim())}
                    className={`flex-1 py-2.5 text-sm font-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${action === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : action === 'approve' ? <Check size={14} /> : <Ban size={14} />}
                    {action === 'approve' ? `Approve & Allocate ${seatsAllocated} Seats` : 'Reject Application'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={`rounded-xl p-4 ${app.status === 'approved' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-700 ${app.status === 'approved' ? 'text-green-800' : 'text-red-800'}`}>
                {app.status === 'approved' ? `✓ Approved — ${app.seats_allocated} seats allocated` : '✗ Rejected'}
              </p>
              {app.rejection_reason && <p className="text-xs text-red-600 mt-1">{app.rejection_reason}</p>}
              {app.reviewed_at && <p className="text-xs text-slate-500 mt-1">Reviewed on {new Date(app.reviewed_at).toLocaleDateString()}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InstitutionApplicationsContent() {
  const [applications, setApplications] = useState<InstitutionApplication[]>(MOCK_APPLICATIONS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [selectedApp, setSelectedApp] = useState<InstitutionApplication | null>(null);

  const filtered = applications.filter(a => {
    const matchSearch = !search || a.institution_name.toLowerCase().includes(search.toLowerCase()) || a.contact_email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchPayment = paymentFilter === 'all' || a.payment_method === paymentFilter;
    return matchSearch && matchStatus && matchPayment;
  });

  const stats = {
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    totalSeats: applications.filter(a => a.status === 'approved').reduce((s, a) => s + (a.seats_allocated || 0), 0),
  };

  const handleApprove = (id: string, seats: number) => {
    setApplications(prev => prev.map(a => a.id === id ? {
      ...a, status: 'approved', seats_allocated: seats, reviewed_at: new Date().toISOString()
    } : a));
  };

  const handleReject = (id: string, reason: string) => {
    setApplications(prev => prev.map(a => a.id === id ? {
      ...a, status: 'rejected', rejection_reason: reason, reviewed_at: new Date().toISOString()
    } : a));
  };

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
              <h1 className="text-2xl font-800 text-[#0D1B3E]">Institution Applications</h1>
              <p className="text-sm text-[#6B7A99] mt-0.5">Review pending applications, verify bank transfers, approve with seat allocation</p>
            </div>
          </div>
          <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] bg-white">
            <Download size={14} /> Export
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pending Review', value: stats.pending, icon: <Clock size={16} />, color: 'bg-amber-50 text-amber-600', border: 'border-amber-200' },
            { label: 'Approved', value: stats.approved, icon: <CheckCircle size={16} />, color: 'bg-green-50 text-green-600', border: 'border-green-200' },
            { label: 'Rejected', value: stats.rejected, icon: <XCircle size={16} />, color: 'bg-red-50 text-red-600', border: 'border-red-200' },
            { label: 'Total Seats Allocated', value: stats.totalSeats.toLocaleString(), icon: <Layers size={16} />, color: 'bg-teal-50 text-teal-600', border: 'border-teal-200' },
          ].map(s => (
            <div key={s.label} className={`bg-white border ${s.border} rounded-xl p-4`}>
              <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
              <p className="text-2xl font-800 text-[#0D1B3E]">{s.value}</p>
              <p className="text-xs text-[#6B7A99] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search institutions…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white text-[#0D1B3E]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value as any)}
            className="px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white text-[#0D1B3E]"
          >
            <option value="all">All Payments</option>
            <option value="online">Online</option>
            <option value="offline">Offline / Bank Transfer</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-[#F8FAFC] border-b border-[#E8ECF4]">
                <tr>
                  {['S.No', 'Institution', 'Contact', 'Seats Req.', 'Payment', 'Amount', 'Status', 'Applied', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-700 text-[#6B7A99] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F6FA]">
                {filtered.map((app, idx) => (
                  <tr key={app.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                          <Building2 size={14} className="text-teal-600" />
                        </div>
                        <div>
                          <p className="font-700 text-[#0D1B3E]">{app.institution_name}</p>
                          <p className="text-xs text-[#6B7A99]">{app.institution_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-600 text-[#0D1B3E] text-xs">{app.contact_name}</p>
                      <p className="text-xs text-[#6B7A99]">{app.contact_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-700 text-[#0D1B3E]">{app.seats_requested}</span>
                      {app.seats_allocated && app.seats_allocated !== app.seats_requested && (
                        <p className="text-xs text-teal-600 font-600">Allocated: {app.seats_allocated}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-600 ${app.payment_method === 'online' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                        {app.payment_method === 'online' ? '💳 Online' : '🏦 Offline'}
                      </span>
                      {app.payment_reference && (
                        <p className="text-[10px] text-[#6B7A99] mt-0.5 font-mono">{app.payment_reference.slice(0, 14)}…</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-700 text-[#0D1B3E]">
                      {app.payment_amount ? `₹${app.payment_amount.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                    <td className="px-4 py-3 text-xs text-[#6B7A99] whitespace-nowrap">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        <Eye size={12} /> Review
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-[#6B7A99]">No applications found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedApp && (
        <ReviewModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </AppLayout>
  );
}
