import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteHeader, SiteFooter } from '../../../components/site-shell';
import { ResourceFrame, ResourceArticle } from '../../../components/resource-pages';
import { guides, getResource } from '../../../lib/resources';

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return guides.map(entry => ({ slug: entry.slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = getResource('guide', (await params).slug);
  if (!entry) return { title: 'Guide not found | PNG Scout' };
  return { title: `${entry.title} | PNG Scout Help` , description: entry.summary };
}
export default async function HelpGuidePage({ params }: Props) {
  const entry = getResource('guide', (await params).slug);
  if (!entry) notFound();
  return <><SiteHeader /><ResourceFrame eyebrow={`Help center / ${entry.category}`} title={entry.title} description={entry.summary} breadcrumbs={[{ label: 'Help center', href: '/help' }]}><ResourceArticle entry={entry} /></ResourceFrame><SiteFooter /></>;
}
