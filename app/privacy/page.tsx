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
            <p>PNG Scout is a free, non-commercial research and planning tool operated by {operatorName}. For questions about this policy or your personal information, email <a href={`mailto:${email}`}>{email}</a>.</p>
            <p>This policy covers PNG Scout. Etsy and our service providers have their own policies for their services.</p>
          </section>

          <section>
            <h2>2. Information we process</h2>
            <ul>
              <li><strong>Account information.</strong> Your registration email, account identifier, and authentication records are processed through Supabase Auth. Your password is sent to the server and Supabase for authentication; Supabase stores a password hash rather than a readable password.</li>
              <li><strong>Workspace information.</strong> We store the public listings you save, the account identifier associated with your watchlist, and recorded listing snapshots. Your watchlist is available through your signed-in account and is not published as a public profile.</li>
              <li><strong>Research activity.</strong> Search terms and returned public listing data are stored in a shared search cache. Short-lived request counters associated with your account help enforce usage limits.</li>
              <li><strong>Optional connections.</strong> If you connect Etsy or Pinterest, the service stores encrypted authorization tokens, granted permissions, a connection label, provider account identifiers where needed, and connection time. Shared email testing records that you enabled the feature and stores request-count and timing information to enforce limits.</li>
              <li><strong>Personal email campaigns.</strong> If you connect your own Resend account, we store encrypted sender credentials and settings, a dedicated segment identifier, contact consent records including email addresses and confirmation times, and tracked campaign records including names, subjects, message text, status, and provider identifiers. These records are associated with your account. Adding or removing a contact, saving a draft, refreshing its state, or confirming delivery sends the required information to your Resend account. Resend also holds contact details, subscription status, and campaign content. Your API key is not returned to the browser.</li>
              <li><strong>Connected shop information.</strong> If you authorize Etsy, the server can request your own shop and a bounded set of receipts from the last 30 days. It returns a recent order and totals summary. Buyer personal fields that may be present in the provider response are excluded from the displayed summary and are not stored in the research database.</li>
              <li><strong>Browser tool information.</strong> Public calculators, checklists, and draft editors use inputs in page memory. Followup reminders store order references, dates, notes, and completion state in this browser&apos;s local storage; they are not synchronized to your account. Avoid entering buyer personal information into reminders.</li>
              <li><strong>Support correspondence.</strong> If you email us, we receive your email address and the information you include so we can respond and handle your request.</li>
              <li><strong>Technical information.</strong> Hosting and authentication providers may process request details, such as IP addresses and technical logs, to deliver and protect their services.</li>
            </ul>
            <p>Public listing research does not request access to your private orders. An optional own-shop connection is a separate authorization that you choose. PNG Scout does not request your Etsy or Pinterest account password, operate buyer checkout, or collect a payment method for the service.</p>
          </section>

          <section>
            <h2>3. How we use information</h2>
            <p>We use account information to authenticate you, keep watchlists associated with the correct account, and provide support. Cached research data and request counters help serve searches, manage API limits, and reduce repeated requests.</p>
            <p>Connected-service information is used for the actions you select: loading your own shop summary, obtaining eligible Pinterest boards, publishing a confirmed pin for your own listing, or sending a confirmed email test to yourself. Personal campaign information supports your own contact segment, editable drafts, and sends or schedules you explicitly confirm. Consent records document the sender&apos;s confirmation; they do not independently prove that a recipient opted in. Connection tokens and provider API secrets are encrypted on the server and are not returned to the browser.</p>
            <p>PNG Scout does not sell personal information or use it for targeted advertising. We do not add advertising trackers or analytics tracking scripts to the website.</p>
          </section>

          <section>
            <h2>4. Essential cookies</h2>
            <p>Signing in stores two essential first-party cookies: <code>scout_access</code> and <code>scout_refresh</code>. These contain authentication tokens so the server can recognize and renew your session.</p>
            <p>The access cookie has a browser lifetime of up to 7 days and the refresh cookie up to 30 days from when they are set or renewed. Token validity is also controlled by Supabase, so a cookie&apos;s lifetime does not guarantee an active session.</p>
            <p>These cookies are HttpOnly, use SameSite=Lax, and use the Secure flag in production. Signing out clears the app&apos;s session cookies. Blocking them prevents account features from working.</p>
            <p>Starting an Etsy or Pinterest authorization flow also sets an essential, encrypted OAuth-state cookie for that provider. Its validity is up to 10 minutes. The callback or Disconnect action clears it, and single-use server state helps verify the return from the provider.</p>
          </section>

          <section>
            <h2>5. Service providers and external actions</h2>
            <p>Supabase provides authentication and database services. Hosting infrastructure processes the requests needed to serve the website. Providers process information needed for their roles; their processing may take place in locations determined by the deployment and their own policies.</p>
            <p>Search terms and requested listing identifiers are sent to Etsy&apos;s API to obtain public listing information. Listing images may load from Etsy&apos;s image infrastructure. Visiting a listing on Etsy takes you to a separate website with its own privacy practices.</p>
            <p>With your authorization, Etsy provides your own-shop information for its summary. When you confirm direct Pinterest publishing, the selected board, pin text, own-listing link, and matching image URL are sent to Pinterest. The separate public Pinterest composer passes entered URLs and caption to Pinterest when you choose its manual share action.</p>
            <p>A confirmed email test sends its subject, message, and your verified signed-in account email to Resend using the operator&apos;s configured sender. The server verifies that address and limits the recipient to it. Customer campaign sending, subscriber collection, and automatic marketing followups are not provided by this test feature.</p>
            <p>The separate personal campaign manager uses your own Resend credentials and sender. Selected contact details, segment membership changes, draft content, and confirmed send or schedule instructions are sent to Resend. Campaigns include Resend&apos;s unsubscribe link; the provider handles subscription and suppression status, queuing, and any schedule you confirm. Provider delivery or engagement records may be processed according to your Resend settings and policies. PNG Scout does not import Etsy buyer emails or automatically start campaigns from shop activity.</p>
            <p>Authorized operators may access service records when necessary to operate the service, resolve support requests, or meet legal obligations. We may disclose information when legally required.</p>
            <p>For more information, see the privacy policies of <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase</a>, <a href="https://www.etsy.com/legal/privacy/" target="_blank" rel="noopener noreferrer">Etsy</a>, <a href="https://policy.pinterest.com/en/privacy-policy" target="_blank" rel="noopener noreferrer">Pinterest</a>, and <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Resend</a>.</p>
          </section>

          <section>
            <h2>6. Retention and removal</h2>
            <p>Account information is retained while your account remains active or is needed for operating the service. Saved listings remain in your watchlist until you remove them or request account deletion.</p>
            <p>Search-cache entries are reusable for 15 minutes. Listing-history cleanup uses a 30-day window, and request counters use a short per-minute window. Cleanup runs during research activity, so those windows describe reuse or cleanup rules rather than an exact physical deletion time.</p>
            <p>Removing an item from your watchlist removes its association with your account. Public listing snapshots and shared cached listing information are separate records and may remain until normal cleanup.</p>
            <p>Disconnect removes the locally stored authorization tokens and pending connection state for that provider. Minimal connection revision or usage-counter records may remain for operation and abuse prevention. Disconnect does not revoke the provider&apos;s remote grant, delete published pins, or recall delivered emails; use the provider&apos;s own controls for those actions.</p>
            <p>Local campaign records remain while your sender is connected. Removing a segment member retains a local consent record with its removal time. Deleting an eligible draft removes its local tracked campaign record. Disconnecting a personal campaign sender clears the encrypted local sender, consent, and campaign records. Contacts, unsubscribe or suppression records, drafts, and scheduled deliveries in Resend remain under your provider account&apos;s controls and retention rules. Remove unwanted segment memberships or cancel scheduled campaigns before disconnecting, or manage them in Resend afterward. Removing membership does not delete a global Resend contact; cancellation cannot recall mail already sent.</p>
            <p>Local reminders remain in this browser until you delete them in the tool or clear the website&apos;s browser storage. Downloaded drafts and exported calendar entries remain wherever you saved them and must be removed there. Unsaved page-memory drafts can be cleared by leaving or reloading the page.</p>
          </section>

          <section>
            <h2>7. Your choices and requests</h2>
            <p>You can remove saved listings, disconnect optional services, remove campaign segment members, cancel eligible campaigns, delete local reminders, and sign out whenever you choose. You can also revoke app permissions through your Etsy or Pinterest account settings and revoke a personal Resend API key in your Resend account. There is currently no account-deletion screen. To request account deletion, a copy of your information, or a correction, contact <a href={`mailto:${email}?subject=${encodeURIComponent('PNG Scout privacy request')}`}>{email}</a> from your registered email address and identify any connected-service information you want included in the request. Provider-held campaign information must also be managed through the relevant Resend account.</p>
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
