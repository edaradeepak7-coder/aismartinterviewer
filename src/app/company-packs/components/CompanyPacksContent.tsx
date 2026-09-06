'use client';
import React, { useState } from 'react';
import { Package, Star, Zap, Lock, CheckCircle, BookOpen, Mic, Brain, Search, ShoppingCart, Users, Clock } from 'lucide-react';
import { useCreditBalance } from '@/lib/hooks/useCreditBalance';

// ─── Types ────────────────────────────────────────────────────────────────────
type PackType = 'course' | 'assessment' | 'interview';
type Tier = 'standard' | 'premium' | 'enterprise';

interface CompanyPack {
  id: string;
  company: string;
  logo: string;
  type: PackType;
  title: string;
  description: string;
  tier: Tier;
  credits: number;
  rating: number;
  reviews: number;
  enrolled: number;
  duration: string;
  topics: string[];
  features: string[];
  badge?: string;
  isNew?: boolean;
  isBestseller?: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const COMPANY_PACKS: CompanyPack[] = [
  {
    id: 'cp1', company: 'Google', logo: 'G', type: 'interview',
    title: 'Google SWE Interview Pack', description: 'Comprehensive preparation for Google Software Engineer interviews with real question patterns, STAR method coaching, and system design frameworks used at Google.',
    tier: 'premium', credits: 150, rating: 4.9, reviews: 2847, enrolled: 18420, duration: '40 hours',
    topics: ['Data Structures', 'Algorithms', 'System Design', 'Behavioral (Googleyness)'],
    features: ['200+ curated questions', 'Mock interviews with AI', 'Detailed answer frameworks', 'Insider tips from ex-Googlers'],
    badge: 'Most Popular', isBestseller: true,
  },
  {
    id: 'cp2', company: 'Amazon', logo: 'A', type: 'interview',
    title: 'Amazon Leadership Principles Pack', description: 'Master Amazon\'s 16 Leadership Principles with structured STAR stories, behavioral interview prep, and technical rounds for SDE roles.',
    tier: 'premium', credits: 120, rating: 4.8, reviews: 3124, enrolled: 22100, duration: '35 hours',
    topics: ['Leadership Principles', 'System Design', 'Coding Rounds', 'Bar Raiser Prep'],
    features: ['LP-aligned question bank', 'STAR story builder', 'Bar Raiser simulation', 'Compensation negotiation guide'],
    badge: 'Top Rated', isBestseller: true,
  },
  {
    id: 'cp3', company: 'Microsoft', logo: 'M', type: 'course',
    title: 'Microsoft Azure & Cloud Fundamentals', description: 'Official-style preparation for Microsoft technical roles covering Azure architecture, .NET ecosystem, and Microsoft\'s engineering culture.',
    tier: 'standard', credits: 80, rating: 4.7, reviews: 1892, enrolled: 14300, duration: '28 hours',
    topics: ['Azure Architecture', '.NET Development', 'DevOps Practices', 'Microsoft Culture'],
    features: ['Azure certification prep', 'Hands-on labs', 'Interview question bank', 'Culture fit assessment'],
    isNew: false,
  },
  {
    id: 'cp4', company: 'Infosys', logo: 'I', type: 'assessment',
    title: 'Infosys InfyTQ Assessment Pack', description: 'Complete preparation for Infosys recruitment assessments including InfyTQ certification, aptitude tests, and technical screening rounds.',
    tier: 'standard', credits: 60, rating: 4.6, reviews: 4521, enrolled: 31200, duration: '20 hours',
    topics: ['Aptitude & Reasoning', 'Verbal Ability', 'Coding Fundamentals', 'InfyTQ Certification'],
    features: ['5 full mock tests', 'Sectional practice', 'Previous year papers', 'Score predictor'],
    badge: 'High Demand',
  },
  {
    id: 'cp5', company: 'TCS', logo: 'T', type: 'assessment',
    title: 'TCS NQT Complete Prep Pack', description: 'End-to-end preparation for TCS National Qualifier Test covering all sections with adaptive practice and performance analytics.',
    tier: 'standard', credits: 50, rating: 4.5, reviews: 5832, enrolled: 42800, duration: '18 hours',
    topics: ['Numerical Ability', 'Verbal Reasoning', 'Programming Logic', 'Advanced Coding'],
    features: ['10 full mock NQTs', 'Topic-wise practice', 'Weak area identification', 'Rank predictor'],
    isBestseller: true,
  },
  {
    id: 'cp6', company: 'Flipkart', logo: 'F', type: 'interview',
    title: 'Flipkart Product & Engineering Pack', description: 'Specialized preparation for Flipkart\'s unique interview process covering product thinking, scalability challenges, and e-commerce domain knowledge.',
    tier: 'premium', credits: 100, rating: 4.7, reviews: 987, enrolled: 7640, duration: '30 hours',
    topics: ['Product Thinking', 'Scalability Design', 'E-commerce Domain', 'Behavioral Rounds'],
    features: ['Flipkart-specific case studies', 'Product design exercises', 'System design for scale', 'Culture fit prep'],
    isNew: true,
  },
  {
    id: 'cp7', company: 'Wipro', logo: 'W', type: 'assessment',
    title: 'Wipro NLTH Assessment Pack', description: 'Comprehensive preparation for Wipro\'s National Level Talent Hunt covering aptitude, coding, and communication rounds.',
    tier: 'standard', credits: 45, rating: 4.4, reviews: 3241, enrolled: 28900, duration: '15 hours',
    topics: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal English', 'Coding Challenges'],
    features: ['8 full mock tests', 'Video explanations', 'Performance dashboard', 'Improvement roadmap'],
  },
  {
    id: 'cp8', company: 'Deloitte', logo: 'D', type: 'course',
    title: 'Deloitte Consulting Mastery Pack', description: 'Prepare for Deloitte\'s consulting roles with case interview frameworks, business analysis skills, and professional communication training.',
    tier: 'enterprise', credits: 200, rating: 4.9, reviews: 642, enrolled: 4200, duration: '50 hours',
    topics: ['Case Interviews', 'Business Analysis', 'Consulting Frameworks', 'Client Communication'],
    features: ['Case library (100+ cases)', 'Expert mentor sessions', 'Presentation skills', 'Offer negotiation'],
    badge: 'Premium', isNew: true,
  },
];

const TIER_COLORS: Record<Tier, { bg: string; text: string; border: string; label: string }> = {
  standard: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600', border: 'border-blue-200', label: 'Standard' },
  premium: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600', border: 'border-violet-200', label: 'Premium' },
  enterprise: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600', border: 'border-amber-200', label: 'Enterprise' },
};

const TYPE_ICONS: Record<PackType, React.ReactNode> = {
  course: <BookOpen size={14} />,
  assessment: <Brain size={14} />,
  interview: <Mic size={14} />,
};

const TYPE_COLORS: Record<PackType, string> = {
  course: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20',
  assessment: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20',
  interview: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20',
};

const COMPANY_COLORS: Record<string, string> = {
  G: 'from-blue-500 to-green-500',
  A: 'from-amber-500 to-orange-600',
  M: 'from-blue-600 to-cyan-500',
  I: 'from-indigo-500 to-blue-600',
  T: 'from-blue-700 to-indigo-600',
  F: 'from-yellow-500 to-amber-600',
  W: 'from-violet-500 to-purple-600',
  D: 'from-green-600 to-teal-600',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CompanyPacksContent() {
  const { balance } = useCreditBalance();
  const [activeType, setActiveType] = useState<'all' | PackType>('all');
  const [activeTier, setActiveTier] = useState<'all' | Tier>('all');
  const [search, setSearch] = useState('');
  const [selectedPack, setSelectedPack] = useState<CompanyPack | null>(null);
  const [purchasedPacks, setPurchasedPacks] = useState<Set<string>>(new Set());
  const [confirmPurchase, setConfirmPurchase] = useState<CompanyPack | null>(null);

  const filtered = COMPANY_PACKS.filter(p => {
    const matchType = activeType === 'all' || p.type === activeType;
    const matchTier = activeTier === 'all' || p.tier === activeTier;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.company.toLowerCase().includes(search.toLowerCase()) ||
      p.topics.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchTier && matchSearch;
  });

  const handlePurchase = (pack: CompanyPack) => {
    if (balance.remaining >= pack.credits) {
      setPurchasedPacks(prev => new Set([...prev, pack.id]));
      setConfirmPurchase(null);
      setSelectedPack(null);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Package size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E] dark:text-white">Company Packs</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Premium course, assessment & interview packs — purchase with credits</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5">
          <Zap size={14} className="text-amber-500" />
          <span className="text-sm font-700 text-amber-700 dark:text-amber-400">{balance.remaining.toLocaleString()}</span>
          <span className="text-xs text-amber-600 dark:text-amber-500">credits available</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 stagger-children">
        {[
          { label: 'Company Packs', value: COMPANY_PACKS.length, icon: <Package size={16} />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Purchased', value: purchasedPacks.size, icon: <CheckCircle size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Avg Rating', value: '4.7★', icon: <Star size={16} />, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-4 card-hover fade-in-up">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <span className={s.color}>{s.icon}</span>
            </div>
            <p className="text-xl font-800 text-[#0D1B3E] dark:text-white">{s.value}</p>
            <p className="text-xs text-[#6B7A99]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BA8C0]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search packs, companies, topics..."
            className="w-full pl-9 pr-4 py-2.5 border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl text-sm bg-white dark:bg-[#162447] text-[#0D1B3E] dark:text-white focus:outline-none focus:border-[#0D9488]" />
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-[#F0F2F7] dark:bg-[#0D1B3E] rounded-xl p-1">
            {(['all', 'course', 'assessment', 'interview'] as const).map(t => (
              <button key={t} onClick={() => setActiveType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-600 transition-all capitalize ${
                  activeType === t ? 'bg-white dark:bg-[#162447] text-[#0D1B3E] dark:text-white shadow-sm' : 'text-[#6B7A99] hover:text-[#0D1B3E] dark:hover:text-white'
                }`}>
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
          <select value={activeTier} onChange={e => setActiveTier(e.target.value as any)}
            className="text-xs border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl px-3 py-2 bg-white dark:bg-[#162447] text-[#0D1B3E] dark:text-white">
            <option value="all">All Tiers</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Pack Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
        {filtered.map(pack => {
          const isPurchased = purchasedPacks.has(pack.id);
          const canAfford = balance.remaining >= pack.credits;
          const tier = TIER_COLORS[pack.tier];
          return (
            <div key={pack.id} onClick={() => setSelectedPack(pack)}
              className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl overflow-hidden cursor-pointer card-hover fade-in-up hover:shadow-md transition-all">
              {/* Card Header */}
              <div className={`h-24 bg-gradient-to-br ${COMPANY_COLORS[pack.logo] || 'from-teal-500 to-blue-600'} relative p-4 flex items-end`}>
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-800 text-lg">
                  {pack.logo}
                </div>
                <div className="absolute top-3 right-3 flex gap-1.5">
                  {pack.isBestseller && (
                    <span className="px-2 py-0.5 bg-amber-400 text-amber-900 text-[10px] font-700 rounded-full">Bestseller</span>
                  )}
                  {pack.isNew && (
                    <span className="px-2 py-0.5 bg-emerald-400 text-emerald-900 text-[10px] font-700 rounded-full">New</span>
                  )}
                  {isPurchased && (
                    <span className="px-2 py-0.5 bg-white/90 text-emerald-700 text-[10px] font-700 rounded-full flex items-center gap-0.5">
                      <CheckCircle size={9} />Owned
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-600 ${TYPE_COLORS[pack.type]}`}>
                    {TYPE_ICONS[pack.type]}{pack.type}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-600 ${tier.bg} ${tier.text}`}>
                    {tier.label}
                  </span>
                </div>
                <p className="text-sm font-700 text-[#0D1B3E] dark:text-white leading-tight mb-1">{pack.title}</p>
                <p className="text-xs text-[#6B7A99] line-clamp-2 mb-3">{pack.description}</p>

                <div className="flex items-center gap-3 text-xs text-[#9BA8C0] mb-3">
                  <span className="flex items-center gap-1"><Star size={10} className="text-amber-400 fill-amber-400" />{pack.rating}</span>
                  <span className="flex items-center gap-1"><Users size={10} />{(pack.enrolled / 1000).toFixed(1)}k</span>
                  <span className="flex items-center gap-1"><Clock size={10} />{pack.duration}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Zap size={13} className="text-amber-500" />
                    <span className="font-800 text-[#0D1B3E] dark:text-white">{pack.credits}</span>
                    <span className="text-xs text-[#6B7A99]">credits</span>
                  </div>
                  {isPurchased ? (
                    <span className="flex items-center gap-1 text-xs font-600 text-emerald-600">
                      <CheckCircle size={12} />Purchased
                    </span>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); setConfirmPurchase(pack); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-600 transition-colors ${
                        canAfford ? 'bg-[#0D9488] hover:bg-[#0B8076] text-white' : 'bg-[#F4F6FA] dark:bg-[#0D1B3E] text-[#9BA8C0] cursor-not-allowed'
                      }`}>
                      {canAfford ? <><ShoppingCart size={11} />Redeem</> : <><Lock size={11} />Need {pack.credits - balance.remaining} more</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pack Detail Modal */}
      {selectedPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedPack(null)} />
          <div className="relative bg-white dark:bg-[#162447] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden scale-in max-h-[90vh] overflow-y-auto">
            <div className={`h-32 bg-gradient-to-br ${COMPANY_COLORS[selectedPack.logo] || 'from-teal-500 to-blue-600'} relative p-5 flex items-end`}>
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-800 text-xl">
                {selectedPack.logo}
              </div>
              <button onClick={() => setSelectedPack(null)} className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                ×
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-600 ${TYPE_COLORS[selectedPack.type]}`}>
                    {TYPE_ICONS[selectedPack.type]}{selectedPack.type}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-600 ${TIER_COLORS[selectedPack.tier].bg} ${TIER_COLORS[selectedPack.tier].text}`}>
                    {TIER_COLORS[selectedPack.tier].label}
                  </span>
                </div>
                <h2 className="text-lg font-800 text-[#0D1B3E] dark:text-white">{selectedPack.title}</h2>
                <p className="text-sm text-[#6B7A99] mt-1 leading-relaxed">{selectedPack.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#F8FAFC] dark:bg-[#0D1B3E] rounded-xl p-3 text-center">
                  <p className="text-lg font-800 text-[#0D1B3E] dark:text-white">{selectedPack.rating}</p>
                  <p className="text-[10px] text-[#6B7A99]">Rating</p>
                </div>
                <div className="bg-[#F8FAFC] dark:bg-[#0D1B3E] rounded-xl p-3 text-center">
                  <p className="text-lg font-800 text-[#0D1B3E] dark:text-white">{(selectedPack.enrolled / 1000).toFixed(1)}k</p>
                  <p className="text-[10px] text-[#6B7A99]">Enrolled</p>
                </div>
                <div className="bg-[#F8FAFC] dark:bg-[#0D1B3E] rounded-xl p-3 text-center">
                  <p className="text-lg font-800 text-[#0D1B3E] dark:text-white">{selectedPack.duration}</p>
                  <p className="text-[10px] text-[#6B7A99]">Duration</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-700 text-[#6B7A99] uppercase tracking-wide mb-2">Topics Covered</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPack.topics.map(t => (
                    <span key={t} className="px-2.5 py-1 bg-[#F4F6FA] dark:bg-[#0D1B3E] text-xs font-500 text-[#3D5A80] dark:text-[#94A3B8] rounded-lg">{t}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-700 text-[#6B7A99] uppercase tracking-wide mb-2">What's Included</p>
                <div className="space-y-1.5">
                  {selectedPack.features.map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                      <span className="text-sm text-[#0D1B3E] dark:text-white">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#E8ECF4] dark:border-[#1E3A5F] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-[#6B7A99]">Pack Price</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Zap size={16} className="text-amber-500" />
                      <span className="text-2xl font-800 text-[#0D1B3E] dark:text-white">{selectedPack.credits}</span>
                      <span className="text-sm text-[#6B7A99]">credits</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#6B7A99]">Your Balance</p>
                    <p className={`text-sm font-700 mt-0.5 ${balance.remaining >= selectedPack.credits ? 'text-emerald-600' : 'text-red-500'}`}>
                      {balance.remaining.toLocaleString()} credits
                    </p>
                  </div>
                </div>
                {purchasedPacks.has(selectedPack.id) ? (
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
                    <CheckCircle size={16} className="text-emerald-600" />
                    <p className="text-sm font-600 text-emerald-700 dark:text-emerald-400">You own this pack! Access it from your dashboard.</p>
                  </div>
                ) : balance.remaining >= selectedPack.credits ? (
                  <button onClick={() => setConfirmPurchase(selectedPack)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-xl font-600 transition-colors">
                    <ShoppingCart size={16} />Redeem with Credits
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                      <Lock size={14} className="text-red-500" />
                      <p className="text-xs text-red-600 dark:text-red-400">Need {selectedPack.credits - balance.remaining} more credits</p>
                    </div>
                    <a href="/subscription" className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-600 transition-colors">
                      <Zap size={16} />Top Up Credits
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Confirm Modal */}
      {confirmPurchase && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmPurchase(null)} />
          <div className="relative bg-white dark:bg-[#162447] rounded-2xl shadow-2xl w-full max-w-sm p-6 scale-in">
            <div className="text-center mb-5">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${COMPANY_COLORS[confirmPurchase.logo]} flex items-center justify-center text-white font-800 text-xl mx-auto mb-3`}>
                {confirmPurchase.logo}
              </div>
              <h3 className="font-800 text-[#0D1B3E] dark:text-white">{confirmPurchase.title}</h3>
              <p className="text-sm text-[#6B7A99] mt-1">Confirm credit redemption</p>
            </div>
            <div className="bg-[#F8FAFC] dark:bg-[#0D1B3E] rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#6B7A99]">Pack Price</span>
                <span className="font-700 text-[#0D1B3E] dark:text-white flex items-center gap-1"><Zap size={12} className="text-amber-500" />{confirmPurchase.credits} credits</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6B7A99]">Current Balance</span>
                <span className="font-700 text-[#0D1B3E] dark:text-white">{balance.remaining.toLocaleString()} credits</span>
              </div>
              <div className="border-t border-[#E8ECF4] dark:border-[#1E3A5F] pt-2 flex justify-between text-sm">
                <span className="text-[#6B7A99]">After Purchase</span>
                <span className="font-700 text-emerald-600">{(balance.remaining - confirmPurchase.credits).toLocaleString()} credits</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmPurchase(null)}
                className="flex-1 py-2.5 border border-[#DDE3EE] dark:border-[#1E3A5F] rounded-xl text-sm font-600 text-[#6B7A99] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors">
                Cancel
              </button>
              <button onClick={() => handlePurchase(confirmPurchase)}
                className="flex-1 py-2.5 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-xl text-sm font-600 transition-colors">
                Confirm Redeem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
