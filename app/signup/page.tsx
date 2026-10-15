import type { Metadata } from 'next';
import { PiCheckCircleBold, PiLockKeyBold, PiSparkleBold } from 'react-icons/pi';
import AuthForm from '../../components/auth-form';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { BrandMark } from '../../components/site-icon';

export const metadata: Metadata = {
  title: 'Create a free account · podadd',
  description: 'Create a free podadd account to keep your own manual listing drafts. No subscriptions or payment required.',
};

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return <>
    <SiteHeader />
    <main id="main" className="auth-page" tabIndex={-1}>
      <div className="container auth-layout">
        <section className="auth-intro">
          <a className="brand auth-brand" href="/" aria-label="podadd home"><BrandMark /></a>
          <span className="eyebrow">Free tools for your own shop</span>
          <h1>Give your next draft a home.</h1>
          <p>Create your free account to keep your own titles, tags, descriptions, and working notes together. Manual drafts work independently of Etsy API access.</p>
          <ul className="auth-benefits">
            <li><PiCheckCircleBold aria-hidden="true" /><span>Every available feature is free to use.</span></li>
            <li><PiLockKeyBold aria-hidden="true" /><span>Your account keeps your manual drafts private.</span></li>
            <li><PiSparkleBold aria-hidden="true" /><span>No paid plans, checkout, or credit card required.</span></li>
          </ul>
        </section>
        <AuthForm mode="signup" />
      </div>
    </main>
    <SiteFooter />
  </>;
}
