import { getPublicContact } from '../lib/public-contact';
import { BrandMark, SiteIcon } from './site-icon';

export function SiteHeader() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="/" aria-label="PNG Scout home"><BrandMark /></a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="/#tools">Our tools</a><a href="/about">About</a><a href="/contact">Contact</a>
        </nav>
        <div className="header-actions"><a className="sign-in" href="/login">Sign in</a><a className="button button-small" href="/signup">Join for free <SiteIcon name="arrow" /></a></div>
      </div>
    </header>
  </>;
}

export async function SiteFooter() {
  const contact = await getPublicContact();
  return <footer className="site-footer"><div className="container">
    <div className="footer-top">
      <div><a className="brand" href="/" aria-label="PNG Scout home"><BrandMark /></a><p>A free, non-commercial research workspace<br />for digital creators.</p><span className="footer-free"><SiteIcon name="heart" /> Free accounts. No paid plans.</span></div>
      <nav aria-label="Footer navigation">
        <a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/signup">Create free account</a>
      </nav>
    </div>
    <div className="footer-contact"><SiteIcon name="email" /><a href={`mailto:${contact.email}`}>{contact.email}</a></div>
    <div className="footer-bottom"><span>PNG Scout · Research, thoughtfully organized.</span><p>The term &apos;Etsy&apos; is a trademark of Etsy, Inc. This Application uses Etsy&apos;s API, but is not endorsed or certified by Etsy.</p></div>
  </div></footer>;
}
