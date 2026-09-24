import { Suspense } from 'react';
import QuestionBankAuditContent from './components/QuestionBankAuditContent';

export default function QuestionBankAuditPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <QuestionBankAuditContent />
    </Suspense>
  );
}
