'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PiListBold, PiXBold } from 'react-icons/pi';
import { BrandMark, SiteIcon } from './site-icon';
import { features, featureGroups } from '../lib/site-content';
import './marketing.css';
type Menu = 'features' | 'resources' | 'tools';
const resources = [
  { href: '/blog', title: 'Seller guides', description: 'Practical ideas for your next step', icon: 'book' },
  { href: '/discover', title: 'Product discovery', description: 'Choose a starting theme to research', icon: 'search' },
  { href: '/help', title: 'Help center', description: 'Get comfortable with the workspace', icon: 'info' },
  { href: '/etsy-docs', title: 'Etsy documentation', description: 'Understand the official data source', icon: 'file' },
  { href: '/api-docs', title: 'API documentation', description: 'See how PNG Scout uses its endpoints', icon: 'browser' },
  { href: '/about', title: 'About PNG Scout', description: 'Our purpose and approach', icon: 'compass' },
  { href: '/contact', title: 'Contact us', description: 'Get in touch with the operator', icon: 'email' },
  { href: '/community', title: 'Share PNG Scout', description: 'Introduce another creator to the toolkit', icon: 'heart' },
] as const;
export function SiteNavigation() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [mobile, setMobile] = useState(false);
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => { setMenu(null); setMobile(false); }, [pathname]);
  useEffect(() => {
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) { setMenu(null); setMobile(false); } }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape' && (menu || mobile)) { if (menu) { root.current?.querySelector<HTMLButtonElement>(`[aria-controls="nav-${menu}"]`)?.focus(); setMenu(null); } else { setMobile(false); trigger.current?.focus(); } } }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [menu, mobile]);
  function toggle(next: Menu) { setMenu(current => current === next ? null : next); }
  return <><a className="skip-link" href="#main">Skip to content</a><header ref={root} className="site-header mk-header"><div className="container mk-header-inner">
    <a className="brand" href="/" aria-label="PNG Scout home"><BrandMark /></a>
    <button ref={trigger} className="mk-menu-toggle" type="button" aria-label={mobile ? 'Close navigation' : 'Open navigation'} aria-expanded={mobile} aria-controls="public-navigation" onClick={() => { setMobile(!mobile); setMenu(null); }}>{mobile ? <PiXBold /> : <PiListBold />}</button>
    <div id="public-navigation" className={`mk-navigation${mobile ? ' is-open' : ''}`}>
      <nav className="mk-nav" aria-label="Main navigation"><a className={pathname === '/' ? 'is-current' : ''} href="/">Home</a>
        {(['features', 'resources', 'tools'] as Menu[]).map(item => <button key={item} type="button" aria-expanded={menu === item} aria-controls={`nav-${item}`} className={menu === item ? 'is-current' : ''} onClick={() => toggle(item)}>{item === 'tools' ? 'Free tools' : item[0].toUpperCase() + item.slice(1)}<SiteIcon name="chevron" /></button>)}
        <a href="/free" className={pathname === '/free' ? 'is-current' : ''}>Free access</a>
      </nav><div className="mk-header-actions"><a href="/login">Log in</a><a className="button button-small" href="/signup">Start for free <SiteIcon name="arrow" /></a></div>
      <div className="mk-dropdown" id="nav-features" hidden={menu !== 'features'}><div className="mk-mega-grid">{featureGroups.map(group => <div key={group}><span className="mk-menu-label">{group === 'Research' ? 'START YOUR SHOP' : group === 'Manage' ? 'RUN YOUR SHOP' : 'GROW YOUR SHOP'}</span>{features.filter(feature => feature.category === group).map(feature => <a className="mk-menu-link" key={feature.slug} href={`/features/${feature.slug}`}><span><SiteIcon name={feature.icon} /></span><div><strong>{feature.title}</strong><small>{feature.bullets[0]}</small></div></a>)}</div>)}</div><div className="mk-menu-bottom"><span>One toolkit. All available features are free.</span><a href="/features">Explore all features <SiteIcon name="arrow" /></a></div></div>
      <div className="mk-dropdown" id="nav-resources" hidden={menu !== 'resources'}><div className="mk-resources-grid">{resources.map(item => <a className="mk-menu-link" key={item.href} href={item.href}><span><SiteIcon name={item.icon} /></span><div><strong>{item.title}</strong><small>{item.description}</small></div></a>)}</div></div>
      <div className="mk-dropdown mk-tools-dropdown" id="nav-tools" hidden={menu !== 'tools'}><span className="mk-menu-label">NO ACCOUNT NEEDED</span><div className="mk-resources-grid">{[{href:'/tools/etsy-fee-calculator',title:'Etsy fee calculator',description:'Explore your price and profit',icon:'calculator'},{href:'/tools/privacy-policy-builder',title:'Privacy policy builder',description:'Create an editable policy draft',icon:'lock'},{href:'/tools/shop-name-generator',title:'Shop name generator',description:'Find a name to make your own',icon:'compass'},{href:'/tools/listing-helper',title:'Listing helper',description:'Check your listing copy',icon:'file'}].map(item => <a className="mk-menu-link" key={item.href} href={item.href}><span><SiteIcon name={item.icon as 'calculator' | 'lock' | 'compass' | 'file'} /></span><div><strong>{item.title}</strong><small>{item.description}</small></div></a>)}</div><div className="mk-menu-bottom"><span>Simple tools for everyday decisions.</span><a href="/tools">See every free tool <SiteIcon name="arrow" /></a></div></div>
    </div></div></header></>;
}
