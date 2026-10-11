import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { ResourceFrame, BrandDownloads } from '../../components/resource-pages';

export const metadata: Metadata = { title: 'Brand resources | PNG Scout', description: 'Download original PNG Scout SVG brand assets and find the colors and usage guidance for referencing the project.' };

export default function BrandPage() {
  return <><SiteHeader /><ResourceFrame eyebrow="PNG Scout brand resources" title="A clear identity for curious creators." description="Original SVG assets, a simple color palette, and practical guidance for referring to PNG Scout." breadcrumbs={[{ label: 'Brand resources', href: '/brand' }]}>
    <BrandDownloads />
    <article className="rp-prose"><section><h2>Our colors</h2><p>The project uses a light background, a blue-purple accent, and dark ink for clear, readable interfaces.</p><div className="rp-colors">{[{ name: 'Scout blue', color: '#4d50ce' }, { name: 'Deep ink', color: '#1e2440' }, { name: 'Soft purple', color: '#eeefff' }, { name: 'Page white', color: '#ffffff' }].map(color => <div className="rp-swatch" key={color.name}><span style={{ background: color.color }} aria-hidden="true" /><strong>{color.name}</strong><code>{color.color}</code></div>)}</div></section>
      <section><h2>Keep references accurate</h2><p>Use the name PNG Scout and these assets when you refer to the project. Preserve the proportions and keep enough space around the mark for it to remain readable.</p><p>Do not use the assets to imply that PNG Scout endorses another product, that an unrelated website is this service, or that the project is affiliated with Etsy or Pinterest. These downloads contain PNG Scout artwork, not the brand assets of external services.</p><p>For a specific usage question, <Link href="/contact">contact the operator</Link>. Read our <Link href="/etsy-disclaimer">Etsy independence notice</Link> for the relationship between the project and marketplace content.</p></section>
    </article>
  </ResourceFrame><SiteFooter /></>;
}
