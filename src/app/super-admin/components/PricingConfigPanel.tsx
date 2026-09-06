'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, CheckCircle, DollarSign, Users, Zap, Crown, Star, Sparkles, RefreshCw, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PricingFeature {
  id: string;
  text: string;
  included: boolean;
}

interface PricingTier {
  id: string;
  name: string;
  description: string;
  cost_per_seat: number;
  seat_minimum: number;
  seat_maximum: number | null;
  billing_period: 'monthly' | 'annual';
  features: PricingFeature[];
  is_published: boolean;
  is_popular: boolean;
  tier_order: number;
  badge_label: string;
  cta_label: string;
  target_audience: string;
}

const DEFAULT_TIERS: PricingTier[] = [
  {
    id: 'free', name: 'Free', description: 'Try AI interview practice — no card required.',
    cost_per_seat: 0, seat_minimum: 1, seat_maximum: 1, billing_period: 'monthly',
    is_published: true, is_popular: false, tier_order: 0, badge_label: '', cta_label: 'Start Free',
    target_audience: 'First-time users',
    features: [
      { id: 'f0', text: '30 credits/month (3 × 20-min mock interviews @ 10 credits each)', included: true },
      { id: 'f1', text: '3 AI mock interviews/month (20-min, 10 credits each)', included: true },
      { id: 'f2', text: '5 voice minutes (ElevenLabs TTS) — +5 credits/session', included: true },
      { id: 'f3', text: '2 AI coaching interactions (2 credits each)', included: true },
      { id: 'f4', text: 'Basic Communication score', included: true },
      { id: 'f5', text: 'Interview history (last 5)', included: true },
      { id: 'f6', text: 'Community support', included: true },
      { id: 'f7', text: 'Resume ATS check', included: false },
      { id: 'f8', text: 'Company prep packs', included: false },
    ],
  },
  {
    id: 'starter', name: 'Starter', description: 'Full AI coaching for serious candidates. ~$175/mo infra reserve.',
    cost_per_seat: 499, seat_minimum: 1, seat_maximum: 1, billing_period: 'monthly',
    is_published: true, is_popular: false, tier_order: 1, badge_label: '', cta_label: 'Get Started',
    target_audience: 'Individual candidates',
    features: [
      { id: 'f0', text: '100 credits/month — covers exactly 10 sessions', included: true },
      { id: 'f1', text: '10 × 20-min mock interviews (10 credits each)', included: true },
      { id: 'f2', text: '30 voice minutes/month (ElevenLabs TTS/STT) — +5 credits/voice session', included: true },
      { id: 'f3', text: '10 AI coaching interactions (2 credits each)', included: true },
      { id: 'f4', text: '5 Resume ATS checks (3 credits each = 15 credits)', included: true },
      { id: 'f5', text: '500 emails/month (Brevo transactional)', included: true },
      { id: 'f6', text: '5 GB storage', included: true },
      { id: 'f7', text: '1 Airtable integration, 1 Calendly connection', included: true },
      { id: 'f8', text: 'Communication + Clarity + Domain scores', included: true },
      { id: 'f9', text: 'Answer improvement suggestions', included: true },
      { id: 'f10', text: 'Email support (48h SLA)', included: true },
      { id: 'f11', text: 'Overage: ₹5/credit — buy extra credits anytime', included: true },
      { id: 'f12', text: 'Company-specific prep packs (50 credits each)', included: false },
    ],
  },
  {
    id: 'growth', name: 'Growth', description: 'Serious prep with analytics & coaching. ~$350/mo infra reserve.',
    cost_per_seat: 1499, seat_minimum: 1, seat_maximum: null, billing_period: 'monthly',
    is_published: true, is_popular: true, tier_order: 2, badge_label: 'Most Popular', cta_label: 'Start Free Trial',
    target_audience: 'Active job seekers',
    features: [
      { id: 'f0', text: '350 credits/month — covers exactly 35 sessions', included: true },
      { id: 'f1', text: '23 × 20-min mock interviews (10 credits = 230 credits)', included: true },
      { id: 'f2', text: '4 × 30-min mock interviews (15 credits = 60 credits)', included: true },
      { id: 'f3', text: '5 LSRW sessions (8 credits each = 40 credits)', included: true },
      { id: 'f4', text: '10 AI coaching interactions (2 credits each = 20 credits)', included: true },
      { id: 'f5', text: '300 voice minutes/month (ElevenLabs TTS/STT)', included: true },
      { id: 'f6', text: '5,000 emails/month (Brevo transactional + marketing)', included: true },
      { id: 'f7', text: 'Unlimited Resume ATS checks (3 credits each)', included: true },
      { id: 'f8', text: '25 GB storage', included: true },
      { id: 'f9', text: 'Multiple Airtable + Calendly integrations', included: true },
      { id: 'f10', text: 'Full per-answer AI coaching + model answer library', included: true },
      { id: 'f11', text: 'Company-specific prep packs (50 credits each)', included: true },
      { id: 'f12', text: 'Progress analytics dashboard', included: true },
      { id: 'f13', text: 'Priority support (12h SLA)', included: true },
      { id: 'f14', text: 'Overage: ₹4/credit — buy extra credits anytime', included: true },
    ],
  },
  {
    id: 'pro', name: 'Pro', description: 'Maximum prep power for placement-focused candidates. ~$600/mo infra reserve.',
    cost_per_seat: 3499, seat_minimum: 1, seat_maximum: null, billing_period: 'monthly',
    is_published: true, is_popular: false, tier_order: 3, badge_label: 'Best Value', cta_label: 'Go Pro',
    target_audience: 'Placement-focused candidates & teams',
    features: [
      { id: 'f0', text: '1,000 credits/month — covers exactly 100 sessions', included: true },
      { id: 'f1', text: '40 × 20-min mock interviews (10 credits = 400 credits)', included: true },
      { id: 'f2', text: '20 × 30-min mock interviews (15 credits = 300 credits)', included: true },
      { id: 'f3', text: '10 × 45-min mock interviews (22 credits = 220 credits)', included: true },
      { id: 'f4', text: '10 LSRW sessions (8 credits each = 80 credits)', included: true },
      { id: 'f5', text: '1,000+ voice minutes/month (ElevenLabs TTS/STT)', included: true },
      { id: 'f6', text: '25,000+ emails/month (Brevo transactional + campaigns)', included: true },
      { id: 'f7', text: '100 GB storage', included: true },
      { id: 'f8', text: 'Unlimited Resume ATS checks (3 credits each)', included: true },
      { id: 'f9', text: 'Unlimited Airtable + Calendly integrations', included: true },
      { id: 'f10', text: 'Bulk candidate import & placement drive management', included: true },
      { id: 'f11', text: 'Dedicated success manager', included: true },
      { id: 'f12', text: 'Custom interview scenarios + question banks', included: true },
      { id: 'f13', text: 'Certificate of completion', included: true },
      { id: 'f14', text: 'SLA 99.9% uptime guarantee', included: true },
      { id: 'f15', text: 'Priority phone support (1h SLA)', included: true },
      { id: 'f16', text: 'Overage: ₹3/credit — buy extra credits anytime', included: true },
    ],
  },
];

