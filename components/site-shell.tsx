import { BrandMark, SiteIcon } from './site-icon';

export function SiteHeader() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="/" aria-label="PNG Scout home"><BrandMark /></a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="/">Home</a><a href="/#tools">Our tools</a><a href="/about">About</a><a href="/contact">Contact</a>
        </nav>
        <div className="header-actions"><a className="sign-in" href="/login">Sign in</a><a className="button button-small" href="/signup">Join for free <SiteIcon name="arrow" /></a></div>
      </div>
    </header>
  </>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div className="container">
    <div className="footer-grid">
      <div className="footer-brand">
        <a className="brand" href="/" aria-label="PNG Scout home"><BrandMark /></a>
        <p>Explore Etsy listings, understand keyword context, and keep your next product idea organized.</p>
      </div>
      <nav className="footer-column" aria-label="Explore PNG Scout">
        <h2>Explore</h2>
        <ul><li><a href="/">Home</a></li><li><a href="/#tools">Our tools</a></li><li><a href="/about">About us</a></li><li><a href="/contact">Contact</a></li></ul>
      </nav>
      <nav className="footer-column" aria-label="Account links">
        <h2>Your account</h2>
        <ul><li><a href="/signup">Create free account</a></li><li><a href="/login">Sign in</a></li><li><a href="/workspace">Open workspace</a></li></ul>
      </nav>
      <nav className="footer-column" aria-label="Legal information">
        <h2>Legal</h2>
        <ul><li><a href="/privacy">Privacy policy</a></li><li><a href="/terms">Terms of use</a></li><li><a href="/#our-approach">Data &amp; transparency</a></li></ul>
      </nav>
    </div>
    <div className="footer-bottom"><span>PNG Scout - Research, thoughtfully organized.</span><p>The term &apos;Etsy&apos; is a trademark of Etsy, Inc. This Application uses Etsy&apos;s API, but is not endorsed or certified by Etsy.</p></div>
  </div></footer>;
}
