'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Award, Loader2, Copy, Check } from 'lucide-react';

interface Certificate {
  id: string;
  title: string;
  issuedAt: string;
  credentialCode: string;
  meta: Record<string, unknown>;
}

export default function CertificatesContent() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/certificates');
      if (res.status === 401) {
        setError('Sign in to view your certificates.');
        setCertificates([]);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load certificates');
        return;
      }
      setCertificates(json.certificates || []);
    } catch {
      setError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D1B3E] flex items-center gap-2">
          <Award size={22} className="text-amber-500" /> Certificates
        </h1>
        <p className="text-sm text-[#6B7A99] mt-0.5">
          Credentials you have earned on the platform
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-teal-600" size={28} />
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#DDE3EE] rounded-2xl">
          <Award size={36} className="text-[#C4CAD9] mx-auto mb-3" />
          <p className="text-sm font-600 text-[#6B7A99]">No certificates yet</p>
          <p className="text-xs text-[#6B7A99] mt-1">
            Complete courses and assessments to earn certificates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white border border-[#E8ECF4] rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-700 text-[#0D1B3E]">{cert.title}</h3>
                  <p className="text-xs text-[#6B7A99] mt-0.5">
                    Issued{' '}
                    {new Date(cert.issuedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 bg-[#F4F6FA] rounded-xl px-3 py-2">
                <code className="text-xs font-mono text-[#0D1B3E]">{cert.credentialCode}</code>
                <button
                  onClick={() => copyCode(cert.id, cert.credentialCode)}
                  className="text-[#6B7A99] hover:text-teal-600"
                  aria-label="Copy credential code"
                >
                  {copiedId === cert.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
