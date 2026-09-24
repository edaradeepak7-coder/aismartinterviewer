'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Package, Lock, CheckCircle, Search, Loader2, Zap } from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';
import CompanyLogo from '@/components/ui/CompanyLogo';

interface CompanyPack {
  id: string;
  companyName: string;
  title: string;
  description: string;
  creditCost: number;
  unlocked: boolean;
}

export default function CompanyPacksContent() {
  const [packs, setPacks] = useState<CompanyPack[]>([]);
  const [creditsRemaining, setCreditsRemaining] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CompanyPack | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/company-packs');
      if (res.status === 401) {
        setError('Sign in to browse company packs.');
        setPacks([]);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load packs');
        return;
      }
      setPacks(json.packs || []);
      setCreditsRemaining(json.creditsRemaining ?? 0);
    } catch {
      setError('Failed to load packs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = packs.filter(
    (p) =>
      !search.trim() ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const handleUnlock = async (pack: CompanyPack) => {
    setUnlockingId(pack.id);
    setError(null);
    try {
      const res = await fetch('/api/company-packs', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ packId: pack.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Unlock failed');
        return;
      }
      if (typeof json.creditsRemaining === 'number') {
        setCreditsRemaining(json.creditsRemaining);
      }
      setSelected(null);
      await load();
    } catch {
      setError('Unlock failed');
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B3E] flex items-center gap-2">
            <Package size={22} className="text-teal-600" /> Company Packs
          </h1>
          <p className="text-sm text-[#6B7A99] mt-0.5">
            Unlock company-specific interview prep packs with credits
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-700">
          <Zap size={12} /> {creditsRemaining.toLocaleString()} credits
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-3 py-2.5 max-w-md">
        <Search size={14} className="text-[#6B7A99]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search packs or companies..."
          className="flex-1 text-sm outline-none bg-transparent"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-teal-600" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#DDE3EE] rounded-2xl">
          <Package size={36} className="text-[#C4CAD9] mx-auto mb-3" />
          <p className="text-sm font-600 text-[#6B7A99]">
            {packs.length === 0 ? 'No company packs published yet' : 'No packs match your search'}
          </p>
          <p className="text-xs text-[#6B7A99] mt-1">
            Published packs will appear here when available.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((pack) => (
            <div
              key={pack.id}
              className="bg-white border border-[#E8ECF4] rounded-2xl p-5 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <CompanyLogo company={pack.companyName} size="md" />
                <div>
                  <p className="text-[10px] font-600 text-[#6B7A99] uppercase tracking-wide">
                    {pack.companyName}
                  </p>
                  <h3 className="text-sm font-700 text-[#0D1B3E]">{pack.title}</h3>
                </div>
              </div>
              <p className="text-xs text-[#6B7A99] line-clamp-3 flex-1 mb-4">{pack.description}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-700 text-amber-700 flex items-center gap-1">
                  <Zap size={11} /> {pack.creditCost} credits
                </span>
                {pack.unlocked ? (
                  <span className="flex items-center gap-1 text-xs font-700 text-teal-700">
                    <CheckCircle size={12} /> Unlocked
                  </span>
                ) : (
                  <button
                    onClick={() => setSelected(pack)}
                    className="px-3 py-1.5 rounded-lg bg-[#0D1B3E] text-white text-xs font-700 flex items-center gap-1"
                  >
                    <Lock size={11} /> Unlock
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-700 text-[#0D1B3E]">Unlock {selected.title}?</h3>
            <p className="text-sm text-[#6B7A99]">
              This will use <strong>{selected.creditCost}</strong> credits from your balance (
              {creditsRemaining} remaining).
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-2 rounded-lg border text-sm font-600 text-[#6B7A99]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnlock(selected)}
                disabled={unlockingId === selected.id}
                className="px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-700 disabled:opacity-60"
              >
                {unlockingId === selected.id ? 'Unlocking…' : 'Confirm unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
