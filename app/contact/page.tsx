import type { Metadata } from 'next';
import Link from 'next/link';
import { PiArrowUpRightBold, PiEnvelopeBold, PiShieldCheckBold } from 'react-icons/pi';
import ContactForm from '../../components/contact-form';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { getPublicContact } from '../../lib/public-contact';

export const metadata: Metadata = {
  title: 'Contact | PNG Scout',
  description: 'Contact the PNG Scout operator for support, feedback, or privacy and account requests.',
};

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const { email, operatorName } = await getPublicContact();

  return (
    <>
      <SiteHeader />
      <main id="main" className="public-page container centered-page contact-page" tabIndex={-1}>
        <header className="page-intro centered-intro">
          <p className="page-eyebrow">Contact</p>
          <h1 className="page-title">We&apos;re here to help.</h1>
          <p className="page-description">Have a question, need support, or want to share an idea? Write a message to the person behind PNG Scout.</p>
        </header>

        <section className="info-card contact-form-card" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title">Start a conversation</h2>
          <p className="contact-note">All fields are required. Your message stays in your browser until you send it through your email app.</p>
          <ContactForm email={email} />
        </section>

        <div className="centered-card-row">
          <section className="info-card centered-card">
            <PiEnvelopeBold className="info-icon" aria-hidden="true" />
            <h2>Email us directly</h2>
            <p>Your point of contact is {operatorName}. You can also reach us from your own email app.</p>
            <a className="contact-email" href={`mailto:${email}`}>{email}</a>
          </section>
          <section className="info-card centered-card">
            <PiShieldCheckBold className="info-icon" aria-hidden="true" />
            <h2>Support &amp; privacy</h2>
            <p>For account or data requests, write from your registered email address. For technical help, include the page and any error message.</p>
            <Link className="text-link" href="/privacy">Read our privacy policy <PiArrowUpRightBold aria-hidden="true" /></Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
