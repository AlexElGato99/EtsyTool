import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { ResourceFrame, ResourceLinks } from '../../components/resource-pages';
import { SiteIcon } from '../../components/site-icon';

export const metadata: Metadata = { title: 'Etsy developer resources | PNG Scout', description: 'Find official Etsy developer documentation and understand how PNG Scout uses its configured public listing connection.' };

export default function EtsyDocsPage() {
  return <><SiteHeader /><ResourceFrame eyebrow="Official source links" title="Etsy documentation, in the right place." description="A starting point for the official developer resources behind the service’s public listing connection." breadcrumbs={[{ label: 'Etsy documentation', href: '/etsy-docs' }]}>
    <div className="rp-prose"><section><h2>For users and site operators</h2><p>Regular PNG Scout users sign in with a PNG Scout account. You do not need to create an Etsy developer application, provide an Etsy API key, or share your Etsy password to use the available workspace features.</p><p>The operator configures the service&apos;s approved Etsy API connection. Availability depends on that access and the permissions Etsy grants. This page links to Etsy&apos;s own documentation; it does not state that PNG Scout is approved or certified by Etsy.</p></section></div>
    <ResourceLinks items={[
      { title: 'Open API reference', description: 'Review Etsy’s documented endpoints, parameters, response fields, and authorization requirements.', href: 'https://developers.etsy.com/documentation/reference/', external: true, icon: 'file' },
      { title: 'Request standards', description: 'Read the official requirements for HTTPS requests and application credentials.', href: 'https://developers.etsy.com/documentation/essentials/requests/', external: true, icon: 'info' },
      { title: 'Authentication', description: 'Understand application API keys and OAuth authorization for endpoints that require user permissions.', href: 'https://developers.etsy.com/documentation/essentials/authentication/', external: true, icon: 'lock' },
      { title: 'Rate limits', description: 'See how Etsy describes API quotas and its response headers.', href: 'https://developers.etsy.com/documentation/essentials/rate-limits/', external: true, icon: 'history' },
      { title: 'API terms of use', description: 'Read Etsy’s rules for application access, marketplace content, and API use.', href: 'https://www.etsy.com/legal/api/', external: true, icon: 'file' },
      { title: 'Trademark policy', description: 'Check Etsy’s requirements for its name and brand assets.', href: 'https://www.etsy.com/legal/trademarks/', external: true, icon: 'info' },
    ]} />
    <section className="rp-cta"><div><h2>Looking for PNG Scout&apos;s own endpoints?</h2><p>The application reference describes the same-origin requests used by this workspace.</p></div><Link className="rp-button" href="/api-docs">View app API docs <SiteIcon name="arrow" /></Link></section>
  </ResourceFrame><SiteFooter /></>;
}
