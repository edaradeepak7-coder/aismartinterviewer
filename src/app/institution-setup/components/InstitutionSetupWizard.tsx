'use client';
import React, { useState } from 'react';
import { Building2, User, CreditCard, Users, CheckCircle2, ChevronRight, ChevronLeft, Trash2, Mail, Phone, Globe, MapPin, Lock, Shield, Zap, Star, Crown, Check, AlertCircle, Loader2, UserPlus, Briefcase, GraduationCap, Settings } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrgDetails {
  name: string;
  type: string;
  website: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  size: string;
}

interface AdminAccount {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  jobTitle: string;
  department: string;
}

interface SelectedPlan {
  planId: string;
  seats: number;
}

interface BillingInfo {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  billingAddress: string;
  billingCity: string;
  billingCountry: string;
  taxId: string;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface WizardState {
  org: OrgDetails;
  admin: AdminAccount;
  plan: SelectedPlan;
  billing: BillingInfo;
  team: TeamMember[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'org', label: 'Organization', shortLabel: 'Org', icon: <Building2 size={16} /> },
  { id: 'admin', label: 'Admin Contact', shortLabel: 'Admin', icon: <User size={16} /> },
  { id: 'plan', label: 'Plan & Seats', shortLabel: 'Plan', icon: <Zap size={16} /> },
  { id: 'billing', label: 'Billing Info', shortLabel: 'Billing', icon: <CreditCard size={16} /> },
  { id: 'team', label: 'Invite Team', shortLabel: 'Team', icon: <Users size={16} /> },
];

const ORG_TYPES = ['University', 'College', 'Coaching Institute', 'Corporate Training', 'School', 'EdTech Company', 'Other'];
const ORG_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+'];
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Singapore', 'UAE', 'Other'];
const TEAM_ROLES = ['Admin', 'Recruiter', 'Instructor', 'Viewer', 'HR Manager'];

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: <Zap size={18} />,
    color: 'from-teal-500 to-cyan-500',
    border: 'border-teal-500/30',
    bg: 'bg-teal-500/10',
    pricePerSeat: 4999,
    currency: '₹',
    period: '/seat/mo',
    description: '~$175 infra reserve',
    features: ['100 AI interactions/mo', '30 voice minutes/mo', '500 emails/mo', '5 GB storage', '1 Calendly connection', 'Basic analytics'],
    minSeats: 1,
    maxSeats: 10,
  },
  {
    id: 'professional',
    name: 'Professional',
    icon: <Star size={18} />,
    color: 'from-violet-500 to-purple-500',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/10',
    pricePerSeat: 9999,
    currency: '₹',
    period: '/seat/mo',
    description: '~$350 infra reserve',
    features: ['500 AI interactions/mo', '300 voice minutes/mo', '5,000 emails/mo', '25 GB storage', 'Multiple integrations', 'Advanced analytics', 'Priority support'],
    minSeats: 1,
    maxSeats: 50,
    recommended: true,
  },
  {
    id: 'business',
    name: 'Business',
    icon: <Crown size={18} />,
    color: 'from-amber-500 to-orange-500',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    pricePerSeat: 19999,
    currency: '₹',
    period: '/seat/mo',
    description: '~$600 infra reserve',
    features: ['2,000+ AI interactions/mo', '1,000+ voice minutes/mo', '25,000+ emails/mo', '100 GB storage', 'All integrations', 'Custom analytics', 'Dedicated support', 'SLA guarantee'],
    minSeats: 1,
    maxSeats: 500,
  },
];

// ─── Step Components ──────────────────────────────────────────────────────────

