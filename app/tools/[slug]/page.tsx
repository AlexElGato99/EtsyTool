import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader, SiteFooter } from '../../../components/site-shell';
import { FreeTool } from '../../../components/free-tools';
import { freeTools } from '../../../lib/free-tools';

export function generateStaticParams() { return freeTools.map(tool => ({ slug: tool.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const tool = freeTools.find(item => item.slug === slug);
  return tool ? { title: `${tool.title} — Free | PNG Scout`, description: tool.description } : { title: 'Tool not found | PNG Scout' };
}
export default async function FreeToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const tool = freeTools.find(item => item.slug === slug);
  if (!tool) notFound();
  return <><SiteHeader /><main id="main" className="ft-page container" tabIndex={-1}><header className="ft-intro"><Link className="ft-breadcrumb" href="/tools">← All free tools</Link><h1>{tool.title}</h1><p>{tool.description}</p></header><FreeTool slug={tool.slug} /><p className="ft-related">Discover the rest of your <Link href="/tools">free creator toolkit</Link>.</p></main><SiteFooter /></>;
}
