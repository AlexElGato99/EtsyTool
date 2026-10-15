'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PiListBold, PiXBold } from 'react-icons/pi';
import { BrandMark, SiteIcon } from './site-icon';
import './marketing.css';

const tools = [
  { href: '/tools/etsy-fee-calculator', title: 'Etsy fee calculator', description: 'Explore your price and profit', icon: 'calculator' },
  { href: '/tools/privacy-policy-builder', title: 'Privacy policy builder', description: 'Create an editable policy draft', icon: 'lock' },
  { href: '/tools/shop-name-generator', title: 'Shop name generator', description: 'Find a name to make your own', icon: 'compass' },
  { href: '/tools/listing-helper', title: 'Listing helper', description: 'Check your listing copy', icon: 'file' },
] as const;

export function SiteNavigation() {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const toolsTrigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => { setToolsOpen(false); setMobile(false); }, [pathname]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) { setToolsOpen(false); setMobile(false); }
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (toolsOpen) { setToolsOpen(false); toolsTrigger.current?.focus(); }
      else if (mobile) { setMobile(false); trigger.current?.focus(); }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [toolsOpen, mobile]);

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header ref={root} className="site-header mk-header">
      <div className="container mk-header-inner">
        <a className="brand" href="/" aria-label="podadd home"><BrandMark /></a>
        <button ref={trigger} className="mk-menu-toggle" type="button" aria-label={mobile ? 'Close navigation' : 'Open navigation'} aria-expanded={mobile} aria-controls="public-navigation" onClick={() => { setMobile(!mobile); setToolsOpen(false); }}>
          {mobile ? <PiXBold /> : <PiListBold />}
        </button>
        <div id="public-navigation" className={'mk-navigation' + (mobile ? ' is-open' : '')}>
          <nav className="mk-nav" aria-label="Main navigation">
            <a className={pathname === '/' ? 'is-current' : ''} aria-current={pathname === '/' ? 'page' : undefined} href="/">Home</a>
            <button ref={toolsTrigger} type="button" aria-expanded={toolsOpen} aria-controls="nav-tools" className={toolsOpen || pathname.startsWith('/tools') ? 'is-current' : ''} onClick={() => setToolsOpen(current => !current)}>Tools<SiteIcon name="chevron" /></button>
            <a href="/about" className={pathname === '/about' ? 'is-current' : ''} aria-current={pathname === '/about' ? 'page' : undefined}>About</a>
            <a href="/contact" className={pathname === '/contact' ? 'is-current' : ''} aria-current={pathname === '/contact' ? 'page' : undefined}>Contact</a>
          </nav>
          <div className="mk-header-actions">
            <a href="/login">Log in</a>
            <a className="button button-small" href="/signup">Start for free <SiteIcon name="arrow" /></a>
          </div>
          <div className="mk-dropdown mk-tools-dropdown" id="nav-tools" hidden={!toolsOpen}>
            <span className="mk-menu-label">NO ACCOUNT NEEDED</span>
            <div className="mk-resources-grid">
              {tools.map(item => <a className="mk-menu-link" key={item.href} href={item.href}>
                <span><SiteIcon name={item.icon} /></span>
                <div><strong>{item.title}</strong><small>{item.description}</small></div>
              </a>)}
            </div>
            <div className="mk-menu-bottom">
              <span>Simple tools for everyday decisions.</span>
              <a href="/tools">See every free tool <SiteIcon name="arrow" /></a>
            </div>
          </div>
        </div>
      </div>
    </header>
  </>;
}
