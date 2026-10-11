import type { Metadata } from 'next';
import Link from 'next/link';
import { PiArrowRightBold, PiBinocularsBold, PiBookmarkSimpleBold, PiShieldCheckBold } from 'react-icons/pi';
import { SiteHeader, SiteFooter } from '../../components/site-shell';

export const metadata: Metadata = {
  title: 'About | PNG Scout',
  description: 'Learn how PNG Scout helps creators explore public Etsy listings and organize their research for free.',
};

export const dynamic = 'force-dynamic';

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="public-page container centered-page about-page" tabIndex={-1}>
        <header className="page-intro centered-intro">
          <p className="page-eyebrow">About PNG Scout</p>
          <h1 className="page-title">More clarity for your next creative idea.</h1>
          <p className="page-description">A free research workspace for creators who want to explore public Etsy listings, compare details, and keep useful findings in one place.</p>
        </header>

        <section className="centered-card-row" aria-label="What PNG Scout offers">
          <article className="info-card centered-card">
            <PiBinocularsBold className="info-icon" aria-hidden="true" />
            <h2>Explore with purpose</h2>
            <p>Discover public Etsy listings and compare available prices, tags, images, and favorites. Open the original listing to check its current details.</p>
          </article>
          <article className="info-card centered-card">
            <PiBookmarkSimpleBold className="info-icon" aria-hidden="true" />
            <h2>Organize your research</h2>
            <p>Save up to 100 listings in a private watchlist. Manually refresh them to record price and favorite snapshots, with up to 30 days of recent history.</p>
          </article>
          <article className="info-card centered-card">
            <PiShieldCheckBold className="info-icon" aria-hidden="true" />
            <h2>Completely free</h2>
            <p>PNG Scout is a non-commercial project. Every available feature is free, with no subscriptions, paid plans, or payment details required.</p>
          </article>
        </section>

        <section className="about-note" aria-labelledby="about-note-title">
          <h2 id="about-note-title">Research with clarity and respect.</h2>
          <p>We use public listing information, never buyer or order data. Favorites are not sales, and PNG Scout does not provide verified sales or earnings figures. Search results may be cached for 15 minutes; history records saved or manually refreshed snapshots, not continuous monitoring.</p>
          <p>Live research depends on approved Etsy API access, service availability, and request limits. Creating an account does not guarantee live research availability. Listing content belongs to its owners; use it to inform original work, with no permission to copy, download, or resell it.</p>
          <p>PNG Scout is independent of Etsy. Etsy is a trademark of Etsy, Inc.; this application uses Etsy&apos;s API and is not endorsed or certified by Etsy. Read our <Link href="/terms">Terms of use</Link> and <Link href="/privacy">Privacy policy</Link>.</p>
        </section>

        <div className="page-actions">
          <Link className="button button-primary" href="/signup">Create a free account <PiArrowRightBold aria-hidden="true" /></Link>
          <Link className="button button-secondary" href="/contact">Get in touch</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
