'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  PiMagnifyingGlassBold, PiTagBold, PiBookmarkSimpleBold, PiBookmarkSimpleFill,
  PiHouseBold, PiSignOutBold, PiArrowSquareOutBold, PiSlidersHorizontalBold,
  PiSquaresFourBold, PiListBold, PiDownloadSimpleBold, PiArrowLeftBold,
  PiArrowRightBold, PiHeartBold, PiClockBold, PiStorefrontBold, PiLinkBold,
  PiXBold, PiArrowClockwiseBold, PiCopyBold, PiCaretDownBold,
  PiFileImageBold, PiEnvelopeSimpleBold, PiPlugBold, PiToolboxBold,
} from 'react-icons/pi';
import { BrandMark } from './site-icon';
import { AccountConnections } from './account-connections';
import { EmailCampaigns } from './email-campaigns';
import { FreeTool } from './free-tools';
import { freeTools, type ToolSlug } from '../lib/free-tools';
import { SiteIcon } from './site-icon';
import './workspace.css';

type Section = 'listings' | 'keywords' | 'saved' | 'tools' | 'connections' | 'campaigns';
type Mode = 'marketplace' | 'shop' | 'listing';
type Product = {
  id: string; title: string; price: number; currency: string; age: number;
  favorites: number; tags: string[]; image: string | null; url: string;
  isDigital: boolean; description?: string; shopId?: string; shopName?: string;
};
type SearchResult = {
  count: number; results: Product[]; capturedAt: string; cached: boolean;
  offset: number; limit: number; hasMore: boolean; mode: Mode;
  shop?: { id: string; name: string; url: string; sections: { id: string; name: string; count: number }[] };
};
type Category = { id: number | string; name: string; path: string };
type Keyword = { keyword: string; results: number; score: number; level: 'low' | 'medium' | 'high' };
type Snapshot = { capturedAt: string; price: number; currency: string; favorites: number };
type Filters = {
  min_price: string; max_price: string; taxonomy_id: string; shop_location: string;
  currency: string; buyer_country: string; sort_on: string; sort_order: string; is_safe: boolean;
};
const initialFilters: Filters = {
  min_price: '', max_price: '', taxonomy_id: '', shop_location: '', currency: '',
  buyer_country: '', sort_on: 'score', sort_order: 'down', is_safe: true,
};
const methodLabels = { marketplace: 'Marketplace', shop: 'Shop search', listing: 'Listing lookup' };
const sectionLabels = { listings: 'Listing explorer', keywords: 'Keyword research', saved: 'Saved listings', tools: 'Creator tools', connections: 'Connected accounts', campaigns: 'Email campaigns' };
const number = (value: number) => value.toLocaleString();
function price(product: { price: number; currency: string }) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: product.currency }).format(product.price); }
  catch { return `${product.currency} ${product.price.toFixed(2)}`; }
}
function date(value: string) { return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(url, options); }
  catch { throw new RequestError('Could not connect. Check your connection and try again.', 0); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) { window.location.assign('/login'); throw new RequestError('Please sign in again to continue.', 401); }
    throw new RequestError(data.error || 'This request could not be completed. Please try again.', response.status);
  }
  return data as T;
}
const post = <T,>(url: string, body: unknown) => api<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product.image]);
  return product.image && !failed
    ? <img src={product.image} alt={product.title} loading="lazy" onError={() => setFailed(true)} />
    : <span className="ws-image-placeholder"><PiFileImageBold /><span>Preview unavailable</span></span>;
}

