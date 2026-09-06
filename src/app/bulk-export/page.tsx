import BulkExportContent from './components/BulkExportContent';

export const metadata = {
  title: 'Bulk Export | Triveda',
  description: 'Export candidate records, interview transcripts, performance reports, and billing history as CSV or PDF.',
};

export default function BulkExportPage() {
  return <BulkExportContent />;
}
