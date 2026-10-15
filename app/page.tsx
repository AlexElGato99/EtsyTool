import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '../components/site-shell';
import { SiteIcon } from '../components/site-icon';
import { HeroWorkspace, ProductTour } from '../components/product-tour';
import { features, featureGroups } from '../lib/site-content';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'podadd — Prepare your own listings',
  description: 'Free listing preparation and manual shop tools. Check your own copy, plan costs, and keep private drafts.',
};
const groups = {
  Prepare: { label: 'PUT YOUR ORIGINAL WORK INTO WORDS', title: 'Prepare your own listings', description: 'Check your own copy and keep useful drafts for your next edit.' },
  Plan: { label: 'START WITH NUMBERS YOU KNOW', title: 'Plan your own costs', description: 'Use your price, costs, and assumptions in clear, editable calculations.' },
  Organize: { label: 'KEEP THE SMALL DETAILS TOGETHER', title: 'Organize your next step', description: 'Prepare shop documents, write local drafts, and keep your own task notes.' },
};

export default function HomePage() {
  return <><SiteHeader /><main id="main" tabIndex={-1}>
    <section className="mk-hero"><div className="container mk-hero-grid">
      <div className="mk-hero-copy">
        <span className="mk-pill"><SiteIcon name="compass" />Free tools for your own shop</span>
        <h1>Your original work.<br /><span>Clearly prepared.</span></h1>
        <p>Prepare your own listing copy, understand your costs, and keep the next step organized. Practical tools built around information you enter.</p>
        <div className="mk-actions"><a className="button" href="/tools/listing-helper">Prepare a listing<SiteIcon name="arrow" /></a><a className="button button-secondary" href="/tools">Explore the tools<SiteIcon name="browser" /></a></div>
      </div>
      <HeroWorkspace />
    </div></section>
    <section className="mk-section container">
      <div className="mk-section-heading"><span className="section-label">THE PODADD TOOLKIT</span><h2>A clearer process<br />for your own listings.</h2><p>Start with your words and your numbers. Use a public tool, or create a free account to keep your manual drafts.</p></div>
      <ProductTour />
    </section>
    {featureGroups.map(group => <section className="mk-category-section" id={'category-' + group.toLowerCase()} key={group}><div className="container">
      <div className="mk-category-heading"><div><span className="section-label">{groups[group].label}</span><h2>{groups[group].title}</h2></div><p>{groups[group].description}</p></div>
      <div className="mk-feature-links">{features.filter(feature => feature.category === group).map(feature => <a className="mk-feature-link" key={feature.slug} href={feature.href}>
        <span><SiteIcon name={feature.icon} /></span><h3>{feature.title}</h3><p>{feature.description}</p><div className="mk-link-label">{feature.action}<SiteIcon name="arrow" /></div>
      </a>)}</div>
    </div></section>)}
    <section className="container mk-section">
      <div className="mk-section-heading"><span className="section-label">BUILT AROUND YOUR OWN WORK</span><h2>Your words. Your process.</h2><p>Write from what you know about your product. Our editors and planners work with the information you enter, and your private drafts stay ready for your next edit.</p></div>
      <div className="mk-actions" style={{ justifyContent: 'center' }}><a className="button button-secondary" href="/about">How podadd works<SiteIcon name="arrow" /></a></div>
      <p style={{ textAlign: 'center', marginTop: 20 }}>When approved Etsy access is available, review your own current listing text, tags, and price as a temporary reference for your next edit. Your manual drafts stay separate, and publishing stays in Etsy.</p>
    </section>
    <section className="container" id="free-access"><div className="mk-cta"><h2>Your next draft can start here.</h2><p>Every available tool and account is free. No subscriptions or payment details. Save the text you write, or use a public tool straight away.</p><div className="mk-actions"><a className="button" href="/signup">Create a free account<SiteIcon name="arrow" /></a><a className="button button-secondary" href="/tools">Use a public tool</a></div></div></section>
  </main><SiteFooter /></>;
}
