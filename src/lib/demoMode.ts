/**
 * Demo / mock-data gating.
 *
 * NEXT_PUBLIC_DEMO_MODE=true  → show "Demo data" banners where DemoGate applies
 * NEXT_PUBLIC_DEMO_MODE=false → no demo banners; all product routes are live
 * unset → enabled in development, disabled in production
 *
 * DEMO_ONLY_ROUTES should stay empty once surfaces are wired to real APIs.
 * Re-add a path only if a page is intentionally mock-backed again.
 */

export function isDemoMode(): boolean {
  const v = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

/**
 * Routes that currently rely on hard-coded MOCK_* / ComingSoon / fake metrics.
 * Keep this list in sync when a page is wired to real APIs.
 */
export const DEMO_ONLY_ROUTES: readonly string[] = [] as const;

export function isDemoOnlyRoute(pathname: string): boolean {
  return DEMO_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function filterDemoNavItems<T extends { href: string; demoOnly?: boolean }>(
  items: T[],
  demoMode: boolean
): T[] {
  if (demoMode) return items;
  return items.filter((item) => !item.demoOnly && !isDemoOnlyRoute(item.href));
}
