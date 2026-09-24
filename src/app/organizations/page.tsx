import { redirect } from 'next/navigation';

/** Stub page — real org management lives at /org-admin */
export default function OrganizationsPage() {
  redirect('/org-admin');
}
