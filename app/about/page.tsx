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
      <main id="main" className="public-page container" tabIndex={-1}>
        <header className="page-intro">
          <p className="page-eyebrow">About PNG Scout</p>
          <h1 className="page-title">More clarity for your next creative idea.</h1>
          <p className="page-description">A free research workspace for creators who want to explore public Etsy listings, compare details, and keep useful findings in one place.</p>
        </header>

        <div className="page-grid">
          <section className="info-card">
            <PiBinocularsBold className="info-icon" aria-hidden="true" />
            <h2>Explore with a purpose</h2>
            <p>Search public listings by keyword and review the details Etsy makes available, including prices, tags, images, and favorites. Follow the original listing to check its current details on Etsy.</p>
          </section>
          <section className="info-card">
            <PiBookmarkSimpleBold className="info-icon" aria-hidden="true" />
            <h2>Keep your research organized</h2>
            <p>Create a free account to save up to 100 listings in your private watchlist. Manually refresh saved listings to record price and favorite snapshots for a recent history view.</p>
          </section>
          <section className="info-card">
            <PiShieldCheckBold className="info-icon" aria-hidden="true" />
            <h2>Free access, clear boundaries</h2>
            <p>PNG Scout is a non-commercial project. All available features are free, with no subscription, paid tier, or payment details required. Research uses public listing information rather than buyer or order data.</p>
          </section>
        </div>

        <section className="prose info-card">
          <h2>Useful information, without invented certainty</h2>
          <p>PNG Scout helps you organize observations. Favorites are not sales, and listing details do not establish demand, revenue, or the success of a design. The workspace does not provide verified sales or earnings figures.</p>
          <p>Search results may be cached for 15 minutes. Listing snapshots are recorded when you save or manually refresh a listing; they are not continuous monitoring. Recent history covers up to 30 days of recorded activity.</p>
          <p>Research features depend on the site operator configuring approved Etsy API access, service availability, and request limits. Free account creation does not guarantee that live research is currently available.</p>
        </section>

        <section className="prose info-card">
          <h2>Built to respect the people behind the work</h2>
          <p>Listing images, titles, and designs belong to their respective owners. Use research to inform your own original work and respect creators&apos; intellectual property. Viewing a listing through PNG Scout does not grant permission to copy, download, or resell it.</p>
          <p>PNG Scout is independent of Etsy. Etsy is a trademark of Etsy, Inc.; this application uses Etsy&apos;s API and is not endorsed or certified by Etsy.</p>
          <div className="page-actions">
            <Link className="button button-primary" href="/signup">Create a free account <PiArrowRightBold aria-hidden="true" /></Link>
            <Link className="button button-secondary" href="/contact">Get in touch</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
