import type { Metadata } from 'next';
import { PiCheckCircleBold, PiPencilLineBold, PiBookmarkSimpleBold } from 'react-icons/pi';
import AuthForm from '../../components/auth-form';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { BrandMark } from '../../components/site-icon';

export const metadata: Metadata = {
  title: 'Sign in · podadd',
  description: 'Sign in to your free podadd workspace to prepare and save your own listing drafts.',
};

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <>
    <SiteHeader />
    <main id="main" className="auth-page" tabIndex={-1}>
      <div className="container auth-layout">
        <section className="auth-intro">
          <a className="brand auth-brand" href="/" aria-label="podadd home"><BrandMark /></a>
          <span className="eyebrow">Your own words, organized</span>
          <h1>Return to your next good draft.</h1>
          <p>Prepare your own title, tags, and description. Keep your working notes together and pick up where you left off.</p>
          <ul className="auth-benefits">
            <li><PiPencilLineBold aria-hidden="true" /><span>Write and review copy for your own products.</span></li>
            <li><PiBookmarkSimpleBold aria-hidden="true" /><span>Keep up to 30 private manual listing drafts.</span></li>
            <li><PiCheckCircleBold aria-hidden="true" /><span>Free access. No subscriptions or payment details.</span></li>
          </ul>
        </section>
        <AuthForm mode="login" />
      </div>
    </main>
    <SiteFooter />
  </>;
}
