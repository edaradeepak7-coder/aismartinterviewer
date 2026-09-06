import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { AchievementProvider } from '@/components/ui/AchievementToast';
import { WalkthroughProvider } from '@/contexts/WalkthroughContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import PageLoader from '@/components/PageLoader';
import { Suspense } from 'react';
import GoogleAnalytics from '@/components/GoogleAnalytics';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
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
    <html lang="en" className={plusJakartaSans.variable}>
      <body className={plusJakartaSans.className}>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <ThemeProvider>
          <AuthProvider>
            <AchievementProvider>
              <WalkthroughProvider>
                <PageLoader />
                {children}
              </WalkthroughProvider>
            </AchievementProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'var(--font-jakarta)',
              fontSize: '14px',
            },
          }}
        />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Faismartint3906back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.20" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.3" /></body>
    </html>
  );
}