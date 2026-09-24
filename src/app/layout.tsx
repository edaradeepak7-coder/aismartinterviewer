import React from 'react';
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { AchievementProvider } from '@/components/ui/AchievementToast';
import { WalkthroughProvider } from '@/contexts/WalkthroughContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import NavigationLoadingBar from '@/components/ui/NavigationLoadingBar';
import NavigationFeedback from '@/components/ui/NavigationFeedback';
import PageLoader from '@/components/PageLoader';
import { Suspense } from 'react';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import TicketAlertProvider from '@/components/TicketAlertProvider';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-corporate',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'AI Smart Interviewer — Automated Technical Interview Platform',
  description:
    'AI Smart Interviewer conducts, scores, and reports on voice-based technical interviews — helping recruiting teams evaluate candidates faster and more consistently.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={ibmPlexSans.variable}>
      <body className={ibmPlexSans.className}>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <ThemeProvider>
          <AuthProvider>
            <NavigationProvider>
              <AchievementProvider>
                <WalkthroughProvider>
                  <TicketAlertProvider>
                    <NavigationLoadingBar />
                    <NavigationFeedback />
                    <PageLoader />
                    {children}
                  </TicketAlertProvider>
                </WalkthroughProvider>
              </AchievementProvider>
            </NavigationProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'var(--font-corporate)',
              fontSize: '14px',
            },
          }}
        />
        <ServiceWorkerRegistrar />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Faismartint3906back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.20" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.3" /></body>
    </html>
  );
}
