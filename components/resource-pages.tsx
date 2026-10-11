'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { SiteIcon } from './site-icon';
import { articles, guides, resourceHref, brandIconSvg, brandWordmarkSvg, svgDownload, type ResourceEntry } from '../lib/resources';
import './resource-pages.css';

type Breadcrumb = { label: string; href: string };
export function ResourceFrame({ eyebrow, title, description, children, breadcrumbs = [] }: {
  eyebrow: string; title: string; description: string; children: ReactNode; breadcrumbs?: Breadcrumb[];
}) {
  return <main id="main" className="rp-page" tabIndex={-1}>
    <div className="container">
      {breadcrumbs.length > 0 && <nav className="rp-breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link>{breadcrumbs.map(item => <span key={item.href}><span aria-hidden="true">/</span><Link href={item.href}>{item.label}</Link></span>)}</nav>}
      <header className="rp-intro"><p className="rp-eyebrow">{eyebrow}</p><h1 className="rp-title">{title}</h1><p className="rp-description">{description}</p></header>
      {children}
    </div>
  </main>;
}

export function ResourceCollection({ kind }: { kind: ResourceEntry['kind'] }) {
  const entries = kind === 'article' ? articles : guides;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All topics');
  const categories = ['All topics', ...new Set(entries.map(entry => entry.category))];
  const results = useMemo(() => {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return entries.filter(entry => {
      const text = [entry.title, entry.summary, entry.category, ...entry.sections.flatMap(section => [section.title, ...section.paragraphs, ...(section.items || [])])].join(' ').toLocaleLowerCase();
      return (category === 'All topics' || entry.category === category) && words.every(word => text.includes(word));
    });
  }, [entries, query, category]);
  function reset() { setQuery(''); setCategory('All topics'); }
  return <>
    <div className="rp-toolbar">
      <label className="rp-search" htmlFor={`rp-search-${kind}`}><SiteIcon name="search" /><span className="sr-only">Search {kind === 'article' ? 'articles' : 'help guides'}</span><input id={`rp-search-${kind}`} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={kind === 'article' ? 'Search research articles…' : 'Search for a question or topic…'} /></label>
      <div className="rp-categories" aria-label="Filter resources by topic">{categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
    </div>
    <div className="rp-results-heading"><p role="status">{results.length} {kind === 'article' ? 'article' : 'guide'}{results.length === 1 ? '' : 's'}{category !== 'All topics' ? ` in ${category}` : ''}{query.trim() ? ` matching “${query.trim()}”` : ''}</p>{(query || category !== 'All topics') && <button className="rp-reset" type="button" onClick={reset}>Clear filters</button>}</div>
    {results.length ? <div className="rp-resource-grid">{results.map(entry => <Link className="rp-resource-card" href={resourceHref(entry)} key={entry.slug}>
      <div className={`rp-card-visual rp-card-${entry.icon}`} aria-hidden="true"><span className="rp-visual-circle"><SiteIcon name={entry.icon} /></span><span className="rp-visual-line" /><span className="rp-visual-line rp-line-short" /></div>
      <div className="rp-card-content"><span className="rp-card-category">{entry.category}</span><h2>{entry.title}</h2><p>{entry.summary}</p><span className="rp-card-link">{kind === 'article' ? 'Read article' : 'Read guide'} <SiteIcon name="arrow" /></span></div>
    </Link>)}</div> : <div className="rp-empty"><SiteIcon name="search" /><h2>No matching resources</h2><p>Try a broader phrase or choose another topic.</p><button className="rp-button rp-button-secondary" onClick={reset} type="button">Show all resources</button></div>}
  </>;
}

const linkLabels: Record<string, string> = {
  '/workspace': 'Open the workspace', '/signup': 'Create a free account', '/login': 'Sign in', '/contact': 'Contact PNG Scout',
  '/privacy': 'Privacy policy', '/api-docs': 'App API documentation', '/etsy-disclaimer': 'Etsy independence & content rights',
  '/workspace?section=connections': 'Open Connections', '/tools': 'Explore free planning tools', '/free': 'Free access explained',
};
function relatedLabel(href: string) {
  return [...articles, ...guides].find(entry => resourceHref(entry) === href)?.title || linkLabels[href] || 'Explore PNG Scout';
}

export function ResourceArticle({ entry }: { entry: ResourceEntry }) {
  return <div className="rp-article-layout">
    <aside className="rp-on-this-page"><h2>In this {entry.kind === 'article' ? 'article' : 'guide'}</h2><nav aria-label="On this page">{entry.sections.map(section => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}</nav><span className="rp-reading-note"><SiteIcon name="info" /> Written for the current PNG Scout workspace.</span></aside>
    <article className="rp-article">
      {entry.sections.map(section => <section id={section.id} key={section.id}><h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.items && <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>}{section.note && <div className="rp-note"><SiteIcon name="info" /><p>{section.note}</p></div>}</section>)}
      <div className="rp-related"><h2>Keep exploring</h2><div>{entry.related.map(href => <Link href={href} key={href}>{relatedLabel(href)}<SiteIcon name="arrow" /></Link>)}</div></div>
    </article>
  </div>;
}

export function ResourceCta({ title = 'Put your research into practice.', description = 'Create a free account and explore the tools in your own workspace.' }: { title?: string; description?: string }) {
  return <section className="rp-cta"><div><h2>{title}</h2><p>{description}</p></div><Link className="rp-button" href="/signup">Create a free account <SiteIcon name="arrow" /></Link></section>;
}

export function ResourceLinks({ items }: { items: { title: string; description: string; href: string; external?: boolean; icon?: ResourceEntry['icon'] }[] }) {
  return <div className="rp-link-grid">{items.map(item => <a className="rp-link-card" key={item.href} href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined}>
    <span className="rp-link-icon"><SiteIcon name={item.icon || 'file'} /></span><h2>{item.title}</h2><p>{item.description}</p><span className="rp-card-link">{item.external ? 'Open official documentation' : 'Explore'}<SiteIcon name="arrow" />{item.external && <span className="sr-only"> (opens in a new tab)</span>}</span>
  </a>)}</div>;
}

export function BrandDownloads() {
  const assets = [
    { title: 'Compass icon', description: 'An original SVG symbol with a transparent outer canvas. Suitable for square placements.', svg: brandIconSvg, filename: 'png-scout-icon.svg', className: 'rp-brand-icon' },
    { title: 'PNG Scout wordmark', description: 'The original compass symbol and name on a transparent background. Text uses Arial with system fallbacks.', svg: brandWordmarkSvg, filename: 'png-scout-wordmark.svg', className: 'rp-brand-wordmark' },
  ];
  return <div className="rp-brand-downloads">{assets.map(asset => <section className="rp-brand-card" key={asset.filename}><div className={`rp-brand-preview ${asset.className}`}><img src={svgDownload(asset.svg)} alt={asset.title} width={asset.className === 'rp-brand-icon' ? 160 : 480} height={asset.className === 'rp-brand-icon' ? 160 : 120} /></div><h2>{asset.title}</h2><p>{asset.description}</p><a className="rp-button rp-button-secondary" href={svgDownload(asset.svg)} download={asset.filename}>Download SVG <SiteIcon name="file" /></a></section>)}</div>;
}
