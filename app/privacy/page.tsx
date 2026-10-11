import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { getPublicContact } from '../../lib/public-contact';

export const metadata: Metadata = {
  title: 'Privacy Policy | PNG Scout',
  description: 'How PNG Scout handles account information, essential cookies, saved listings, and privacy requests.',
};

export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
  const { email, operatorName } = await getPublicContact();

  return (
    <>
      <SiteHeader />
      <main id="main" className="public-page container" tabIndex={-1}>
        <header className="page-intro">
          <p className="page-eyebrow">Legal &amp; transparency</p>
          <h1 className="page-title">Privacy policy</h1>
          <p className="page-description">What we collect, why we need it, and how you can contact us about your information.</p>
          <p className="page-date">Last updated: October 11, 2026</p>
        </header>

        <article className="prose info-card">
          <section>
            <h2>1. Who operates this service</h2>
            <p>PNG Scout is a free, non-commercial research tool operated by {operatorName}. For questions about this policy or your personal information, email <a href={`mailto:${email}`}>{email}</a>.</p>
            <p>This policy covers PNG Scout. Etsy and our service providers have their own policies for their services.</p>
          </section>

          <section>
            <h2>2. Information we process</h2>
            <ul>
              <li><strong>Account information.</strong> Your registration email, account identifier, and authentication records are processed through Supabase Auth. Your password is sent to the server and Supabase for authentication; Supabase stores a password hash rather than a readable password.</li>
              <li><strong>Workspace information.</strong> We store the public listings you save, the account identifier associated with your watchlist, and recorded listing snapshots. Your watchlist is available through your signed-in account and is not published as a public profile.</li>
              <li><strong>Research activity.</strong> Search terms and returned public listing data are stored in a shared search cache. Short-lived request counters associated with your account help enforce usage limits.</li>
              <li><strong>Support correspondence.</strong> If you email us, we receive your email address and the information you include so we can respond and handle your request.</li>
              <li><strong>Technical information.</strong> Hosting and authentication providers may process request details, such as IP addresses and technical logs, to deliver and protect their services.</li>
            </ul>
            <p>PNG Scout does not request your Etsy account password or access to private buyer information, orders, or payment details. The service has no billing features.</p>
          </section>

          <section>
            <h2>3. How we use information</h2>
            <p>We use account information to authenticate you, keep watchlists associated with the correct account, and provide support. Cached research data and request counters help serve searches, manage API limits, and reduce repeated requests.</p>
            <p>PNG Scout does not sell personal information or use it for targeted advertising. We do not add advertising trackers or analytics tracking scripts to the website.</p>
          </section>

          <section>
            <h2>4. Essential cookies</h2>
            <p>Signing in stores two essential first-party cookies: <code>scout_access</code> and <code>scout_refresh</code>. These contain authentication tokens so the server can recognize and renew your session.</p>
            <p>The access cookie has a browser lifetime of up to 7 days and the refresh cookie up to 30 days from when they are set or renewed. Token validity is also controlled by Supabase, so a cookie&apos;s lifetime does not guarantee an active session.</p>
            <p>These cookies are HttpOnly, use SameSite=Lax, and use the Secure flag in production. Signing out clears the app&apos;s session cookies. Blocking them prevents account features from working.</p>
          </section>

          <section>
            <h2>5. Service providers and public Etsy data</h2>
            <p>Supabase provides authentication and database services. Hosting infrastructure processes the requests needed to serve the website. Providers process information needed for their roles; their processing may take place in locations determined by the deployment and their own policies.</p>
            <p>Search terms and requested listing identifiers are sent to Etsy&apos;s API to obtain public listing information. Listing images may load from Etsy&apos;s image infrastructure. Visiting a listing on Etsy takes you to a separate website with its own privacy practices.</p>
            <p>Authorized operators may access service records when necessary to operate the service, resolve support requests, or meet legal obligations. We may disclose information when legally required.</p>
            <p>For more information, see <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase&apos;s privacy policy</a> and <a href="https://www.etsy.com/legal/privacy/" target="_blank" rel="noopener noreferrer">Etsy&apos;s privacy policy</a>.</p>
          </section>

          <section>
            <h2>6. Retention and removal</h2>
            <p>Account information is retained while your account remains active or is needed for operating the service. Saved listings remain in your watchlist until you remove them or request account deletion.</p>
            <p>Search-cache entries are reusable for 15 minutes. Listing-history cleanup uses a 30-day window, and request counters use a short per-minute window. Cleanup runs during research activity, so those windows describe reuse or cleanup rules rather than an exact physical deletion time.</p>
            <p>Removing an item from your watchlist removes its association with your account. Public listing snapshots and shared cached listing information are separate records and may remain until normal cleanup.</p>
          </section>

          <section>
            <h2>7. Your choices and requests</h2>
            <p>You can remove saved listings in the workspace and sign out whenever you choose. There is currently no account-deletion screen. To request account deletion, a copy of your information, or a correction, contact <a href={`mailto:${email}?subject=${encodeURIComponent('PNG Scout privacy request')}`}>{email}</a> from your registered email address.</p>
            <p>We may ask for information needed to verify ownership. Requests will be handled in accordance with applicable requirements; some information may need to be retained to meet legal obligations or resolve an existing issue.</p>
          </section>

          <section>
            <h2>8. Changes and contact</h2>
            <p>We may update this policy as the service changes. The date above identifies the latest version published here. For questions, visit our <Link href="/contact">contact page</Link> or email <a href={`mailto:${email}`}>{email}</a>.</p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
