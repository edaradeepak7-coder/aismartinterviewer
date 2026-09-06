import AppLayout from '@/components/AppLayout';

export default function CandidatesPage() {
  return (
    <AppLayout role="recruiter">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-700 text-[#0D1B3E]">Candidates</h1>
          <p className="text-sm text-[#6B7A99] mt-1">View and manage all candidates in your pipeline.</p>
        </div>
        <div className="bg-white border border-[#DDE3EE] rounded-xl p-8 text-center">
          <p className="text-sm text-[#6B7A99]">Use <a href="/candidate-360" className="text-[#0D9488] font-600 hover:underline">Candidate 360</a> for full candidate management.</p>
        </div>
      </div>
    </AppLayout>
  );
}