function StepOrgDetails({ data, onChange }: { data: OrgDetails; onChange: (d: OrgDetails) => void }) {
  const set = (key: keyof OrgDetails, val: string) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-700 text-white mb-1">Organization Details</h2>
        <p className="text-sm text-white/40">Tell us about your institution so we can personalize your experience.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Institution Name *</label>
          <div className="relative">
            <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={data.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Triveda University"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Institution Type *</label>
          <select
            value={data.type}
            onChange={e => set('type', e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-all appearance-none"
          >
            <option value="" className="bg-[#0A0F1E]">Select type…</option>
            {ORG_TYPES.map(t => <option key={t} value={t} className="bg-[#0A0F1E]">{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Organization Size</label>
          <select
            value={data.size}
            onChange={e => set('size', e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-all appearance-none"
          >
            <option value="" className="bg-[#0A0F1E]">Select size…</option>
            {ORG_SIZES.map(s => <option key={s} value={s} className="bg-[#0A0F1E]">{s} employees</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Website</label>
          <div className="relative">
            <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="url"
              value={data.website}
              onChange={e => set('website', e.target.value)}
              placeholder="https://yourorg.com"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Phone Number</label>
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="tel"
              value={data.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Address</label>
          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-3 text-white/30" />
            <textarea
              value={data.address}
              onChange={e => set('address', e.target.value)}
              placeholder="Street address, building, floor…"
              rows={2}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all resize-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">City</label>
          <input
            type="text"
            value={data.city}
            onChange={e => set('city', e.target.value)}
            placeholder="Mumbai"
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Country</label>
          <select
            value={data.country}
            onChange={e => set('country', e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-all appearance-none"
          >
            <option value="" className="bg-[#0A0F1E]">Select country…</option>
            {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#0A0F1E]">{c}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function StepAdminAccount({ data, onChange }: { data: AdminAccount; onChange: (d: AdminAccount) => void }) {
  const set = (key: keyof AdminAccount, val: string) => onChange({ ...data, [key]: val });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-700 text-white mb-1">Admin Contact</h2>
        <p className="text-sm text-white/40">
          Store the primary admin contact for this institution. Invite them from Users/RBAC after creation — this step does not create a login account.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Full Name *</label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={data.fullName}
              onChange={e => set('fullName', e.target.value)}
              placeholder="Dr. Priya Sharma"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Work Email *</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="email"
              value={data.email}
              onChange={e => set('email', e.target.value)}
              placeholder="admin@yourorg.com"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Job Title</label>
          <div className="relative">
            <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={data.jobTitle}
              onChange={e => set('jobTitle', e.target.value)}
              placeholder="Head of Placements"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Department</label>
          <div className="relative">
            <GraduationCap size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={data.department}
              onChange={e => set('department', e.target.value)}
              placeholder="Training & Placement Cell"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
            />
          </div>
        </div>
      </div>
      <div className="flex items-start gap-3 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
        <Shield size={15} className="text-teal-400 shrink-0 mt-0.5" />
        <p className="text-xs text-white/50">
          After the institution is created, invite this admin from Users/RBAC so they can set their own password and access the workspace.
        </p>
      </div>
    </div>
  );
}

function StepPlanSelection({ data, onChange }: { data: SelectedPlan; onChange: (d: SelectedPlan) => void }) {
  const selectedPlan = PLANS.find(p => p.id === data.planId);
  const total = selectedPlan ? selectedPlan.pricePerSeat * data.seats : 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-700 text-white mb-1">Plan & Seat Selection</h2>
        <p className="text-sm text-white/40">Choose the plan that fits your institution's scale and usage requirements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(plan => {
          const isSelected = data.planId === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onChange({ ...data, planId: plan.id, seats: Math.max(data.seats, plan.minSeats) })}
              className={`relative text-left p-4 rounded-2xl border transition-all duration-200 ${
                isSelected
                  ? `${plan.border} ${plan.bg} ring-1 ring-inset ${plan.border}`
                  : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-700 bg-gradient-to-r from-violet-500 to-purple-500 text-white px-3 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
                  Most Popular
                </span>
              )}
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white mb-3`}>
                {plan.icon}
              </div>
              <p className="text-sm font-700 text-white mb-0.5">{plan.name}</p>
              <p className="text-[11px] text-white/30 mb-3">{plan.description}</p>
              <p className="text-lg font-700 text-white">
                {plan.currency}{plan.pricePerSeat.toLocaleString()}
                <span className="text-xs font-400 text-white/40">{plan.period}</span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-[11px] text-white/50">
                    <Check size={11} className="text-teal-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                  <Check size={11} className="text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedPlan && (
        <div className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-600 text-white">Number of Seats</p>
              <p className="text-xs text-white/40">Min {selectedPlan.minSeats} · Max {selectedPlan.maxSeats} seats</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange({ ...data, seats: Math.max(selectedPlan.minSeats, data.seats - 1) })}
                className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center text-lg font-300"
              >
                −
              </button>
              <span className="text-xl font-700 text-white w-10 text-center">{data.seats}</span>
              <button
                type="button"
                onClick={() => onChange({ ...data, seats: Math.min(selectedPlan.maxSeats, data.seats + 1) })}
                className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center text-lg font-300"
              >
                +
              </button>
            </div>
          </div>
          <div className="h-px bg-white/[0.06]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">Monthly Total</p>
              <p className="text-2xl font-700 text-white">
                ₹{total.toLocaleString()}
                <span className="text-sm font-400 text-white/40">/mo</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Annual (save 20%)</p>
              <p className="text-sm font-600 text-teal-400">₹{Math.round(total * 12 * 0.8).toLocaleString()}/yr</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepBillingInfo({ data, onChange }: { data: BillingInfo; onChange: (d: BillingInfo) => void }) {
  const set = (key: keyof BillingInfo, val: string) => onChange({ ...data, [key]: val });

  const formatCard = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-700 text-white mb-1">Billing Information</h2>
        <p className="text-sm text-white/40">Your payment details are encrypted and stored securely. We never store raw card data.</p>
      </div>

      <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center gap-3">
        <Shield size={15} className="text-teal-400 shrink-0" />
        <p className="text-xs text-white/50">256-bit SSL encryption · PCI DSS compliant · Powered by Razorpay</p>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-700 text-white/40 uppercase tracking-wider">Card Details</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Name on Card *</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={data.cardName}
                onChange={e => set('cardName', e.target.value)}
                placeholder="As it appears on your card"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Card Number *</label>
            <div className="relative">
              <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={data.cardNumber}
                onChange={e => set('cardNumber', formatCard(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all font-mono tracking-widest"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Expiry Date *</label>
            <input
              type="text"
              value={data.expiry}
              onChange={e => set('expiry', formatExpiry(e.target.value))}
              placeholder="MM/YY"
              maxLength={5}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">CVV *</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="password"
                value={data.cvv}
                onChange={e => set('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="•••"
                maxLength={4}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-700 text-white/40 uppercase tracking-wider">Billing Address</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Address</label>
            <input
              type="text"
              value={data.billingAddress}
              onChange={e => set('billingAddress', e.target.value)}
              placeholder="Street address"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">City</label>
            <input
              type="text"
              value={data.billingCity}
              onChange={e => set('billingCity', e.target.value)}
              placeholder="Mumbai"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">Country</label>
            <select
              value={data.billingCountry}
              onChange={e => set('billingCountry', e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-all appearance-none"
            >
              <option value="" className="bg-[#0A0F1E]">Select country…</option>
              {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#0A0F1E]">{c}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-600 text-white/50 mb-1.5 uppercase tracking-wide">GST / Tax ID (optional)</label>
            <input
              type="text"
              value={data.taxId}
              onChange={e => set('taxId', e.target.value)}
              placeholder="22AAAAA0000A1Z5"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepTeamInvites({ data, onChange }: { data: TeamMember[]; onChange: (d: TeamMember[]) => void }) {
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Recruiter');
  const [error, setError] = useState('');

  const addMember = () => {
    if (!newEmail.trim()) { setError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { setError('Enter a valid email'); return; }
    if (data.find(m => m.email === newEmail.trim())) { setError('This email is already added'); return; }
    setError('');
    onChange([...data, { id: Date.now().toString(), email: newEmail.trim(), name: newName.trim(), role: newRole }]);
    setNewEmail('');
    setNewName('');
    setNewRole('Recruiter');
  };

  const remove = (id: string) => onChange(data.filter(m => m.id !== id));
  const updateRole = (id: string, role: string) => onChange(data.map(m => m.id === id ? { ...m, role } : m));

  const roleColors: Record<string, string> = {
    Admin: 'bg-rose-500/20 text-rose-400',
    Recruiter: 'bg-teal-500/20 text-teal-400',
    Instructor: 'bg-violet-500/20 text-violet-400',
    Viewer: 'bg-white/10 text-white/50',
    'HR Manager': 'bg-amber-500/20 text-amber-400',
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-700 text-white mb-1">Invite Team Members</h2>
        <p className="text-sm text-white/40">Add colleagues and assign roles. They'll receive an email invitation to join your workspace.</p>
      </div>

      {/* Add member form */}
      <div className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl space-y-3">
        <p className="text-xs font-700 text-white/40 uppercase tracking-wider">Add a Member</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-600 text-white/40 mb-1">Name (optional)</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-600 text-white/40 mb-1">Email *</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => { setNewEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && addMember()}
              placeholder="colleague@org.com"
              className={`w-full bg-white/[0.05] border rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none transition-all ${error ? 'border-red-500/50' : 'border-white/[0.08] focus:border-teal-500/50'}`}
            />
          </div>
          <div>
            <label className="block text-xs font-600 text-white/40 mb-1">Role</label>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-all appearance-none"
            >
              {TEAM_ROLES.map(r => <option key={r} value={r} className="bg-[#0A0F1E]">{r}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-[11px] text-red-400 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
        <button
          type="button"
          onClick={addMember}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-300 text-sm font-600 rounded-xl transition-all"
        >
          <UserPlus size={14} />
          Add Member
        </button>
      </div>

      {/* Member list */}
      {data.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-700 text-white/40 uppercase tracking-wider">{data.length} member{data.length !== 1 ? 's' : ''} to invite</p>
          {data.map(member => (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/30 to-cyan-500/20 flex items-center justify-center text-xs font-700 text-teal-300 shrink-0">
                {(member.name || member.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {member.name && <p className="text-sm font-600 text-white truncate">{member.name}</p>}
                <p className="text-xs text-white/40 truncate">{member.email}</p>
              </div>
              <select
                value={member.role}
                onChange={e => updateRole(member.id, e.target.value)}
                className={`text-[11px] font-600 px-2 py-1 rounded-lg border-0 focus:outline-none appearance-none cursor-pointer ${roleColors[member.role] || 'bg-white/10 text-white/50'}`}
              >
                {TEAM_ROLES.map(r => <option key={r} value={r} className="bg-[#0A0F1E] text-white">{r}</option>)}
              </select>
              <button
                type="button"
                onClick={() => remove(member.id)}
                className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
            <Users size={20} className="text-white/20" />
          </div>
          <p className="text-sm text-white/30">No team members added yet</p>
          <p className="text-xs text-white/20 mt-1">You can skip this step and invite members later from Settings.</p>
        </div>
      )}
    </div>
  );
}

// ─── Review Summary ───────────────────────────────────────────────────────────

function ReviewSummary({ state }: { state: WizardState }) {
  const plan = PLANS.find(p => p.id === state.plan.planId);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-700 text-white mb-1">Review & Confirm</h2>
        <p className="text-sm text-white/40">Everything looks good? Confirm to create your institution workspace.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={14} className="text-teal-400" />
            <p className="text-xs font-700 text-white/50 uppercase tracking-wider">Organization</p>
          </div>
          <p className="text-sm font-600 text-white">{state.org.name || '—'}</p>
          <p className="text-xs text-white/40">{state.org.type} · {state.org.size} employees</p>
          <p className="text-xs text-white/30">{state.org.city}{state.org.country ? `, ${state.org.country}` : ''}</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-violet-400" />
            <p className="text-xs font-700 text-white/50 uppercase tracking-wider">Admin Contact</p>
          </div>
          <p className="text-sm font-600 text-white">{state.admin.fullName || '—'}</p>
          <p className="text-xs text-white/40">{state.admin.email}</p>
          <p className="text-xs text-white/30">{state.admin.jobTitle}{state.admin.department ? ` · ${state.admin.department}` : ''}</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-amber-400" />
            <p className="text-xs font-700 text-white/50 uppercase tracking-wider">Plan</p>
          </div>
          {plan ? (
            <>
              <p className="text-sm font-600 text-white">{plan.name} · {state.plan.seats} seat{state.plan.seats !== 1 ? 's' : ''}</p>
              <p className="text-xs text-white/40">₹{(plan.pricePerSeat * state.plan.seats).toLocaleString()}/mo</p>
              <p className="text-xs text-white/30">{plan.description}</p>
            </>
          ) : <p className="text-xs text-white/30">No plan selected</p>}
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-cyan-400" />
            <p className="text-xs font-700 text-white/50 uppercase tracking-wider">Team Contacts</p>
          </div>
          {state.team.length > 0 ? (
            <>
              <p className="text-sm font-600 text-white">{state.team.length} member{state.team.length !== 1 ? 's' : ''} to invite</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {state.team.slice(0, 3).map(m => (
                  <span key={m.id} className="text-[10px] bg-white/[0.06] text-white/40 px-2 py-0.5 rounded-full truncate max-w-[120px]">{m.email}</span>
                ))}
                {state.team.length > 3 && <span className="text-[10px] text-white/30">+{state.team.length - 3} more</span>}
              </div>
            </>
          ) : <p className="text-xs text-white/30">No invites — can add later</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function InstitutionSetupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [state, setState] = useState<WizardState>({
    org: { name: '', type: '', website: '', phone: '', address: '', city: '', country: '', size: '' },
    admin: { fullName: '', email: '', password: '', confirmPassword: '', jobTitle: '', department: '' },
    plan: { planId: 'professional', seats: 5 },
    billing: { cardName: '', cardNumber: '', expiry: '', cvv: '', billingAddress: '', billingCity: '', billingCountry: '', taxId: '' },
    team: [],
  });

  const isReview = currentStep === STEPS.length;
  const totalSteps = STEPS.length + 1; // +1 for review

  const canProceed = (): boolean => {
    if (currentStep === 0) return !!state.org.name.trim() && !!state.org.type;
    if (currentStep === 1) {
      return !!state.admin.fullName.trim() && !!state.admin.email.trim();
    }
    if (currentStep === 2) return !!state.plan.planId && state.plan.seats >= 1;
    if (currentStep === 3) return !!state.billing.cardName.trim() && state.billing.cardNumber.replace(/\s/g, '').length === 16 && !!state.billing.expiry && !!state.billing.cvv;
    return true;
  };

  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const { csrfHeaders } = await import('@/lib/api/apiClient');
      const res = await fetch('/api/institution-setup', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          org: state.org,
          admin: { fullName: state.admin.fullName, email: state.admin.email, jobTitle: state.admin.jobTitle, department: state.admin.department },
          plan: state.plan,
          team: state.team,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create institution');
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to create institution');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#060B18] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mx-auto shadow-2xl shadow-teal-500/30">
            <CheckCircle2 size={36} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-700 text-white mb-2">Institution Created</h1>
            <p className="text-white/40 text-sm">
              <span className="text-white font-600">{state.org.name}</span> has been registered
              {state.admin.email ? <> with admin contact <span className="text-white/70">{state.admin.email}</span></> : null}.
              {' '}Invite the admin from Users/RBAC to grant access.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white/[0.04] border border-white/[0.06] rounded-xl text-center">
              <p className="text-lg font-700 text-teal-400">{state.plan.seats}</p>
              <p className="text-xs text-white/40">Seats Requested</p>
            </div>
            <div className="p-3 bg-white/[0.04] border border-white/[0.06] rounded-xl text-center">
              <p className="text-lg font-700 text-violet-400">{state.team.length}</p>
              <p className="text-xs text-white/40">Team Contacts Noted</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="/rbac"
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-700 rounded-xl hover:opacity-90 transition-opacity text-center block"
            >
              Invite Admin from Users/RBAC
            </a>
            <a
              href="/institution-admin"
              className="w-full py-2.5 bg-white/[0.05] border border-white/[0.08] text-white/60 text-sm font-600 rounded-xl hover:bg-white/[0.08] transition-all text-center block"
            >
              Go to Institution Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B18] flex flex-col">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0A0F1E]/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-700 text-white">Institution Setup</p>
            <p className="text-[11px] text-white/30">Triveda AI Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">Step {Math.min(currentStep + 1, totalSteps)} of {totalSteps}</span>
          <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Step sidebar */}
        <div className="hidden md:flex flex-col w-[200px] shrink-0 border-r border-white/[0.06] bg-[#0A0F1E]/50 p-4 gap-1">
          {STEPS.map((step, idx) => {
            const done = idx < currentStep;
            const active = idx === currentStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => idx < currentStep && setCurrentStep(idx)}
                disabled={idx > currentStep}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                  active ? 'bg-teal-500/15 text-teal-300' :
                  done ? 'text-white/50 hover:text-white/70 hover:bg-white/[0.04] cursor-pointer': 'text-white/20 cursor-not-allowed'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-700 transition-all ${
                  done ? 'bg-teal-500/20 text-teal-400' : active ?'bg-teal-500 text-white shadow-lg shadow-teal-500/30': 'bg-white/[0.06] text-white/20'
                }`}>
                  {done ? <Check size={11} /> : idx + 1}
                </div>
                <span className="text-[12px] font-500">{step.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            disabled={currentStep < STEPS.length}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
              isReview ? 'bg-teal-500/15 text-teal-300' : 'text-white/20 cursor-not-allowed'
            }`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-700 ${
              isReview ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'bg-white/[0.06] text-white/20'
            }`}>
              {STEPS.length + 1}
            </div>
            <span className="text-[12px] font-500">Review</span>
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">
            {/* Mobile step indicator */}
            <div className="flex md:hidden gap-1 mb-6">
              {STEPS.map((_, idx) => (
                <div key={idx} className={`h-1 flex-1 rounded-full transition-all ${idx <= currentStep ? 'bg-teal-500' : 'bg-white/[0.08]'}`} />
              ))}
              <div className={`h-1 flex-1 rounded-full transition-all ${isReview ? 'bg-teal-500' : 'bg-white/[0.08]'}`} />
            </div>

            {/* Step content */}
            <div className="mb-8">
              {currentStep === 0 && <StepOrgDetails data={state.org} onChange={org => setState(s => ({ ...s, org }))} />}
              {currentStep === 1 && <StepAdminAccount data={state.admin} onChange={admin => setState(s => ({ ...s, admin }))} />}
              {currentStep === 2 && <StepPlanSelection data={state.plan} onChange={plan => setState(s => ({ ...s, plan }))} />}
              {currentStep === 3 && <StepBillingInfo data={state.billing} onChange={billing => setState(s => ({ ...s, billing }))} />}
              {currentStep === 4 && <StepTeamInvites data={state.team} onChange={team => setState(s => ({ ...s, team }))} />}
              {isReview && <ReviewSummary state={state} />}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-600 text-white/50 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
                Back
              </button>

              {!isReview ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(s => s + 1)}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-700 rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/20"
                >
                  {currentStep === STEPS.length - 1 ? 'Review Setup' : 'Continue'}
                  <ChevronRight size={16} />
                </button>
              ) : (
                <div className="flex flex-col items-end gap-2">
                  {submitError && <p className="text-xs text-red-400">{submitError}</p>}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-700 rounded-xl hover:opacity-90 disabled:opacity-70 transition-all shadow-lg shadow-teal-500/20"
                  >
                    {submitting ? (
                      <><Loader2 size={15} className="animate-spin" /> Creating Workspace…</>
                    ) : (
                      <><CheckCircle2 size={15} /> Confirm & Launch</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
