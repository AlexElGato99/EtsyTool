import type { Metadata } from 'next';
import { PiCheckCircleBold, PiLockKeyBold, PiSparkleBold } from 'react-icons/pi';
import AuthForm from '../../components/auth-form';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { BrandMark } from '../../components/site-icon';

export const metadata: Metadata = {
  title: 'Create a free account · PNG Scout',
  description: 'Create a free PNG Scout account. A noncommercial tool for digital product research, with no subscriptions or payment required.',
};

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return <>
    <SiteHeader />
    <main id="main" className="auth-page" tabIndex={-1}>
      <div className="container auth-layout">
        <section className="auth-intro">
          <a className="brand auth-brand" href="/" aria-label="PNG Scout home"><BrandMark /></a>
          <span className="eyebrow">Free for curious creators</span>
          <h1>Make room for your next idea.</h1>
          <p>Create your free account and give your product research a place to grow. PNG Scout is a noncommercial project, built to make research easier.</p>
          <ul className="auth-benefits">
            <li><PiCheckCircleBold aria-hidden="true" /><span>Every available feature is free to use.</span></li>
            <li><PiLockKeyBold aria-hidden="true" /><span>Your account keeps your saved research private.</span></li>
            <li><PiSparkleBold aria-hidden="true" /><span>No paid plans, checkout, or credit card required.</span></li>
          </ul>
        </section>
        <AuthForm mode="signup" />
      </div>
    </main>
    <SiteFooter />
  </>;
}