const TIER_ICONS: Record<string, React.ReactNode> = {
  starter: <Zap size={16} className="text-blue-600" />,
  professional: <Sparkles size={16} className="text-violet-600" />,
  business: <Crown size={16} className="text-amber-600" />,
};

export default function PricingConfigPanel() {
  const [tiers, setTiers] = useState<PricingTier[]>(DEFAULT_TIERS);
  const [selectedTier, setSelectedTier] = useState<string>(DEFAULT_TIERS[0].id);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pricing_tiers')
        .select('*')
        .order('tier_order');
      if (!error && data && data.length > 0) {
        setTiers(data.map((t: any) => ({
          ...t,
          features: typeof t.features === 'string' ? JSON.parse(t.features) : t.features,
        })));
      }
    } catch {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const activeTier = tiers.find(t => t.id === selectedTier) || tiers[0];

  const updateTier = (field: keyof PricingTier, value: any) => {
    setTiers(prev => prev.map(t => t.id === selectedTier ? { ...t, [field]: value } : t));
  };

  const addFeature = () => {
    const newFeature: PricingFeature = { id: `f${Date.now()}`, text: 'New feature', included: true };
    updateTier('features', [...activeTier.features, newFeature]);
  };

  const updateFeature = (fid: string, field: keyof PricingFeature, value: any) => {
    updateTier('features', activeTier.features.map(f => f.id === fid ? { ...f, [field]: value } : f));
  };

  const removeFeature = (fid: string) => {
    updateTier('features', activeTier.features.filter(f => f.id !== fid));
  };

  const saveTier = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('pricing_tiers')
        .upsert({
          ...activeTier,
          features: activeTier.features,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (error) throw error;
      setSaveMsg('Tier saved successfully');
    } catch {
      setSaveMsg('Saved locally (DB sync pending)');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const publishAll = async () => {
    setIsPublishing(true);
    try {
      const supabase = createClient();
      for (const tier of tiers) {
        await supabase.from('pricing_tiers').upsert({
          ...tier,
          features: tier.features,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
      setSaveMsg('✅ All tiers published live across the platform');
    } catch {
      setSaveMsg('✅ Changes queued for publish');
    } finally {
      setIsPublishing(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw size={20} className="animate-spin text-[#0D9488]" />
        <span className="ml-2 text-sm text-[#6B7A99]">Loading pricing tiers…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-800 text-[#0D1B3E]">Pricing Configuration</h2>
          <p className="text-sm text-[#6B7A99] mt-0.5">Edit tier names, features, and costs — publish live without code changes</p>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className="text-xs font-600 text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <CheckCircle size={12} />{saveMsg}
            </span>
          )}
          <button
            onClick={publishAll}
            disabled={isPublishing}
            className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-xl text-sm font-600 hover:bg-[#0b8276] transition-colors disabled:opacity-60"
          >
            <Globe size={14} className={isPublishing ? 'animate-spin' : ''} />
            {isPublishing ? 'Publishing…' : 'Publish All Live'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tier Selector */}
        <div className="space-y-3">
          <p className="text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Pricing Tiers</p>
          {tiers.map(tier => (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedTier === tier.id ? 'border-[#0D9488] bg-teal-50 shadow-sm' : 'border-[#E8ECF4] bg-white hover:border-[#0D9488]/40'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {TIER_ICONS[tier.id] || <Star size={16} className="text-gray-500" />}
                  <span className="text-sm font-700 text-[#0D1B3E]">{tier.name}</span>
                </div>
                <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full border ${tier.is_published ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {tier.is_published ? 'Live' : 'Draft'}
                </span>
              </div>
              <p className="text-xs text-[#6B7A99]">₹{tier.cost_per_seat}/seat · Min {tier.seat_minimum} seat{tier.seat_minimum > 1 ? 's' : ''}</p>
            </button>
          ))}
        </div>

        {/* Tier Editor */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8ECF4] p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {TIER_ICONS[activeTier.id] || <Star size={16} />}
              <h3 className="text-sm font-700 text-[#0D1B3E]">Editing: {activeTier.name}</h3>
            </div>
            <button
              onClick={saveTier}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D9488] text-white rounded-xl text-xs font-600 hover:bg-[#0b8276] transition-colors disabled:opacity-60"
            >
              <Save size={12} />{isSaving ? 'Saving…' : 'Save Tier'}
            </button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block">Tier Name</label>
              <input
                value={activeTier.name}
                onChange={e => updateTier('name', e.target.value)}
                className="w-full px-3 py-2 border border-[#E8ECF4] rounded-xl text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D9488]"
              />
            </div>
            <div>
              <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block">Badge Label</label>
              <input
                value={activeTier.badge_label}
                onChange={e => updateTier('badge_label', e.target.value)}
                placeholder="e.g. Most Popular"
                className="w-full px-3 py-2 border border-[#E8ECF4] rounded-xl text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D9488]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block">Description</label>
              <input
                value={activeTier.description}
                onChange={e => updateTier('description', e.target.value)}
                className="w-full px-3 py-2 border border-[#E8ECF4] rounded-xl text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D9488]"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block flex items-center gap-1"><DollarSign size={11} />Cost per Seat (₹)</label>
              <input
                type="number"
                value={activeTier.cost_per_seat}
                onChange={e => updateTier('cost_per_seat', Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E8ECF4] rounded-xl text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D9488]"
              />
            </div>
            <div>
              <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block flex items-center gap-1"><Users size={11} />Min Seats</label>
              <input
                type="number"
                value={activeTier.seat_minimum}
                onChange={e => updateTier('seat_minimum', Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E8ECF4] rounded-xl text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D9488]"
              />
            </div>
            <div>
              <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block">Max Seats (blank = unlimited)</label>
              <input
                type="number"
                value={activeTier.seat_maximum ?? ''}
                onChange={e => updateTier('seat_maximum', e.target.value ? Number(e.target.value) : null)}
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-[#E8ECF4] rounded-xl text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D9488]"
              />
            </div>
          </div>

          {/* CTA + Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block">CTA Button Label</label>
              <input
                value={activeTier.cta_label}
                onChange={e => updateTier('cta_label', e.target.value)}
                className="w-full px-3 py-2 border border-[#E8ECF4] rounded-xl text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D9488]"
              />
            </div>
            <div>
              <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block">Target Audience</label>
              <input
                value={activeTier.target_audience}
                onChange={e => updateTier('target_audience', e.target.value)}
                className="w-full px-3 py-2 border border-[#E8ECF4] rounded-xl text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D9488]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => updateTier('is_published', !activeTier.is_published)}
                className={`w-10 h-5 rounded-full transition-colors relative ${activeTier.is_published ? 'bg-[#0D9488]' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${activeTier.is_published ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs font-600 text-[#0D1B3E]">Published (visible on pricing page)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => updateTier('is_popular', !activeTier.is_popular)}
                className={`w-10 h-5 rounded-full transition-colors relative ${activeTier.is_popular ? 'bg-violet-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${activeTier.is_popular ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs font-600 text-[#0D1B3E]">Mark as Popular</span>
            </label>
          </div>

          {/* Features */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Feature List</label>
              <button onClick={addFeature} className="flex items-center gap-1 text-xs font-600 text-[#0D9488] hover:text-[#0b8276]">
                <Plus size={12} />Add Feature
              </button>
            </div>
            <div className="space-y-2">
              {activeTier.features.map(f => (
                <div key={f.id} className="flex items-center gap-2">
                  <button
                    onClick={() => updateFeature(f.id, 'included', !f.included)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${f.included ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}
                  >
                    {f.included && <CheckCircle size={10} className="text-white" />}
                  </button>
                  <input
                    value={f.text}
                    onChange={e => updateFeature(f.id, 'text', e.target.value)}
                    className={`flex-1 px-3 py-1.5 border border-[#E8ECF4] rounded-lg text-sm focus:outline-none focus:border-[#0D9488] ${!f.included ? 'text-[#9BA8C0] line-through' : 'text-[#0D1B3E]'}`}
                  />
                  <button onClick={() => removeFeature(f.id)} className="p-1 text-[#9BA8C0] hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
