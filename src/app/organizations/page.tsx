import AppLayout from '@/components/AppLayout';

export default function OrganizationsPage() {
  return (
    <AppLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-700 text-[#0D1B3E]">Organizations</h1>
          <p className="text-sm text-[#6B7A99] mt-1">Manage all organizations on the platform.</p>
        </div>
        <div className="bg-white border border-[#DDE3EE] rounded-xl p-8 text-center">
          <p className="text-sm text-[#6B7A99]">Organization management coming soon.</p>
        </div>
      </div>
    </AppLayout>
  );
}
