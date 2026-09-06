import AppLayout from '@/components/AppLayout';

export default function UsersPage() {
  return (
    <AppLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-700 text-[#0D1B3E]">Users</h1>
          <p className="text-sm text-[#6B7A99] mt-1">Manage all platform users.</p>
        </div>
        <div className="bg-white border border-[#DDE3EE] rounded-xl p-8 text-center">
          <p className="text-sm text-[#6B7A99]">User management is available in <a href="/admin-dashboard" className="text-[#0D9488] font-600 hover:underline">Admin Control</a>.</p>
        </div>
      </div>
    </AppLayout>
  );
}
