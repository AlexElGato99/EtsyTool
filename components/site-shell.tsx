import { BrandMark } from './site-icon';
import { SiteNavigation } from './site-navigation';

export function SiteHeader() {
  return <SiteNavigation />;
}

export function SiteFooter() {
  return <footer className="site-footer mk-footer"><div className="container">
    <div className="mk-footer-grid">
      <div className="footer-brand">
        <a className="brand" href="/" aria-label="podadd home"><BrandMark /></a>
        <p>Prepare your own listings, plan your costs, and keep manual drafts organized.</p>
      </div>
      <nav className="footer-column" aria-label="Company">
        <h2>Company</h2>
        <ul><li><a href="/about">About us</a></li><li><a href="/application">Application purpose</a></li><li><a href="/contact">Contact us</a></li><li><a href="/community">Community</a></li><li><a href="/brand">Brand assets</a></li><li><a href="/free">Free access</a></li><li><a href="/signup">Create an account</a></li></ul>
      </nav>
      <nav className="footer-column" aria-label="Resources">
        <h2>Resources</h2>
        <ul><li><a href="/blog">Seller guides</a></li><li><a href="/help">Help center</a></li><li><a href="/demo">Product tour</a></li><li><a href="/etsy-docs">Etsy docs</a></li><li><a href="/api-docs">API documentation</a></li></ul>
      </nav>
      <nav className="footer-column" aria-label="Free tools">
        <h2>Free tools</h2>
        <ul><li><a href="/tools/etsy-fee-calculator">Fee calculator</a></li><li><a href="/tools/privacy-policy-builder">Privacy builder</a></li><li><a href="/tools/shop-name-generator">Shop name generator</a></li><li><a href="/tools/listing-helper">Listing helper</a></li><li><a href="/tools">All free tools</a></li></ul>
      </nav>
      <nav className="footer-column" aria-label="Legal information">
        <h2>Legal</h2>
        <ul><li><a href="/privacy">Privacy policy</a></li><li><a href="/terms">Terms of use</a></li><li><a href="/etsy-disclaimer">Etsy disclaimer</a></li><li><a href="/help">Help &amp; transparency</a></li></ul>
      </nav>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} podadd.</span><p>The term &apos;Etsy&apos; is a trademark of Etsy, Inc. This Application uses Etsy&apos;s API, but is not endorsed or certified by Etsy.</p></div>
  </div></footer>;
}
