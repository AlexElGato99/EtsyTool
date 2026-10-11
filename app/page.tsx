import { SiteHeader, SiteFooter } from '../components/site-shell';
import { SiteIcon } from '../components/site-icon';
import { SavedRows } from '../components/demo-listings';
import { WorkspacePreview } from '../components/workspace-preview';
export const dynamic = 'force-dynamic';
export default function HomePage() {
  return <><SiteHeader />
<main id="main" tabIndex={-1}>
  <section className="hero" aria-labelledby="hero-title">
    <div className="container">
      <div className="hero-copy">
        <span className="eyebrow"><span className="status-dot"></span> Free tools for digital creators</span>
        <h1 id="hero-title">Better research.<br /><span>Your next great design.</span></h1>
        <p className="hero-description">Explore Etsy listings, understand keyword context, and organize your next product idea. One clear workspace, from your first search to your final shortlist.</p>
        <div className="hero-actions"><a className="button" href="/signup">Create a free account <SiteIcon name="arrow" /></a><a className="button button-secondary" href="#product-preview">Explore the workspace <SiteIcon name="search" /></a></div>
        <p className="free-note">Free accounts and tools. No subscriptions. No payment details.</p><div className="hero-checks"><span><SiteIcon name="check" /> Product research</span><span><SiteIcon name="check" /> Keyword context</span><span><SiteIcon name="check" /> Private watchlists</span></div>
      </div>
      <WorkspacePreview />
    </div>
  </section>
  <section className="tool-strip" aria-label="Included research tools"><div className="container"><span>One workspace. A clearer process.</span><div><span><SiteIcon name="search" /> Listing research</span><span><SiteIcon name="keywords" /> Keyword analysis</span><span><SiteIcon name="bookmark" /> Saved products</span><span><SiteIcon name="history" /> Snapshot history</span></div></div></section>
  <section id="tools" className="section container">
    <div className="section-heading"><span className="section-label">YOUR RESEARCH TOOLKIT</span><h2>The details you need.<br />The focus you want.</h2><p>Go from an open-ended idea to organized research with tools built around the way digital creators work.</p></div>
    <div className="feature-grid">
      <article className="feature-card"><span className="feature-icon"><SiteIcon name="search" /></span><h3>Product research</h3><p>Explore public Etsy listings by keyword. Compare prices, favorites, tags, and listing age to understand the product landscape.</p><ul><li><SiteIcon name="check" /> Grid and list views</li><li><SiteIcon name="check" /> Digital filters and page sorting</li><li><SiteIcon name="check" /> Listing images and details</li></ul><a href="/signup">Explore products <SiteIcon name="arrow" /></a></article>
      <article className="feature-card"><span className="feature-icon"><SiteIcon name="keywords" /></span><h3>Keyword analysis</h3><p>Look at matching listing counts and related tags. Add context to your niche research before choosing a direction.</p><ul><li><SiteIcon name="check" /> Matching API listing counts</li><li><SiteIcon name="check" /> Up to four related tags</li><li><SiteIcon name="check" /> Listing-count competition signals</li></ul><a href="/signup">Investigate keywords <SiteIcon name="arrow" /></a></article>
      <article className="feature-card"><span className="feature-icon"><SiteIcon name="bookmark" /></span><h3>Your private watchlist</h3><p>Keep promising listings together. Return to your saved research and manually capture changes as you refine your ideas.</p><ul><li><SiteIcon name="check" /> Up to 100 saved products</li><li><SiteIcon name="check" /> Manual price and favorite snapshots</li><li><SiteIcon name="check" /> 30 days of snapshot history</li></ul><a href="/signup">Build your watchlist <SiteIcon name="arrow" /></a></article>
    </div>
  </section>
  <section id="how-it-works" className="workflow-section">
    <div className="container workflow-layout">
      <div className="workflow-copy"><span className="section-label">A SIMPLE WAY TO WORK</span><h2>From a first search<br />to a useful shortlist.</h2><p>Keep your process straightforward. Find a direction, compare the details, and save the ideas you want to revisit.</p><ol className="steps"><li><span>01</span><div><h3>Start with a keyword</h3><p>Search for a theme, style, or digital product idea.</p></div></li><li><span>02</span><div><h3>Explore what’s around it</h3><p>Review listing details and related tags to put your idea in context.</p></div></li><li><span>03</span><div><h3>Keep your research organized</h3><p>Save relevant listings and return to your private watchlist.</p></div></li></ol><a className="button" href="/signup">Join for free <SiteIcon name="arrow" /></a></div>
      <div className="research-board"><div className="board-header"><span className="board-icon"><SiteIcon name="bookmark" /></span><div><strong>A shortlist worth coming back to</strong><span>Your ideas, organized in one place</span></div></div><div className="board-list"><SavedRows /></div><div className="board-note"><SiteIcon name="history" /><div><strong>Research at your own pace</strong><p>Manually refresh a saved listing to record a snapshot. Revisit up to 30 days of price and favorite history.</p></div></div><div className="board-footer">Illustrative workspace · sample listings</div></div>
    </div>
  </section>
  <section id="our-approach" className="section container approach-layout">
    <div><span className="section-label">BUILT FOR INFORMED DECISIONS</span><h2>Clear information.<br />Honest expectations.</h2><p>Useful research starts with understanding what the data can tell you. PNG Scout keeps the source and limits of its research visible.</p><a className="text-link" href="#faq">A few things to know <SiteIcon name="arrow" /></a></div>
    <div className="approach-points"><article><span className="point-icon"><SiteIcon name="search" /></span><div><h3>Public listing information</h3><p>Research uses Etsy’s API when authorized and available. Searches may be cached for 15 minutes.</p></div></article><article><span className="point-icon"><SiteIcon name="lock" /></span><div><h3>A private place for your shortlist</h3><p>Your watchlist belongs to your account. The tool does not request private shop orders or buyer information.</p></div></article><article><span className="point-icon"><SiteIcon name="info" /></span><div><h3>Context you can interpret</h3><p>Favorites and listing counts are research signals. PNG Scout does not provide sales estimates or keyword search volume.</p></div></article></div>
  </section>
  <section id="faq" className="faq-section"><div className="container faq-layout"><div><span className="section-label">GOOD TO KNOW</span><h2>A few questions,<br />answered.</h2><p>Get to know the workspace before you start.</p></div><div className="faq-list"><details><summary>Is PNG Scout free to use? <SiteIcon name="chevron" /></summary><p>Yes. PNG Scout is a non-commercial tool. Creating an account and using all available research features is free. There are no paid plans, subscriptions, or checkout. API availability and reasonable request limits still apply.</p></details>
    <details><summary>Who is PNG Scout for? <SiteIcon name="chevron" /></summary><p>PNG designers, digital product creators, and sellers who want a focused way to explore public listing information and organize product research. The tool helps inform your decisions as you develop original work.</p></details>
    <details><summary>Do I need an account to get started? <SiteIcon name="chevron" /></summary><p>The public pages are open to everyone. Sign in or create a free account to use the protected workspace and your private watchlist. Listing research requires the Etsy API integration to be configured and authorized.</p></details>
    <details><summary>Is PNG Scout affiliated with Etsy? <SiteIcon name="chevron" /></summary><p>No. PNG Scout is an independent research tool and is not affiliated with, endorsed by, or sponsored by Etsy, Inc. Etsy is a trademark of Etsy, Inc.</p></details>
    <details><summary>Does it show exact sales or search volume? <SiteIcon name="chevron" /></summary><p>No. Research uses available listing details, matching API listing counts, and related tags. Competition indicators are based on listing counts; they are not verified demand, sales, or ranking metrics.</p></details>
    <details><summary>Does my watchlist refresh automatically? <SiteIcon name="chevron" /></summary><p>No. Refresh a saved listing manually to record a price and favorite snapshot. Up to 100 products can be saved per account, with 30 days of snapshot history.</p></details>
  </div></div></section>
  <section className="container closing-section" aria-labelledby="closing-title"><div className="closing-panel"><span className="section-label">MAKE SPACE FOR YOUR NEXT IDEA</span><h2 id="closing-title">Research with a clearer direction.</h2><p>All available tools are free to use. Create an account and bring your research together.</p><a className="button" href="/signup">Create your free account <SiteIcon name="arrow" /></a></div></section>
</main>
<SiteFooter /></>;
}
