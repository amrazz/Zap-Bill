import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Zapbill - Restaurant Billing',
  description: 'Fast and simple restaurant management and billing system.',
  icons: {
    apple: '/web-app-manifest-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zap Bill',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: '#f59e0b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

import { Toaster } from 'sonner';
import ServiceWorkerCleaner from '@/components/ServiceWorkerCleaner';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} font-sans h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerCleaner />
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
