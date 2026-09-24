'use client';
import React, { useState } from 'react';
import { X, ExternalLink, CheckCircle, Globe } from 'lucide-react';
import type { InterviewConfig } from './RecruiterInterviewScreen';

interface JobPostingModalProps {
  config: InterviewConfig;
  onClose: () => void;
}

const JOB_PORTALS = [
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'border-blue-500/30 hover:border-blue-500/60', url: 'https://www.linkedin.com/jobs/post/', description: 'Largest professional network' },
  { id: 'naukri', name: 'Naukri', icon: '🇮🇳', color: 'border-orange-500/30 hover:border-orange-500/60', url: 'https://www.naukri.com/recruiter/', description: 'India\'s #1 job portal' },
  { id: 'indeed', name: 'Indeed', icon: '🔍', color: 'border-purple-500/30 hover:border-purple-500/60', url: 'https://employers.indeed.com/', description: 'World\'s largest job site' },
  { id: 'glassdoor', name: 'Glassdoor', icon: '🏢', color: 'border-green-500/30 hover:border-green-500/60', url: 'https://www.glassdoor.com/employers/', description: 'Employer branding + jobs' },
  { id: 'shine', name: 'Shine', icon: '✨', color: 'border-yellow-500/30 hover:border-yellow-500/60', url: 'https://www.shine.com/recruiter/', description: 'Premium Indian job portal' },
  { id: 'monster', name: 'Monster', icon: '👾', color: 'border-pink-500/30 hover:border-pink-500/60', url: 'https://hiring.monster.com/', description: 'Global talent marketplace' },
  { id: 'foundit', name: 'Foundit', icon: '🎯', color: 'border-cyan-500/30 hover:border-cyan-500/60', url: 'https://www.foundit.in/', description: 'Formerly Monster India' },
  { id: 'internshala', name: 'Internshala', icon: '🎓', color: 'border-teal-500/30 hover:border-teal-500/60', url: 'https://internshala.com/recruiter/', description: 'Freshers & interns' },
];

export default function JobPostingModal({ config, onClose }: JobPostingModalProps) {
  const [selectedPortals, setSelectedPortals] = useState<string[]>([]);
  const [jobTitle, setJobTitle] = useState(config.jobTitle);
  const [department, setDepartment] = useState(config.department);
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('Full-time');
  const [experience, setExperience] = useState('2-5 years');
  const [salary, setSalary] = useState('');
  const [description, setDescription] = useState('');
  const [posted, setPosted] = useState<string[]>([]);

  const togglePortal = (id: string) => {
    setSelectedPortals(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handlePost = () => {
    if (selectedPortals.length === 0) return;

    // Open each selected portal in a new tab with pre-filled context
    selectedPortals.forEach(portalId => {
      const portal = JOB_PORTALS.find(p => p.id === portalId);
      if (portal) {
        window.open(portal.url, '_blank', 'noopener,noreferrer');
      }
    });

    setPosted(selectedPortals);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0E1520] border border-[#1E2D3D] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D3D] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2ABFBF]/20 flex items-center justify-center">
              <Globe size={16} className="text-[#2ABFBF]" />
            </div>
            <div>
              <h2 className="text-[15px] font-700 text-white">Post Job Opening</h2>
              <p className="text-[11px] text-[#4A6B7A]">Publish to multiple job portals at once</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1E2D3D] text-[#4A6B7A] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Job details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1 block">Job Title</label>
              <input
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                className="w-full bg-[#111B27] border border-[#1E2D3D] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-[#2ABFBF]/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1 block">Department</label>
              <input
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full bg-[#111B27] border border-[#1E2D3D] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-[#2ABFBF]/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1 block">Location</label>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Bangalore, Remote"
                className="w-full bg-[#111B27] border border-[#1E2D3D] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-[#3A5060] focus:outline-none focus:ring-1 focus:ring-[#2ABFBF]/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1 block">Job Type</label>
              <select
                value={jobType}
                onChange={e => setJobType(e.target.value)}
                className="w-full bg-[#111B27] border border-[#1E2D3D] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-[#2ABFBF]/50"
              >
                {['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1 block">Experience</label>
              <select
                value={experience}
                onChange={e => setExperience(e.target.value)}
                className="w-full bg-[#111B27] border border-[#1E2D3D] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-[#2ABFBF]/50"
              >
                {['Fresher', '0-1 years', '1-2 years', '2-5 years', '5-8 years', '8+ years'].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1 block">Salary Range (optional)</label>
              <input
                value={salary}
                onChange={e => setSalary(e.target.value)}
                placeholder="e.g. ₹8-12 LPA"
                className="w-full bg-[#111B27] border border-[#1E2D3D] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-[#3A5060] focus:outline-none focus:ring-1 focus:ring-[#2ABFBF]/50"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1 block">Job Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the role, responsibilities, and requirements..."
              rows={3}
              className="w-full bg-[#111B27] border border-[#1E2D3D] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-[#3A5060] resize-none focus:outline-none focus:ring-1 focus:ring-[#2ABFBF]/50"
            />
          </div>

          {/* Portal selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider">Select Job Portals</p>
              <button
                onClick={() => setSelectedPortals(selectedPortals.length === JOB_PORTALS.length ? [] : JOB_PORTALS.map(p => p.id))}
                className="text-[11px] text-[#2ABFBF] hover:text-[#25AAAA] font-600"
              >
                {selectedPortals.length === JOB_PORTALS.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {JOB_PORTALS.map(portal => {
                const isSelected = selectedPortals.includes(portal.id);
                const isPosted = posted.includes(portal.id);
                return (
                  <button
                    key={portal.id}
                    onClick={() => togglePortal(portal.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      isPosted
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : isSelected
                        ? `bg-[#162030] ${portal.color}`
                        : `bg-[#111B27] border-[#1E2D3D] ${portal.color}`
                    }`}
                  >
                    <span className="text-lg">{portal.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-700 text-white">{portal.name}</p>
                      <p className="text-[10px] text-[#4A6B7A] truncate">{portal.description}</p>
                    </div>
                    {isPosted ? (
                      <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                    ) : isSelected ? (
                      <div className="w-4 h-4 rounded-full bg-[#2ABFBF] shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#2A3D4D] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1E2D3D] flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#111B27] border border-[#1E2D3D] text-[#7A9BAA] text-[13px] font-600 hover:bg-[#1E2D3D] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={selectedPortals.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2ABFBF] hover:bg-[#25AAAA] text-[#0C1017] text-[13px] font-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ExternalLink size={15} />
            Post to {selectedPortals.length > 0 ? `${selectedPortals.length} Portal${selectedPortals.length > 1 ? 's' : ''}` : 'Portals'}
          </button>
        </div>
      </div>
    </div>
  );
}
