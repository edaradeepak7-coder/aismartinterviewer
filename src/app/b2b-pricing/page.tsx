import { Metadata } from 'next';
import PublicPricingContent from './components/PublicPricingContent';

export const metadata: Metadata = {
  title: 'Pricing — Triveda AI Interview Platform',
  description: 'Flexible pricing plans for candidates, institutions, and enterprises. Pay per seat, cancel anytime.',
};

export default function B2BPricingPage() {
  return <PublicPricingContent />;
}
