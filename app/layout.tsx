import type { Metadata } from 'next';
import { projectName } from '../lib/brand';
import '../public/home.css';
export const metadata: Metadata = {
  title: `${projectName} - Free listing preparation and shop tools`,
  applicationName: projectName,
  openGraph: { siteName: projectName },
  description: 'Prepare your own listing copy, plan costs from your own inputs, and keep private manual drafts in a free workspace. No paid plans or subscriptions.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
