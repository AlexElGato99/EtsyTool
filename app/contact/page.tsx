import type { Metadata } from 'next';
import Link from 'next/link';
import { PiArrowUpRightBold, PiChatCircleTextBold, PiEnvelopeBold, PiShieldCheckBold } from 'react-icons/pi';
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
      <main id="main" className="public-page container" tabIndex={-1}>
        <header className="page-intro">
          <p className="page-eyebrow">Contact</p>
          <h1 className="page-title">Let&apos;s make research simpler.</h1>
          <p className="page-description">Need help with your account, have an idea, or want to ask about your data? Contact the person operating PNG Scout.</p>
        </header>

        <section className="info-card contact-card">
          <PiEnvelopeBold className="info-icon" aria-hidden="true" />
          <p className="page-eyebrow">Your point of contact</p>
          <h2>{operatorName}</h2>
          <p><a className="contact-email" href={`mailto:${email}`}>{email}</a></p>
          <p>Send an email with a short description of what you need. If your request concerns an account, contact us from the email address you used to register.</p>
          <div className="page-actions">
            <a className="button button-primary" href={`mailto:${email}?subject=${encodeURIComponent('PNG Scout support')}`}>Email PNG Scout <PiArrowUpRightBold aria-hidden="true" /></a>
          </div>
        </section>

        <div className="page-grid">
          <section className="info-card">
            <PiChatCircleTextBold className="info-icon" aria-hidden="true" />
            <h2>Support &amp; feedback</h2>
            <p>For a technical issue, include the page, what you expected, and any error message. Suggestions about the workspace or accessibility are welcome.</p>
            <p>Please do not send passwords, session tokens, or API keys.</p>
          </section>
          <section className="info-card">
            <PiShieldCheckBold className="info-icon" aria-hidden="true" />
            <h2>Privacy &amp; account requests</h2>
            <p>You can request access to, correction of, or deletion of your account information by email. We may need to verify that the account belongs to you before acting.</p>
            <Link className="text-link" href="/privacy">Read our privacy policy <PiArrowUpRightBold aria-hidden="true" /></Link>
          </section>
        </div>

        <section className="prose info-card">
          <h2>A few useful details</h2>
          <p>PNG Scout is entirely free. You will not be asked for payment details to create an account or use the available features.</p>
          <p>If live research is unavailable, the site&apos;s Etsy connection may still require configuration or approval. Creating an account and accessing public pages are separate from live Etsy research.</p>
          <p>For an Etsy purchase, refund, or seller question, use the original listing and Etsy&apos;s support channels. PNG Scout does not manage orders or purchases.</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
