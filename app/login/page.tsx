import type { Metadata } from 'next';
import { PiCheckCircleBold, PiMagnifyingGlassBold, PiBookmarkSimpleBold } from 'react-icons/pi';
import AuthForm from '../../components/auth-form';
import { SiteHeader, SiteFooter } from '../../components/site-shell';

export const metadata: Metadata = {
  title: 'Sign in · PNG Scout',
  description: 'Sign in to your free PNG Scout workspace to explore Etsy listings and organize product research.',
};

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <>
    <SiteHeader />
    <main id="main" className="auth-page" tabIndex={-1}>
      <div className="container auth-layout">
        <section className="auth-intro">
          <span className="eyebrow">Your creative research space</span>
          <h1>Good ideas start with a clearer picture.</h1>
          <p>Explore digital product listings, compare what you find, and keep your next idea organized in one place.</p>
          <ul className="auth-benefits">
            <li><PiMagnifyingGlassBold aria-hidden="true" /><span>Explore listings and understand product details.</span></li>
            <li><PiBookmarkSimpleBold aria-hidden="true" /><span>Keep interesting products in your private watchlist.</span></li>
            <li><PiCheckCircleBold aria-hidden="true" /><span>Free access. No subscriptions or payment details.</span></li>
          </ul>
        </section>
        <AuthForm mode="login" />
      </div>
    </main>
    <SiteFooter />
  </>;
}
