import type { Metadata } from 'next';
import '../public/home.css';
export const metadata: Metadata = {
  title: 'PNG Scout - Free research tools for digital creators',
  description: 'A free, non-commercial workspace to explore Etsy listings, investigate keywords, and organize your product research. No paid plans or subscriptions.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