export default function Workspace({ email }: { email: string }) {
  const [section, setSection] = useState<Section>('listings');
  const [activeTool, setActiveTool] = useState<ToolSlug | null>(null);
  const [mode, setMode] = useState<Mode>('marketplace');
  const [queries, setQueries] = useState<Record<Mode, string>>({ marketplace: '', shop: '', listing: '' });
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [advanced, setAdvanced] = useState(false);
  const [shopView, setShopView] = useState<'active' | 'featured' | 'section'>('active');
  const [shopKeyword, setShopKeyword] = useState('');
  const [shopSection, setShopSection] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryState, setCategoryState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [applied, setApplied] = useState<URLSearchParams | null>(null);
  const [resultQuery, setResultQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchNumber = useRef(0);
  const [saved, setSaved] = useState<Product[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState('');
  const [pendingSave, setPendingSave] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [localType, setLocalType] = useState('all');
  const [allowExport, setAllowExport] = useState(true);
  const [keywordQuery, setKeywordQuery] = useState('');
  const [keywords, setKeywords] = useState<Keyword[] | null>(null);
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [keywordError, setKeywordError] = useState('');
  const [keywordLevel, setKeywordLevel] = useState('all');
  const [keywordMessage, setKeywordMessage] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const selectedId = useRef<string | null>(null);
  selectedId.current = selected?.id || null;
  const refreshNumber = useRef(0);
  const historyNumber = useRef(0);
  const savedIds = new Set(saved.map(item => item.id));
  const query = queries[mode];
  const shopSort = filters.sort_on === 'score' && (!shopKeyword.trim() || shopView !== 'active') ? 'created' : filters.sort_on;
  const setQuery = (value: string) => { setQueries(current => ({ ...current, [mode]: value })); if (mode === 'shop') { setShopSection(''); if (shopView === 'section') setShopView('active'); } };
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters(current => ({ ...current, [key]: value }));

  async function loadSaved() {
    setSavedLoading(true); setSavedError('');
    try { const data = await api<{ products: Product[] }>('/api/watchlist'); setSaved(data.products); }
    catch (error) { setSavedError((error as Error).message); }
    finally { setSavedLoading(false); }
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSection = params.get('section');
    if (requestedSection && ['listings','keywords','saved','tools','connections','campaigns'].includes(requestedSection)) setSection(requestedSection as Section);
    if (params.has('connection')) setSection('connections');
    const requestedMode = params.get('mode');
    if (requestedMode && ['marketplace','shop','listing'].includes(requestedMode)) {
      setMode(requestedMode as Mode);
      const requestedQuery = (params.get('q') || '').slice(0, requestedMode === 'listing' ? 8000 : requestedMode === 'shop' ? 1000 : 100);
      setQueries(current => ({...current,[requestedMode]:requestedQuery}));
    }
    void loadSaved();
    let storedView: string | null = null;
    try { storedView = localStorage.getItem('png-scout-view'); if (storedView === 'list' || storedView === 'grid') setView(storedView); } catch {}
    api<{ allowExport: boolean; defaultView: string }>('/api/app').then(data => {
      setAllowExport(data.allowExport !== false);
      if (!storedView && data.defaultView === 'list') setView('list');
    }).catch(() => {});
  }, []);
  async function loadCategories() {
    setCategoryState('loading');
    try { const data = await api<{ categories: Category[] }>('/api/taxonomy'); setCategories(data.categories); setCategoryState('ready'); }
    catch { setCategoryState('failed'); }
  }
  useEffect(() => { if (advanced && categoryState === 'idle') void loadCategories(); }, [advanced, categoryState]);
  useEffect(() => {
    refreshNumber.current++; setRefreshing(false);
  }, [selected?.id]);
  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);
  useEffect(() => {
    const request = ++historyNumber.current;
    if (!selected || !savedIds.has(selected.id)) { setSnapshots([]); setHistoryError(''); setHistoryLoading(false); return; }
    let current = true;
    setSnapshots([]); setHistoryLoading(true); setHistoryError('');
    api<{ snapshots: Snapshot[] }>(`/api/history?id=${selected.id}`).then(data => {
      if (current && request === historyNumber.current) setSnapshots(data.snapshots);
    }).catch(error => { if (current && request === historyNumber.current) setHistoryError(error.message); }).finally(() => { if (current && request === historyNumber.current) setHistoryLoading(false); });
    return () => { current = false; };
  }, [selected?.id, saved.map(item => item.id).join(',')]);

  function changeSection(next: Section) { setSection(next); setActionMessage(''); const url = new URL(window.location.href); url.searchParams.set('section',next); url.searchParams.delete('connection'); url.searchParams.delete('result'); window.history.replaceState(null,'',url.pathname + url.search); }
  function changeView(next: 'grid' | 'list') { setView(next); try { localStorage.setItem('png-scout-view', next); } catch {} }
  async function search(params: URLSearchParams, start = 0) {
    const request = ++searchNumber.current;
    setSearching(true); setSearchError(''); setActionMessage('');
    const requestParams = new URLSearchParams(params); requestParams.set('offset', String(start));
    try {
      const data = await api<SearchResult>(`/api/products?${requestParams}`);
      if (request !== searchNumber.current) return;
      setResults(data); setApplied(params); setResultQuery(params.get('q') || 'Newest listings');
    } catch (error) { if (request === searchNumber.current) setSearchError((error as Error).message); }
    finally { if (request === searchNumber.current) setSearching(false); }
  }
  function runSearch(event?: FormEvent, override?: string) {
    event?.preventDefault();
    const params = new URLSearchParams({ mode, q: override ?? query.trim(), limit: '24' });
    if (mode !== 'listing') {
      params.set('sort_on', mode === 'shop' ? shopSort : !params.get('q') && filters.sort_on === 'score' ? 'created' : filters.sort_on);
      params.set('sort_order', filters.sort_order);
    }
    if (mode === 'shop') {
      params.set('shop_view', shopView);
      if (shopView === 'active' && shopKeyword.trim()) params.set('keywords', shopKeyword.trim());
      if (shopView === 'section' && shopSection) params.set('shop_section_ids', shopSection);
    }
    if (mode === 'marketplace') {
      params.set('is_safe', String(filters.is_safe));
      for (const key of ['min_price', 'max_price', 'taxonomy_id', 'shop_location', 'currency', 'buyer_country'] as const) {
        if (filters[key].trim()) params.set(key, filters[key].trim());
      }
    }
    void search(params);
  }
  function researchKeyword(value: string) {
    setSection('listings'); setMode('marketplace'); setQueries(current => ({ ...current, marketplace: value }));
    setFilters(initialFilters); setLocalType('all'); setSelected(null);
    void search(new URLSearchParams({ mode: 'marketplace', q: value, limit: '24', sort_on: 'score', sort_order: 'down', is_safe: 'true' }));
  }
  async function toggleSave(product: Product) {
    if (pendingSave.includes(product.id) || savedLoading || savedError) return;
    const remove = savedIds.has(product.id);
    setPendingSave(current => [...current, product.id]); setActionMessage('');
    try {
      const data = await post<{ product?: Product }>('/api/watchlist', { id: product.id, action: remove ? 'remove' : 'save' });
      setSaved(current => remove ? current.filter(item => item.id !== product.id) : [...current, data.product || product]);
      setActionMessage(remove ? 'Listing removed from your saved collection.' : 'Listing added to your saved collection.');
    } catch (error) { setActionMessage((error as Error).message); }
    finally { setPendingSave(current => current.filter(id => id !== product.id)); }
  }
  async function refreshListing() {
    if (!selected) return;
    const id = selected.id;
    const request = ++refreshNumber.current;
    historyNumber.current++; setHistoryLoading(true);
    setRefreshing(true); setHistoryError('');
    try {
      const data = await post<{ product: Product }>('/api/watchlist', { id, action: 'refresh' });
      setSaved(current => current.map(item => item.id === id ? data.product : item));
      const updateProduct = (item: Product) => ({ ...data.product, shopName: data.product.shopName || item.shopName, ...(item.currency !== data.product.currency ? { price: item.price, currency: item.currency } : {}) });
      setResults(current => current ? { ...current, results: current.results.map(item => item.id === id ? updateProduct(item) : item) } : current);
      if (request !== refreshNumber.current || selectedId.current !== id) return;
      setSelected(current => current?.id === id ? updateProduct(current) : current);
      const history = await api<{ snapshots: Snapshot[] }>(`/api/history?id=${id}`);
      if (request === refreshNumber.current && selectedId.current === id) setSnapshots(history.snapshots);
    } catch (error) { if (request === refreshNumber.current && selectedId.current === id) setHistoryError((error as Error).message); }
    finally { if (request === refreshNumber.current && selectedId.current === id) { setRefreshing(false); setHistoryLoading(false); } }
  }
  async function analyze(event: FormEvent) {
    event.preventDefault(); if (keywordLoading) return;
    setKeywordLoading(true); setKeywordError(''); setKeywordMessage('');
    try { const data = await api<{ keywords: Keyword[] }>(`/api/keywords?q=${encodeURIComponent(keywordQuery.trim())}`); setKeywords(data.keywords); }
    catch (error) { setKeywordError((error as Error).message); }
    finally { setKeywordLoading(false); }
  }
  async function signOut() {
    setSigningOut(true);
    try { await post('/api/auth/logout', {}); window.location.assign('/login'); }
    catch (error) { setActionMessage((error as Error).message); setSigningOut(false); }
  }
  const sourceProducts = section === 'saved' ? saved : results?.results || [];
  const products = sourceProducts.filter(product => localType === 'all' || (localType === 'digital' ? product.isDigital : !product.isDigital));
  const shopSections = results?.mode === 'shop' && resultQuery === queries.shop.trim() ? results.shop?.sections || [] : [];
  function exportListings() {
    const csv = [['listing_id', 'title', 'currency', 'price', 'age_days', 'favorites', 'etsy_url'], ...products.map(p => [p.id, p.title, p.currency, p.price, p.age, p.favorites, p.url])]
      .map(row => row.map(value => { const text = String(value); return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`; }).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'png-scout-listings.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function saveButton(product: Product, extra = '') {
    return <button type="button" className={`ws-save ${savedIds.has(product.id) ? 'is-saved' : ''} ${extra}`} disabled={savedLoading || !!savedError || pendingSave.includes(product.id)}
      aria-pressed={savedIds.has(product.id)} aria-label={`${savedIds.has(product.id) ? 'Remove saved listing' : 'Save listing'}: ${product.title}`} onClick={() => void toggleSave(product)}>
      {savedIds.has(product.id) ? <PiBookmarkSimpleFill /> : <PiBookmarkSimpleBold />}
    </button>;
  }
  function productCards() {
    return <div className={`ws-products ws-products-${view}`} aria-busy={searching}>
      {products.map(product => <article className="ws-product" key={product.id}>
        <button className="ws-product-image" type="button" onClick={() => setSelected(product)} aria-label={`View details: ${product.title}`}><ProductImage product={product} /></button>
        {saveButton(product)}
        <div className="ws-product-body">
          <div className="ws-product-kind"><span>{product.isDigital ? 'Digital download' : 'Etsy listing'}</span>{product.shopName && <span>{product.shopName}</span>}</div>
          <button className="ws-product-title" onClick={() => setSelected(product)}>{product.title}</button>
          <div className="ws-product-meta"><span><PiHeartBold />{number(product.favorites)}<span className="sr-only"> favorites</span></span><span><PiClockBold />{number(product.age)} days<span className="sr-only"> old</span></span></div>
          <div className="ws-product-bottom"><strong>{price(product)}</strong><a href={product.url} target="_blank" rel="noopener noreferrer" aria-label={`Open on Etsy: ${product.title}`}>View on Etsy <PiArrowSquareOutBold /></a></div>
        </div>
      </article>)}
    </div>;
  }

  return <div className="ws-app">
    <a className="skip-link" href="#workspace-main">Skip to workspace</a>
    <aside className="ws-sidebar">
      <a className="brand ws-brand" href="/" aria-label="PNG Scout home"><BrandMark /></a>
      <div className="ws-nav-label">YOUR WORKSPACE</div>
      <nav className="ws-navigation" aria-label="Workspace navigation">
        <button aria-current={section === 'listings' ? 'page' : undefined} onClick={() => changeSection('listings')}><PiMagnifyingGlassBold />Listing explorer</button>
        <button aria-current={section === 'keywords' ? 'page' : undefined} onClick={() => changeSection('keywords')}><PiTagBold />Keyword research</button>
        <button aria-current={section === 'saved' ? 'page' : undefined} onClick={() => changeSection('saved')}><PiBookmarkSimpleBold />Saved listings{!savedLoading && !savedError && <span className="ws-nav-count">{saved.length}</span>}</button>
        <button aria-current={section === 'tools' ? 'page' : undefined} onClick={() => changeSection('tools')}><PiToolboxBold />Creator tools</button>
        <button aria-current={section === 'campaigns' ? 'page' : undefined} onClick={() => changeSection('campaigns')}><PiEnvelopeSimpleBold />Email campaigns</button>
        <button aria-current={section === 'connections' ? 'page' : undefined} onClick={() => changeSection('connections')}><PiPlugBold />Connected accounts</button>
      </nav>
      <div className="ws-sidebar-bottom">
        <nav className="ws-secondary-nav" aria-label="Website links"><a href="/" aria-label="Home"><PiHouseBold />Home</a><a href="/help"><PiEnvelopeSimpleBold />Help center</a></nav>
        <div className="ws-profile"><span className="ws-avatar" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span><div><strong>Your account</strong><span title={email}>{email}</span></div></div>
        <button className="ws-signout" onClick={() => void signOut()} disabled={signingOut}><PiSignOutBold />{signingOut ? 'Signing out…' : 'Sign out'}</button>
      </div>
    </aside>
    <div className="ws-body">
      <header className="ws-topbar"><div><span>Workspace</span><PiCaretDownBold className="ws-breadcrumb-arrow" /><strong>{sectionLabels[section]}</strong></div><a href="/about">About PNG Scout <PiArrowSquareOutBold /></a></header>
      <main id="workspace-main" className="ws-main">
        <div className="ws-heading"><span className="ws-kicker">{section === 'campaigns' ? 'YOUR EMAIL CAMPAIGNS' : section === 'connections' ? 'YOUR CONNECTED SERVICES' : section === 'tools' ? 'YOUR FREE CREATOR TOOLKIT' : section === 'saved' ? 'YOUR COLLECTION' : section === 'keywords' ? 'DISCOVER THE CONTEXT' : 'EXPLORE THE MARKETPLACE'}</span>
          <h1>{section === 'campaigns' ? 'Keep your subscribers in the loop.' : section === 'connections' ? 'Bring your accounts together.' : section === 'tools' ? 'Make your next step concrete.' : section === 'saved' ? 'Good ideas, kept together.' : section === 'keywords' ? 'Find the words behind the idea.' : 'Your next idea starts here.'}</h1>
          <p>{section === 'campaigns' ? 'Connect your own free Resend account, build your list, and send a thoughtful shop update.' : section === 'connections' ? 'Connect your own accounts and choose the actions you want to use.' : section === 'tools' ? 'Check a listing, understand your fees, and prepare your next message.' : section === 'saved' ? 'Keep your favorite listings in one place. Revisit details and track price and favorite changes.' : section === 'keywords' ? 'Explore related tags and compare the listing competition around a keyword.' : 'Search Etsy listings, explore a shop, or take a closer look at a product.'}</p>
        </div>
        {section === 'connections' && <AccountConnections />}
        {section === 'campaigns' && <EmailCampaigns />}
        {section === 'tools' && <div className="ws-tools">{activeTool ? <><button className="ws-button ws-secondary ws-tools-back" onClick={() => setActiveTool(null)}><PiArrowLeftBold />All creator tools</button><h2>{freeTools.find(tool => tool.slug === activeTool)?.title}</h2><FreeTool slug={activeTool} /></> : <div className="ws-tools-grid">{freeTools.map(tool => <button className="ws-tool-card" key={tool.slug} onClick={() => setActiveTool(tool.slug)}><span><SiteIcon name={tool.icon} /></span><h2>{tool.title}</h2><p>{tool.description}</p><strong>Open free tool <PiArrowRightBold /></strong></button>)}</div>}</div>}
        {actionMessage && <p className="ws-feedback" role="status">{actionMessage}</p>}
        {savedError && (section === 'listings' || section === 'saved') && <div className="ws-feedback" role="status">Your saved collection could not be loaded. <button onClick={() => void loadSaved()}>Try again</button></div>}

        {section === 'listings' && <>
          <section className="ws-search-panel" aria-label="Search Etsy listings">
            <div className="ws-methods" aria-label="Search method">
              {(['marketplace', 'shop', 'listing'] as const).map(method => <button key={method} aria-pressed={mode === method} onClick={() => { setMode(method); setSearchError(''); }}>
                {method === 'marketplace' ? <PiMagnifyingGlassBold /> : method === 'shop' ? <PiStorefrontBold /> : <PiLinkBold />}{methodLabels[method]}</button>)}
            </div>
            <form onSubmit={event => runSearch(event)} className="ws-search-form">
              <label className="ws-search-label" htmlFor="ws-query">{mode === 'marketplace' ? 'What would you like to explore?' : mode === 'shop' ? 'Find a shop’s active listings' : 'Look up Etsy listings'}</label>
              <div className="ws-search-row"><div className="ws-search-input"><PiMagnifyingGlassBold />
                <input id="ws-query" value={query} onChange={event => setQuery(event.target.value)} maxLength={mode === 'listing' ? 8000 : mode === 'shop' ? 1000 : 100}
                  placeholder={mode === 'marketplace' ? 'Try “digital planner” or “wedding invitation”' : mode === 'shop' ? 'Shop name, shop ID, or Etsy shop link' : 'Etsy listing link or listing ID'} required={mode !== 'marketplace'} />
              </div><button className="ws-button ws-primary" type="submit" disabled={searching}>{searching ? 'Searching…' : mode === 'listing' ? 'Find listings' : 'Search listings'}<PiArrowRightBold /></button></div>
              <div className="ws-search-options"><p>{mode === 'marketplace' ? 'Leave the keyword empty to browse the newest listings.' : mode === 'shop' ? 'Use the exact shop name shown on Etsy, or paste its link.' : 'Look up up to 100 listings, separated by commas.'}</p>
                {mode === 'marketplace' && <button className="ws-filter-toggle" type="button" aria-expanded={advanced} aria-controls="ws-advanced" onClick={() => setAdvanced(!advanced)}><PiSlidersHorizontalBold />Filters <PiCaretDownBold /></button>}
              </div>
              {mode === 'shop' && <div className="ws-shop-options">
                <label>Shop listings<select value={shopView} onChange={event => setShopView(event.target.value as typeof shopView)}><option value="active">All active listings</option><option value="featured">Featured listings</option><option value="section" disabled={!shopSections.length}>Shop section{!shopSections.length ? ' · search a shop first' : ''}</option></select></label>
                {shopView === 'active' && <label>Keyword in this shop<input value={shopKeyword} onChange={event => setShopKeyword(event.target.value)} maxLength={100} placeholder="Optional keyword" /></label>}
                {shopView === 'section' && <label>Choose a section<select required value={shopSection} onChange={event => setShopSection(event.target.value)}><option value="">Select a shop section</option>{shopSections.map(item => <option key={item.id} value={item.id}>{item.name} ({item.count})</option>)}</select></label>}
                {shopView !== 'featured' && <><label>Sort by<select value={shopSort} onChange={event => setFilter('sort_on', event.target.value)}><option value="score" disabled={shopView !== 'active' || !shopKeyword.trim()}>Relevance</option><option value="created">Created date</option><option value="updated">Updated date</option><option value="price">Price</option></select></label>
                <label>Order<select value={filters.sort_order} disabled={filters.sort_on === 'score' && shopView === 'active' && !!shopKeyword.trim()} onChange={event => setFilter('sort_order', event.target.value)}><option value="down">Highest / newest first</option><option value="up">Lowest / oldest first</option></select></label></>}
              </div>}
              {mode === 'marketplace' && advanced && <div id="ws-advanced" className="ws-advanced">
                <div className="ws-filter-grid">
                  <label>Category<select value={filters.taxonomy_id} disabled={categoryState !== 'ready'} onChange={event => setFilter('taxonomy_id', event.target.value)}><option value="">{categoryState === 'loading' ? 'Loading categories…' : 'All categories'}</option>{categories.map(category => <option key={category.id} value={category.id}>{category.path || category.name}</option>)}</select>
                    {categoryState === 'failed' && <button type="button" className="ws-inline-button" onClick={() => void loadCategories()}>Reload categories</button>}</label>
                  <label>Minimum price<input type="number" min="0" step="0.01" value={filters.min_price} onChange={event => setFilter('min_price', event.target.value)} placeholder="No minimum" /></label>
                  <label>Maximum price<input type="number" min={filters.min_price || '0'} step="0.01" value={filters.max_price} onChange={event => setFilter('max_price', event.target.value)} placeholder="No maximum" /></label>
                  <label>Currency<input value={filters.currency} onChange={event => setFilter('currency', event.target.value.toUpperCase())} maxLength={3} pattern="[A-Z]{3}" placeholder="e.g. USD or EUR" /></label>
                  <label>Shop location<input value={filters.shop_location} onChange={event => setFilter('shop_location', event.target.value)} maxLength={100} placeholder="e.g. London, UK" /></label>
                  <label>Ships to country<input value={filters.buyer_country} onChange={event => setFilter('buyer_country', event.target.value.toUpperCase())} maxLength={2} pattern="[A-Z]{2}" placeholder="e.g. US or GB" /></label>
                  <label>Sort by<select value={filters.sort_on} onChange={event => setFilter('sort_on', event.target.value)}><option value="score">Relevance</option><option value="created">Created date</option><option value="updated">Updated date</option><option value="price">Price</option></select></label>
                  <label>Order<select value={filters.sort_order} disabled={filters.sort_on === 'score'} onChange={event => setFilter('sort_order', event.target.value)}><option value="down">Highest / newest first</option><option value="up">Lowest / oldest first</option></select></label>
                </div>
                <div className="ws-filter-footer"><label className="ws-checkbox"><input type="checkbox" checked={filters.is_safe} onChange={event => setFilter('is_safe', event.target.checked)} />Exclude mature content</label><button className="ws-inline-button" type="button" onClick={() => setFilters(initialFilters)}>Reset filters</button></div>
              </div>}
            </form>
          </section>
          {searchError && <div className="ws-feedback ws-feedback-error" role="alert">{searchError}{results && <span>Your previous results are still shown below.</span>}</div>}
        </>}

        {(section === 'listings' || section === 'saved') && <section className="ws-results" aria-label={section === 'saved' ? 'Saved listings' : 'Search results'}>
          <div className="ws-results-header"><div><h2>{section === 'saved' ? 'Your saved listings' : results ? 'Search results' : 'Find something worth exploring'}</h2>
            {section === 'saved' ? <p>{savedLoading ? 'Loading your collection…' : `${number(saved.length)} of 100 listings saved`}</p> : results && <p>{number(results.count)} matching listings{results.shop ? ` · ${results.shop.name}` : ` · ${resultQuery.length > 70 ? 'Listing lookup' : resultQuery}`}<span className="ws-results-date"> · Updated {date(results.capturedAt)}</span></p>}
          </div>{(results || section === 'saved') && <div className="ws-result-actions">
            {allowExport && <button className="ws-button ws-secondary ws-export" onClick={exportListings} disabled={!products.length}><PiDownloadSimpleBold />Export CSV</button>}
            <div className="ws-view-toggle" aria-label="Listing view"><button aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => changeView('grid')}><PiSquaresFourBold /></button><button aria-label="List view" aria-pressed={view === 'list'} onClick={() => changeView('list')}><PiListBold /></button></div>
          </div>}</div>
          {(results || section === 'saved') && sourceProducts.length > 0 && <div className="ws-results-filter"><label>Show<select value={localType} onChange={event => setLocalType(event.target.value)}><option value="all">All listing types</option><option value="digital">Digital downloads</option><option value="physical">Physical listings</option></select></label><span>{number(products.length)} shown{section === 'listings' && ' on this page'}</span></div>}
          {searching && <div className="ws-loading" role="status"><span className="ws-spinner" />Searching Etsy listings…</div>}
          {products.length > 0 && productCards()}
          {!products.length && !searching && (section !== 'saved' || !savedLoading) && <div className="ws-empty">
            <span className="ws-empty-icon">{section === 'saved' ? <PiBookmarkSimpleBold /> : <PiMagnifyingGlassBold />}</span>
            <h3>{section === 'saved' ? (savedError ? 'Your collection will be here.' : 'A home for your best finds.') : results ? 'No listings to show.' : 'Start with a little curiosity.'}</h3>
            <p>{section === 'saved' ? (savedError ? 'Try loading your saved listings again.' : 'Save a listing with the bookmark button and come back to it anytime.') : results ? (sourceProducts.length ? 'Try another listing type to see more of this page.' : 'Try a broader keyword, another shop, or fewer filters.') : 'Search a keyword, explore a shop, or paste an Etsy listing link above.'}</p>
            {section === 'saved' && !savedError && <button className="ws-button ws-primary" onClick={() => changeSection('listings')}>Explore listings <PiArrowRightBold /></button>}
            {section === 'listings' && !results && <div className="ws-suggestions"><span>A few starting points</span>{['Digital planner', 'Wedding invitation', 'SVG bundle'].map(term => <button key={term} onClick={() => researchKeyword(term)}>{term}<PiArrowRightBold /></button>)}</div>}
          </div>}
          {section === 'listings' && results && applied && results.mode !== 'listing' && <div className="ws-pagination"><span>{products.length ? `Showing ${results.offset + 1}–${results.offset + results.results.length} of ${number(results.count)}` : 'No listings on this page'}</span><div><button className="ws-button ws-secondary" disabled={searching || results.offset === 0} onClick={() => void search(applied, Math.max(0, results.offset - results.limit))}><PiArrowLeftBold />Previous</button><span>Page {Math.floor(results.offset / results.limit) + 1}</span><button className="ws-button ws-secondary" disabled={searching || !results.hasMore} onClick={() => void search(applied, results.offset + results.limit)}>Next<PiArrowRightBold /></button></div></div>}
        </section>}

        {section === 'keywords' && <>
          <section className="ws-search-panel ws-keyword-search" aria-label="Analyze a keyword"><form onSubmit={analyze}>
            <label className="ws-search-label" htmlFor="ws-keyword">Choose a keyword to research</label><div className="ws-search-row"><div className="ws-search-input"><PiTagBold /><input id="ws-keyword" value={keywordQuery} onChange={event => setKeywordQuery(event.target.value)} minLength={2} maxLength={100} required placeholder="e.g. printable wall art" /></div><button className="ws-button ws-primary" disabled={keywordLoading}>{keywordLoading ? 'Analyzing…' : 'Analyze keyword'}<PiArrowRightBold /></button></div><p className="ws-search-help">Related ideas come from tags on matching listings.</p>
          </form></section>
          {keywordError && <p className="ws-feedback ws-feedback-error" role="alert">{keywordError}</p>}
          <section className="ws-results"><div className="ws-results-header"><div><h2>Keyword ideas</h2><p>Compare matching listings and find related terms to explore.</p></div>{keywords && <label className="ws-competition-filter">Competition<select value={keywordLevel} onChange={event => setKeywordLevel(event.target.value)}><option value="all">All levels</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>}</div>
            {keywordLoading && <div className="ws-loading" role="status"><span className="ws-spinner" />Finding related keywords…</div>}
            {keywords && <div className="ws-keyword-table-wrap"><table className="ws-keyword-table"><thead><tr><th>Keyword</th><th>Matching listings</th><th>Competition</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{keywords.filter(item => keywordLevel === 'all' || item.level === keywordLevel).map(item => <tr key={item.keyword}><td><strong>{item.keyword}</strong></td><td>{number(item.results)}</td><td><span className={`ws-competition ws-competition-${item.level}`}>{item.level} · {item.score}/100</span></td><td><div className="ws-keyword-actions"><button className="ws-icon-button" aria-label={`Copy keyword: ${item.keyword}`} onClick={async () => { try { await navigator.clipboard.writeText(item.keyword); setKeywordMessage('Keyword copied.'); } catch { setKeywordMessage('Select the keyword text to copy it.'); } }}><PiCopyBold /></button><button className="ws-button ws-secondary" onClick={() => researchKeyword(item.keyword)}>Explore<PiArrowRightBold /></button></div></td></tr>)}</tbody></table>{!keywords.some(item => keywordLevel === 'all' || item.level === keywordLevel) && <p className="ws-table-empty">No keywords at this competition level. Try another level.</p>}</div>}
            {!keywords && !keywordLoading && <div className="ws-empty"><span className="ws-empty-icon"><PiTagBold /></span><h3>Give your idea a starting word.</h3><p>Enter a keyword to see related tags and listing competition.</p></div>}
            {keywordMessage && <p className="ws-keyword-message" role="status">{keywordMessage}</p>}
          </section>
          <details className="ws-guide"><summary>What does the competition score mean?</summary><p>It compares the number of matching listings using: 100 × matching listings ÷ (matching listings + 10,000). Low: 0–33, medium: 34–66, high: 67–100. It measures listing competition; it does not measure search demand or predict sales. Related tags come from the first 24 matching listings.</p></details>
        </>}
        <footer className="ws-footer"><span>Research with PNG Scout</span><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a></div><p>The term &apos;Etsy&apos; is a trademark of Etsy, Inc. This Application uses Etsy&apos;s API, but is not endorsed or certified by Etsy.</p></footer>
      </main>
    </div>
    <dialog ref={dialog} className="ws-dialog" aria-labelledby="ws-detail-title" onCancel={() => setSelected(null)} onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) setSelected(null); }}>
      {selected && <><div className="ws-dialog-top"><span>Listing details</span><button className="ws-icon-button" aria-label="Close listing details" onClick={() => setSelected(null)}><PiXBold /></button></div>
        <div className="ws-detail-grid"><div className="ws-detail-image"><ProductImage product={selected} /></div><div className="ws-detail-copy"><span className="ws-detail-type">{selected.isDigital ? 'Digital download' : 'Etsy listing'}</span><h2 id="ws-detail-title">{selected.title}</h2><strong className="ws-detail-price">{price(selected)}</strong><div className="ws-detail-metrics"><div><PiHeartBold /><strong>{number(selected.favorites)}</strong><span>Favorites</span></div><div><PiClockBold /><strong>{number(selected.age)} days</strong><span>Listing age</span></div></div><p className="ws-listing-id">Listing #{selected.id}{selected.shopName && ` · ${selected.shopName}`}</p><div className="ws-detail-actions"><a className="ws-button ws-primary" href={selected.url} target="_blank" rel="noopener noreferrer">View on Etsy<PiArrowSquareOutBold /></a>{saveButton(selected, 'ws-detail-save')}</div></div></div>
        {actionMessage && <p className="ws-feedback" role="status">{actionMessage}</p>}
        {selected.tags.length > 0 && <section className="ws-detail-section"><h3>Explore these tags</h3><div className="ws-tags">{selected.tags.map(tag => <button key={tag} onClick={() => researchKeyword(tag)}>{tag}<PiArrowRightBold /></button>)}</div></section>}
        {selected.description && <details className="ws-description"><summary>Listing description</summary><p>{selected.description}</p></details>}
        <section className="ws-detail-section ws-history"><div className="ws-history-heading"><h3>Price &amp; favorite history</h3>{savedIds.has(selected.id) && <button className="ws-button ws-secondary" onClick={() => void refreshListing()} disabled={refreshing}><PiArrowClockwiseBold />{refreshing ? 'Refreshing…' : 'Refresh listing'}</button>}</div>
          {!savedIds.has(selected.id) ? <p>Save this listing to start collecting daily price and favorite snapshots.</p> : <><p>Refresh a saved listing to record today’s values. Your history covers the past 30 days.</p>{historyLoading ? <p role="status">Loading history…</p> : snapshots.length ? <div className="ws-history-table-wrap"><table><thead><tr><th>Date</th><th>Price</th><th>Favorites</th></tr></thead><tbody>{snapshots.map(snapshot => <tr key={snapshot.capturedAt}><td>{date(snapshot.capturedAt)}</td><td>{price(snapshot)}</td><td>{number(snapshot.favorites)}</td></tr>)}</tbody></table></div> : <p className="ws-history-empty">Refresh this listing to capture your first snapshot.</p>}{historyError && <p className="ws-feedback ws-feedback-error" role="alert">{historyError}</p>}</>}
        </section></>}
    </dialog>
  </div>;
}
