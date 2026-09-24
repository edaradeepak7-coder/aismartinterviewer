import AppLayout from '@/components/AppLayout';

export default function ResumePage() {
  return (
    <AppLayout role="candidate">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-700 text-[#0D1B3E]">Resume Profile</h1>
          <p className="text-sm text-[#6B7A99] mt-1">Build and manage your professional resume.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="/resume-builder" className="bg-white border border-[#DDE3EE] rounded-xl p-5 hover:border-[#0D9488] hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center mb-3">
              <span className="text-violet-600 text-lg">✏️</span>
            </div>
            <h3 className="font-700 text-[#0D1B3E] text-sm mb-1 group-hover:text-[#0D9488] transition-colors">AI Resume Builder</h3>
            <p className="text-xs text-[#6B7A99]">Build a professional resume with AI-generated content</p>
          </a>
          <a href="/ats-scoring" className="bg-white border border-[#DDE3EE] rounded-xl p-5 hover:border-[#0D9488] hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center mb-3">
              <span className="text-teal-600 text-lg">📊</span>
            </div>
            <h3 className="font-700 text-[#0D1B3E] text-sm mb-1 group-hover:text-[#0D9488] transition-colors">ATS Score Checker</h3>
            <p className="text-xs text-[#6B7A99]">Check how well your resume passes ATS systems</p>
          </a>
        </div>
      </div>
    </AppLayout>
  );
}
