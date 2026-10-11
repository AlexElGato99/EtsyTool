"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { BrandMark, SiteIcon } from './site-icon';
import { ProductRows, SavedRows } from './demo-listings';
type Tab = 'products' | 'keywords' | 'watchlist';
const tabs: Tab[] = ['products', 'keywords', 'watchlist'];
export function WorkspacePreview() {
  const [selected, setSelected] = useState<Tab>('products');
  const [narrow, setNarrow] = useState(false);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({products:null,keywords:null,watchlist:null});
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setNarrow(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = tabs.indexOf(selected);
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault(); setSelected(tabs[next]); tabRefs.current[tabs[next]]?.focus();
  }
  return <>
<div id="product-preview" className="product-preview">
        <div className="browser-bar"><div className="window-dots" aria-hidden="true"><i /><i /><i /></div><span><SiteIcon name="lock" /> PNG Scout / workspace</span><span className="demo-label">Interactive preview</span></div>
        <div className="workspace-demo">
          <aside className="demo-sidebar" aria-label="Workspace preview navigation">
            <span className="demo-brand"><BrandMark /></span>
            <span className="sidebar-label">RESEARCH TOOLS</span>
            <div className="demo-tabs" role="tablist" aria-label="Explore workspace previews" aria-orientation={narrow ? "horizontal" : "vertical"}>
              <button id="tab-products" type="button" role="tab" aria-selected={selected === "products"} aria-controls="panel-products" tabIndex={selected === "products" ? 0 : -1} onClick={() => setSelected("products")} onKeyDown={handleKeyDown} ref={el => { tabRefs.current["products"] = el; }}><SiteIcon name="search" /> Product research</button>
              <button id="tab-keywords" type="button" role="tab" aria-selected={selected === "keywords"} aria-controls="panel-keywords" tabIndex={selected === "keywords" ? 0 : -1} onClick={() => setSelected("keywords")} onKeyDown={handleKeyDown} ref={el => { tabRefs.current["keywords"] = el; }}><SiteIcon name="keywords" /> Keyword analysis</button>
              <button id="tab-watchlist" type="button" role="tab" aria-selected={selected === "watchlist"} aria-controls="panel-watchlist" tabIndex={selected === "watchlist" ? 0 : -1} onClick={() => setSelected("watchlist")} onKeyDown={handleKeyDown} ref={el => { tabRefs.current["watchlist"] = el; }}><SiteIcon name="bookmark" /> My watchlist</button>
            </div>
            <div className="sidebar-bottom"><SiteIcon name="lock" /> Your private workspace</div>
          </aside>
          <div className="demo-content">
            <section id="panel-products" className="demo-panel" role="tabpanel" aria-labelledby="tab-products" tabIndex={0} hidden={selected !== "products"}>
              <div className="demo-heading"><div><span className="demo-kicker">DISCOVER &amp; COMPARE</span><h2>Product research</h2><p>A closer look at your next product idea.</p></div><span className="sample-badge">Sample data</span></div>
              <div className="demo-search"><SiteIcon name="search" /><span>botanical png</span><span className="search-hint">Example keyword</span></div>
              <div className="result-toolbar"><strong>Listing overview</strong><div><span className="filter-label">Digital products</span><span className="filter-label">Price · Favorites · Age</span></div></div>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Sample listing table, scroll horizontally for more details"><table className="listing-table"><caption className="sr-only">Illustrative listing details with sample prices and favorite counts</caption><thead><tr><th scope="col">Product</th><th scope="col">Price</th><th scope="col">Favorites</th><th scope="col">Age</th><th scope="col">Type</th></tr></thead><tbody><ProductRows /></tbody></table></div>
              <div className="demo-footer"><span>Listing details, all in one place</span><span>Explore · Compare · Save</span></div>
            </section>
            <section id="panel-keywords" className="demo-panel" role="tabpanel" aria-labelledby="tab-keywords" tabIndex={0} hidden={selected !== "keywords"}>
              <div className="demo-heading"><div><span className="demo-kicker">EXPLORE THE CONTEXT</span><h2>Keyword analysis</h2><p>Related tags and matching listing counts.</p></div><span className="sample-badge">Sample data</span></div>
              <div className="demo-search"><SiteIcon name="keywords" /><span>botanical png</span><span className="search-hint">Example keyword</span></div>
              <div className="keyword-summary"><div><span>Matching listings</span><strong>1,240</strong><small>Sample API listing count</small></div><div><span>Research signal</span><strong>Competition</strong><small>Based on matching listing counts</small></div></div>
              <div className="keyword-tags"><h3>Related tags to explore</h3><div><span>floral clipart</span><span>wildflower png</span><span>botanical art</span><span>flower bundle</span></div></div>
              <p className="demo-notice"><SiteIcon name="info" /> Listing counts describe competition context, not search volume or sales.</p>
            </section>
            <section id="panel-watchlist" className="demo-panel" role="tabpanel" aria-labelledby="tab-watchlist" tabIndex={0} hidden={selected !== "watchlist"}>
              <div className="demo-heading"><div><span className="demo-kicker">KEEP YOUR IDEAS CLOSE</span><h2>My watchlist</h2><p>Your research, ready to revisit.</p></div><span className="sample-badge">Sample data</span></div>
              <div className="watchlist-summary"><span><SiteIcon name="bookmark" /> 3 sample saved listings</span><span>Up to 100 per account</span></div>
              <div className="saved-list"><SavedRows /></div>
              <p className="demo-notice"><SiteIcon name="history" /> Manually refresh saved listings to record price and favorite snapshots.</p>
            </section>
          </div>
        </div>
      </div>
      <p className="preview-caption">Try the tabs to explore the workspace. All preview listings and numbers are illustrative, not live Etsy data.</p>
</>;
}
