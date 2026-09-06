import AppLayout from '@/components/AppLayout';

export default function InterviewsPage() {
  return (
    <AppLayout role="recruiter">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-700 text-[#0D1B3E]">Interviews</h1>
          <p className="text-sm text-[#6B7A99] mt-1">Manage all scheduled and completed interviews.</p>
        </div>
        <div className="bg-white border border-[#DDE3EE] rounded-xl p-8 text-center">
          <p className="text-sm text-[#6B7A99]">View your <a href="/recruiter-calendar" className="text-[#0D9488] font-600 hover:underline">Interview Calendar</a> for scheduling.</p>
        </div>
      </div>
    </AppLayout>
  );
}
