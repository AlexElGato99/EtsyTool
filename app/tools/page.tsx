import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { SiteIcon } from '../../components/site-icon';
import { freeTools } from '../../lib/free-tools';
import '../../components/free-tools.css';

export const metadata: Metadata = { title: 'Free manual shop tools | podadd', description: 'Free manual tools for your own listing copy, fee estimates, cost planning, shop documents, and local tasks.' };

export default function ToolsPage() {
  return <><SiteHeader /><main id="main" className="ft-page container" tabIndex={-1}><header className="ft-intro"><span className="ft-eyebrow">A practical creator toolkit</span><h1>Useful tools.<br />Completely free.</h1><p>Use your own numbers, prepare your own content, and keep local tasks organized. Use every tool without an account. Your inputs stay in your browser.</p></header><section className="ft-catalog" aria-label="Free tools">{freeTools.map(tool => <article className="ft-tool-card" key={tool.slug}><SiteIcon name={tool.icon} /><h2>{tool.title}</h2><p>{tool.description}</p><Link href={'/tools/' + tool.slug}>Open free tool <SiteIcon name="arrow" /></Link></article>)}</section><p className="ft-related">Want to keep your own manual drafts? <Link href="/signup">Create a free draft account</Link>.</p></main><SiteFooter /></>;
}
