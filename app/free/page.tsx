import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { SiteIcon } from '../../components/site-icon';
import { ResourceFrame, ResourceLinks } from '../../components/resource-pages';

export const metadata: Metadata = { title: 'Completely free tools | PNG Scout', description: 'PNG Scout is a non-commercial project. All available tools and account features are free, with no paid plans, checkout, or payment details.' };

export default function FreePage() {
  return <><SiteHeader /><ResourceFrame eyebrow="Free by design" title="Useful tools. Open access. No checkout." description="PNG Scout is a non-commercial project. Every available website tool and account feature is free to use." breadcrumbs={[{ label: 'Free access', href: '/free' }]}>
    <article className="rp-prose"><section><h2>One free experience</h2><ul className="rp-check-list"><li><SiteIcon name="check" /><span>No paid plans or subscriptions.</span></li><li><SiteIcon name="check" /><span>No credit card, checkout, or service fees.</span></li><li><SiteIcon name="check" /><span>Free account creation and access to the available workspace features.</span></li><li><SiteIcon name="check" /><span>Public planning tools and learning resources you can explore immediately.</span></li></ul><div className="rp-note"><SiteIcon name="info" /><p>Free access still has practical limits. Live research depends on configured, approved provider access and API quotas. Optional external services have their own eligibility and usage limits.</p></div><Link className="rp-button" href="/signup">Create your free account <SiteIcon name="arrow" /></Link></section></article>
    <section className="rp-free-tools" aria-label="Explore free resources"><ResourceLinks items={[
      { title: 'Research workspace', description: 'Explore public listings, investigate keywords, and organize your private saved collection.', href: '/workspace', icon: 'search' },
      { title: 'Practical planning tools', description: 'Work on your own listing copy, budgets, drafts, and creative planning with browser-based tools.', href: '/tools', icon: 'file' },
      { title: 'Research journal', description: 'Read original practical articles about product research and informed creative decisions.', href: '/blog', icon: 'bookmark' },
      { title: 'Help center', description: 'Understand the workspace, data, and limits before getting started.', href: '/help', icon: 'info' },
    ]} /></section>
    <div className="rp-prose"><section><h2>Clear expectations</h2><p>Saved collections support up to 100 listings per account. Manual listing snapshots use a recent 30-day history window. Research requests have reasonable rate limits, and searches may use a 15-minute cache.</p><p>Public planning tools use the information you enter. Calculations, drafts, and checklists do not guarantee marketplace results or replace a review of your own circumstances.</p><p>For the details, read our <Link href="/terms">Terms of Use</Link> and <Link href="/privacy">Privacy Policy</Link>. If you need help, <Link href="/contact">contact the operator</Link>.</p></section></div>
  </ResourceFrame><SiteFooter /></>;
}
