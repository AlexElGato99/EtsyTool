import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { ResourceFrame, ResourceCollection } from '../../components/resource-pages';
import { SiteIcon } from '../../components/site-icon';

export const metadata: Metadata = { title: 'Help center | PNG Scout', description: 'Get help with your free account, listing searches, keywords, saved listings, exports, and research limits.' };

export default function HelpPage() {
  return <><SiteHeader /><ResourceFrame eyebrow="PNG Scout help center" title="Find your way. Keep your focus." description="Straightforward answers about the workspace, from your first search to the details behind a saved listing." breadcrumbs={[{ label: 'Help center', href: '/help' }]}>
    <ResourceCollection kind="guide" />
    <section className="rp-cta"><div><h2>Still need a hand?</h2><p>Send the operator a description of your question or the error you see.</p></div><Link className="rp-button" href="/contact">Contact PNG Scout <SiteIcon name="arrow" /></Link></section>
  </ResourceFrame><SiteFooter /></>;
}
