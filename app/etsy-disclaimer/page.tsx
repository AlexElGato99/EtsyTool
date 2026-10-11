import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { ResourceFrame } from '../../components/resource-pages';

export const metadata: Metadata = { title: 'Etsy independence & content rights | PNG Scout', description: 'Understand PNG Scout’s independent status, marketplace content rights, public research data, and its limits.' };

export default function EtsyDisclaimerPage() {
  return <><SiteHeader /><ResourceFrame eyebrow="Independence & transparency" title="Our tool. Their marketplace. Your original work." description="How PNG Scout relates to Etsy, the public information it displays, and the creators behind the listings." breadcrumbs={[{ label: 'Etsy disclaimer', href: '/etsy-disclaimer' }]}>
    <article className="rp-prose">
      <section><h2>An independently operated project</h2><p>PNG Scout is independent of Etsy, Inc. Etsy is a trademark of Etsy, Inc. The application uses Etsy&apos;s API when access is authorized and available; it is not endorsed, certified, or sponsored by Etsy.</p><p>Using Etsy&apos;s name to describe a data source does not make the project an Etsy product or demonstrate that a particular application use has been approved. Access and permissions are governed by <a href="https://www.etsy.com/legal/api/" target="_blank" rel="noopener noreferrer">Etsy&apos;s current API terms</a>.</p></section>
      <section><h2>Creators keep the rights to their content</h2><p>Listing images, product designs, titles, and other marketplace content belong to their respective owners. Viewing them in PNG Scout does not grant a license to copy, download, redistribute, or resell them.</p><p>Use research to develop your own original work. If you need to reuse an asset, obtain the appropriate permission from its rights holder. PNG Scout does not decide whether your intended use is permitted.</p></section>
      <section><h2>Research information has limits</h2><p>Public listing details are observations, not verified sales, search demand, or a business forecast. A favorite is not a confirmed purchase, and a matching listing count describes returned supply rather than buyer searches.</p><p>Searches may be cached for 15 minutes. Saved-listing snapshots are recorded manually and are not continuous monitoring. Follow the original Etsy listing to check current details before relying on a stored reference.</p></section>
      <section><h2>Purchases stay on Etsy</h2><p>PNG Scout does not sell the products shown in research results, operate an Etsy checkout, or handle purchases, refunds, or seller disputes. Use the original listing and Etsy&apos;s own channels for those matters.</p><p>For questions about PNG Scout or a concern about how content appears here, visit <Link href="/contact">Contact</Link>. For instructions on the workspace, visit the <Link href="/help">Help center</Link>.</p></section>
    </article>
  </ResourceFrame><SiteFooter /></>;
}
