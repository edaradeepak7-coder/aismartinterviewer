import { Metadata } from 'next';
import AdminQuestionBankContent from './components/AdminQuestionBankContent';

export const metadata: Metadata = {
  title: 'Question Bank | Super Admin',
  description: 'Manage interview questions synced with Airtable',
};

export default function AdminQuestionBankPage() {
  return <AdminQuestionBankContent />;
}
