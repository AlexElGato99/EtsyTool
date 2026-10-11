import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { ResourceFrame, ResourceCollection, ResourceCta } from '../../components/resource-pages';

export const metadata: Metadata = { title: 'Research journal | PNG Scout', description: 'Original practical articles about digital product research, keyword context, saved listings, and original creative work.' };

export default function BlogPage() {
  return <><SiteHeader /><ResourceFrame eyebrow="The research journal" title="A little knowledge. A clearer next step." description="Practical ways to explore public listings, understand the details, and develop your own creative direction." breadcrumbs={[{ label: 'Research journal', href: '/blog' }]}>
    <ResourceCollection kind="article" />
    <p className="rp-free-note">Looking for instructions? Visit the <Link href="/help" className="text-link">Help center</Link>.</p>
    <ResourceCta />
  </ResourceFrame><SiteFooter /></>;
}
