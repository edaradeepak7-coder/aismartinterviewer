import { Metadata } from 'next';
import B2BPricingContent from './components/B2BPricingContent';

export const metadata: Metadata = {
  title: 'B2B Pricing — Triveda AI Interview Platform',
  description:
    'Recruiter and enterprise seat plans with credit-based AI interviews. Start a trial or contact sales.',
};

export default function B2BPricingPage() {
  return <B2BPricingContent />;
}
