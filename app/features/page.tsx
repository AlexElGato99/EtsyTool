import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { SiteIcon } from '../../components/site-icon';
import { features, featureGroups } from '../../lib/site-content';
export const metadata: Metadata = { title: 'Explore the free toolkit | PNG Scout', description: 'Explore PNG Scout product research, keyword research, listing tools, finance planning, and marketing drafts. All available tools are free.' };
export default function FeaturesPage() {
  return <><SiteHeader /><main id="main" className="container mk-feature-index" tabIndex={-1}><div className="mk-section-heading"><span className="mk-pill">YOUR FREE CREATOR TOOLKIT</span><h1>A useful tool for<br />every next step.</h1><p>Explore the research workspace, practical planning tools, and connected account features.</p></div>{featureGroups.map(group => <section key={group}><h2>{group === 'Research' ? 'Research your next idea' : group === 'Manage' ? 'Refine your shop' : 'Plan your marketing'}</h2><div className="mk-feature-links">{features.filter(feature => feature.category === group).map(feature => <a className="mk-feature-link" key={feature.slug} href={'/features/' + feature.slug}><span><SiteIcon name={feature.icon} /></span><h3>{feature.title}</h3><p>{feature.description}</p><div className="mk-link-label">Explore feature <SiteIcon name="arrow" /></div></a>)}</div></section>)}</main><SiteFooter /></>;
}
