import { redirect } from 'next/navigation';

// The home dashboard now lives inside the unified, role-aware Insights hub.
export default function HomePage() {
  redirect('/insights');
}
