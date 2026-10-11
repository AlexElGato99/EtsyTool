import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteHeader, SiteFooter } from '../../../components/site-shell';
import { ResourceFrame, ResourceArticle, ResourceCta } from '../../../components/resource-pages';
import { articles, getResource } from '../../../lib/resources';

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return articles.map(entry => ({ slug: entry.slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = getResource('article', (await params).slug);
  if (!entry) return { title: 'Article not found | PNG Scout' };
  return { title: `${entry.title} | PNG Scout`, description: entry.summary };
}
export default async function BlogArticlePage({ params }: Props) {
  const entry = getResource('article', (await params).slug);
  if (!entry) notFound();
  return <><SiteHeader /><ResourceFrame eyebrow={entry.category} title={entry.title} description={entry.summary} breadcrumbs={[{ label: 'Research journal', href: '/blog' }]}><ResourceArticle entry={entry} /><ResourceCta /></ResourceFrame><SiteFooter /></>;
}
