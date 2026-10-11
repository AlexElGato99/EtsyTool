import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { getPublicContact } from '../../lib/public-contact';

export const metadata: Metadata = {
  title: 'Terms of Use | PNG Scout',
  description: 'The terms for using PNG Scout, a free, non-commercial tool for researching public Etsy listings.',
};

export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  const { email, operatorName } = await getPublicContact();

  return (
    <>
      <SiteHeader />
      <main id="main" className="public-page container" tabIndex={-1}>
        <header className="page-intro">
          <p className="page-eyebrow">Legal &amp; transparency</p>
          <h1 className="page-title">Terms of use</h1>
          <p className="page-description">Clear expectations for using PNG Scout and respecting the creators whose work you research.</p>
          <p className="page-date">Last updated: October 11, 2026</p>
        </header>

        <article className="prose info-card">
          <section>
            <h2>1. The service and these terms</h2>
            <p>PNG Scout is operated by {operatorName}. These terms apply when you use the website or create an account. Please read them together with our <Link href="/privacy">privacy policy</Link>. If you do not agree, do not create an account or use the workspace.</p>
            <p>PNG Scout helps users research public Etsy listings, organize saved references, and work with their own planning inputs. Optional connections can load your own shop summary, publish a pin you confirm, and send a test email to your account. A separate personal campaign manager uses your own Resend account for consented contacts, drafts, and delivery instructions you confirm. The service does not process marketplace purchases or manage customer orders.</p>
          </section>

          <section>
            <h2>2. Completely free access</h2>
            <p>This is a non-commercial project. Account creation and all available website features are free. There is no paid subscription, paid tier, checkout, or service fee, and no payment details are required.</p>
            <p>Free access is still subject to reasonable usage limits, API availability, and the site operator&apos;s configured access. Live research requires approved Etsy API access and may be unavailable while that access is being configured.</p>
            <p>External providers have their own plans, quotas, and terms. A free Resend plan is available subject to its contact and usage limits. You choose and manage your own provider account; PNG Scout does not purchase or upgrade a plan for you or enable paid overages. Check the provider&apos;s current plan before connecting.</p>
          </section>

          <section>
            <h2>3. Your account</h2>
            <p>Use an email address you control and keep your password private. You are responsible for activity through your account. Email confirmation may be required before you can sign in.</p>
            <p>Connect only external accounts you control and review their requested permissions. Do not provide provider passwords or secret API keys in research inputs or support messages.</p>
            <p>Do not use another person&apos;s account or attempt to access another user&apos;s watchlist. Contact us if you believe your account has been accessed without permission.</p>
          </section>

          <section>
            <h2>4. Responsible use</h2>
            <p>Use the website lawfully and respect other users and creators. Do not bypass usage limits or security controls, scrape or automate requests to the service without permission, interfere with its operation, or use it to infringe another person&apos;s rights.</p>
            <p>Listing images, titles, designs, and other marketplace content remain the property of their respective owners. Access through PNG Scout grants no license to copy, redistribute, download, or resell that content. Develop your own original work and check any permissions you need.</p>
            <p>We may restrict or suspend an account used for abuse or a violation of these terms. You may stop using the service at any time and request account deletion through our <Link href="/contact">contact page</Link>.</p>
          </section>

          <section>
            <h2>5. Data accuracy and feature limits</h2>
            <p>Information is provided for research and may be incomplete, cached, or changed since it was retrieved. Check the original Etsy listing for current information. Favorites are not verified sales, and PNG Scout does not promise demand, revenue, or business results.</p>
            <p>You can save up to 100 listings. Listing history consists of snapshots recorded when a listing is saved or manually refreshed, with a recent 30-day window. It is not automatic or continuous monitoring. Search results may be reused from a 15-minute cache.</p>
            <p>Planning tools calculate from your own assumptions or prepare editable drafts. They do not establish actual profit, predict advertising performance, verify a shop name&apos;s legal availability, determine a statistically significant A/B winner, or certify that a privacy draft meets your legal requirements.</p>
            <p>Features may be updated, interrupted, or unavailable. The service is provided as available, without a guarantee of uninterrupted access or suitability for a particular business decision.</p>
          </section>

          <section>
            <h2>6. Etsy and external services</h2>
            <p>PNG Scout is independently operated. Etsy is a trademark of Etsy, Inc.; this application uses Etsy&apos;s API and is not endorsed or certified by Etsy.</p>
            <p>Links to Etsy and other websites take you to independently operated services. Their own terms and privacy policies apply there. Purchases and seller support belong on Etsy, not in PNG Scout.</p>
            <p>Use of marketplace content must respect applicable rights and <a href="https://www.etsy.com/legal/terms-of-use/" target="_blank" rel="noopener noreferrer">Etsy&apos;s terms</a>. The operator&apos;s API access is subject to <a href="https://www.etsy.com/legal/api/" target="_blank" rel="noopener noreferrer">Etsy&apos;s API terms</a>.</p>
            <p>An authorized Etsy connection reads your own shop and a bounded recent-order summary, not another seller&apos;s private records. The summary excludes buyer personal fields and is not a complete accounting report. Returned totals may include shipping and tax; available processing fees are not every marketplace fee.</p>
            <p>Direct Pinterest publishing requires your connected Etsy listing, a matching listing image, an eligible board, and an explicit confirmation. The public composer can instead open Pinterest for manual review. You are responsible for ensuring that the material you submit is yours to publish.</p>
            <p>The shared Resend email test sends only to your verified signed-in account email after confirmation. The public email composer prepares a draft. Personal campaigns are a separate account feature using your own Resend API key, a sender on your verified domain, and a dedicated contact segment.</p>
            <p>Add only recipients whose permission you have to receive the campaign. You must confirm consent when adding a contact and review the audience, sender, content, and any schedule before confirming a send. Do not import Etsy buyer addresses without separate permission, use purchased or scraped lists, bypass unsubscribe or suppression status, or send deceptive or unlawful messages. Existing provider unsubscribes are preserved; campaign messages include a provider unsubscribe link.</p>
            <p>You are responsible for truthful subjects, sender identification, a valid sender postal address where required, and applicable marketing and privacy requirements. A consent checkbox or draft footer does not establish legal compliance. Campaign state comes from Resend and does not guarantee inbox delivery. PNG Scout supports up to 500 local contact consent records and 50 tracked campaigns per account, with schedules from 5 minutes to 30 days ahead; provider limits also apply.</p>
            <p>Campaigns run only after your send or schedule confirmation. Recurring customer workflows, automatic Etsy order-triggered messages, and campaign engagement reporting are not provided. If a delivery request has an uncertain outcome, refresh its status before attempting another send.</p>
            <p>Disconnect stops use of the local saved authorization. It does not remotely revoke provider grants, delete existing pins, or recall email. Manage remote permissions and published material through the provider&apos;s own account controls.</p>
            <p>Disconnecting a personal sender also leaves Resend-held contacts, drafts, and confirmed schedules in place. Remove memberships or cancel unwanted campaigns before disconnecting, or use Resend&apos;s controls afterward. Cancellation stops eligible future or queued delivery, and cannot recall messages already sent.</p>
          </section>

          <section>
            <h2>7. Your rights and changes to these terms</h2>
            <p>Nothing in these terms removes rights that cannot be waived under applicable law. You remain responsible for evaluating research information before acting on it.</p>
            <p>We may update these terms when the website changes. We will publish the revised version and its date here. Review the current terms before continuing to use the service.</p>
          </section>

          <section>
            <h2>8. Contact</h2>
            <p>For questions about these terms, account support, or a concern about content, email <a href={`mailto:${email}`}>{email}</a> or visit our <Link href="/contact">contact page</Link>.</p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
