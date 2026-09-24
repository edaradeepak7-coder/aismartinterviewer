import { redirect } from 'next/navigation';

/** Stub page — candidate search lives on the recruiter dashboard (Candidate 360 is demo-only) */
export default function CandidatesPage() {
  redirect('/recruiter-dashboard');
}
