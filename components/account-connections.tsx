'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PiPlugBold, PiArrowSquareOutBold, PiArrowClockwiseBold, PiCheckCircleBold, PiWarningCircleBold, PiLockKeyBold, PiEnvelopeSimpleBold, PiStorefrontBold, PiPaperPlaneTiltBold } from 'react-icons/pi';
import './account-connections.css';

type Provider = 'etsy' | 'pinterest' | 'email';
type Status = { provider: Provider; configured: boolean; connected: boolean; label: string | null; connectedAt: string | null; permissions: string[]; recipient?: string };
type Feedback = { kind: 'success' | 'error'; text: string } | null;
type Money = { amount: number; currency: string };
type ShopOverview = { shop: { id: string; name: string; url: string; activeListings: number | null; totalTransactions: number | null }; periodDays: number; matchingOrders: number | null; loadedOrders: number; hasMore: boolean; paidOrders: number; awaitingShipment: number; paidOrderTotals: Money[]; note: string; orders: { id: string; status: string; createdAt: string | null; total: Money | null; processingFee: Money | null }[] };
const providers: Provider[] = ['etsy', 'pinterest', 'email'];
const names = { etsy: 'Etsy shop', pinterest: 'Pinterest', email: 'Email delivery' };
const descriptions = { etsy: 'Read your own shop and recent orders, with your permission.', pinterest: 'Publish a pin from your own Etsy listing to a board you choose.', email: 'Preview a draft and test delivery to your own account email.' };
const icons = { etsy: PiStorefrontBold, pinterest: PiPaperPlaneTiltBold, email: PiEnvelopeSimpleBold };
function FeedbackMessage({ value }: { value: Feedback }) {
  return value ? <div className={`ac-feedback ${value.kind}`} role={value.kind === 'error' ? 'alert' : 'status'}>{value.kind === 'error' ? <PiWarningCircleBold aria-hidden="true" /> : <PiCheckCircleBold aria-hidden="true" />}<span>{value.text}</span></div> : null;
}
function money(value: Money | null) {
  if (!value) return 'Unavailable';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: value.currency }).format(value.amount); }
  catch { return `${value.amount.toFixed(2)} ${value.currency}`; }
}
function date(value: string | null) { if (!value) return 'Unavailable'; const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString() : 'Unavailable'; }
async function api<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try { response = await fetch(url, body === undefined ? { cache: 'no-store', signal } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }); }
  catch (error) { if ((error as Error).name === 'AbortError') throw error; throw Error('Could not connect. Please try again.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(typeof data.error === 'string' ? data.error : 'The request could not be completed. Please retry.');
  return data as T;
}

export function AccountConnections() {
  const [statuses, setStatuses] = useState<Partial<Record<Provider, Status>>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<Provider, string>>>({});
  const [busy, setBusy] = useState<Partial<Record<Provider, boolean>>>({});
  const [message, setMessage] = useState<Feedback>(null);
  const [remove, setRemove] = useState<Provider | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [shop, setShop] = useState<ShopOverview | null>(null);
  const [shopMessage, setShopMessage] = useState<Feedback>(null);
  const [shopBusy, setShopBusy] = useState(false);
  const [boards, setBoards] = useState<{ id: string; name: string }[]>([]);
  const [boardsLoaded, setBoardsLoaded] = useState(false);
  const [boardsBusy, setBoardsBusy] = useState(false);
  const [boardsMore, setBoardsMore] = useState(false);
  const [pin, setPin] = useState({ boardId: '', title: '', description: '', link: '', imageUrl: '', confirmPublish: false });
  const [pinBusy, setPinBusy] = useState(false);
  const [listingBusy, setListingBusy] = useState(false);
  const [listingImages, setListingImages] = useState<string[]>([]);
  const [pinMessage, setPinMessage] = useState<Feedback>(null);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [emailDraft, setEmailDraft] = useState({ subject: 'My shop update', text: '', confirmSend: false });
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState<Feedback>(null);
  const emailRequestId = useRef('');
  const shopGeneration = useRef(0);
  const boardsGeneration = useRef(0);
  const formBusy = pinBusy || emailBusy || shopBusy || boardsBusy || listingBusy;
  const listingGeneration = useRef(0);
  const pinLinkRef = useRef('');

  useEffect(() => {
    const controller = new AbortController(); let live = true;
    void Promise.allSettled(providers.map(async provider => {
      try {
        const status = await api<Status>(`/api/connections/${provider}`, undefined, controller.signal);
        if (live) setStatuses(current => ({ ...current, [provider]: status }));
      } catch (error) { if (live && (error as Error).name !== 'AbortError') setErrors(current => ({ ...current, [provider]: (error as Error).message })); }
    })).finally(() => { if (live) setLoading(false); });
    const params = new URLSearchParams(window.location.search);
    const provider = params.get('connection'); const result = params.get('result');
    if (providers.includes(provider as Provider) && ['connected', 'cancelled', 'failed'].includes(result || '')) {
      setMessage({ kind: result === 'connected' ? 'success' : 'error', text: result === 'connected' ? `${names[provider as Provider]} connected. You can use the tools below.` : result === 'cancelled' ? 'The account connection was cancelled. You can try again whenever you are ready.' : 'The account connection could not be completed. Start again and approve the requested permissions.' });
      const cleaned = new URL(window.location.href); cleaned.searchParams.delete('connection'); cleaned.searchParams.delete('result'); window.history.replaceState(null, '', cleaned);
    }
    return () => { live = false; controller.abort(); shopGeneration.current++; boardsGeneration.current++; listingGeneration.current++; };
  }, []);
  useEffect(() => { if (remove && dialog.current && !dialog.current.open) dialog.current.showModal(); else if (!remove && dialog.current?.open) { dialog.current.close(); heading.current?.focus(); } }, [remove]);

  async function updateStatus(provider: Provider) {
    const status = await api<Status>(`/api/connections/${provider}`);
    setStatuses(current => ({ ...current, [provider]: status })); setErrors(current => ({ ...current, [provider]: '' }));
  }
  async function connect(provider: Provider) {
    if (busy[provider] || formBusy) return;
    setBusy(current => ({ ...current, [provider]: true })); setErrors(current => ({ ...current, [provider]: '' }));
    try {
      const result = await api<{ url?: string; connected?: boolean }>(`/api/connections/${provider}`, { action: 'connect' });
      if (result.url) {
        const url = new URL(result.url);
        if (url.protocol !== 'https:' || !['www.etsy.com', 'www.pinterest.com'].includes(url.hostname)) throw Error('The account connection could not be started. Please retry.');
        window.location.assign(url.toString()); return;
      }
      await updateStatus(provider); setMessage({ kind: 'success', text: 'Email delivery testing enabled. You can send a draft to yourself below.' });
    } catch (error) { setErrors(current => ({ ...current, [provider]: (error as Error).message })); }
    finally { setBusy(current => ({ ...current, [provider]: false })); }
  }
  async function disconnect(provider: Provider) {
    if (busy[provider] || formBusy) return;
    setBusy(current => ({ ...current, [provider]: true }));
    try {
      await api(`/api/connections/${provider}`, { action: 'disconnect' });
      if (provider === 'etsy') { shopGeneration.current++; listingGeneration.current++; setShop(null); setShopMessage(null); setListingImages([]); }
      if (provider === 'pinterest') { boardsGeneration.current++; setBoards([]); setBoardsLoaded(false); setPinMessage(null); setPublishedUrl(''); }
      if (provider === 'email') { setEmailMessage(null); emailRequestId.current = ''; }
      setStatuses(current => current[provider] ? ({ ...current, [provider]: { ...current[provider]!, connected: false, label: null, connectedAt: null, permissions: [] } }) : current);
      setMessage({ kind: 'success', text: `${names[provider]} disconnected from PNG Scout.` }); setRemove(null);
      setErrors(current => ({ ...current, [provider]: '' }));
    } catch (error) { setErrors(current => ({ ...current, [provider]: (error as Error).message })); setRemove(null); }
    finally { setBusy(current => ({ ...current, [provider]: false })); }
  }
  async function retry(provider: Provider) {
    setBusy(current => ({ ...current, [provider]: true }));
    try { await updateStatus(provider); } catch (error) { setErrors(current => ({ ...current, [provider]: (error as Error).message })); }
    finally { setBusy(current => ({ ...current, [provider]: false })); }
  }
  async function loadShop() {
    if (formBusy || busy.etsy) return; const generation = ++shopGeneration.current;
    setShopBusy(true); setShopMessage(null);
    try { const result = await api<ShopOverview>('/api/connections/etsy?view=shop'); if (generation === shopGeneration.current) setShop(result); }
    catch (error) { if (generation === shopGeneration.current) setShopMessage({ kind: 'error', text: (error as Error).message }); }
    finally { if (generation === shopGeneration.current) setShopBusy(false); }
  }
  async function loadBoards() {
    if (formBusy || busy.pinterest) return; const generation = ++boardsGeneration.current;
    setBoardsBusy(true); setPinMessage(null);
    try {
      const result = await api<{ boards: { id: string; name: string }[]; hasMore: boolean }>('/api/connections/pinterest?view=boards');
      if (generation === boardsGeneration.current) { setBoards(result.boards); setBoardsMore(result.hasMore); setBoardsLoaded(true); setPin(current => ({ ...current, boardId: result.boards.some(board => board.id === current.boardId) ? current.boardId : result.boards[0]?.id || '' })); }
    } catch (error) { if (generation === boardsGeneration.current) setPinMessage({ kind: 'error', text: (error as Error).message }); }
    finally { if (generation === boardsGeneration.current) setBoardsBusy(false); }
  }
  async function publishPin(event: FormEvent) {
    event.preventDefault(); if (pinBusy || formBusy || busy.pinterest || busy.etsy) return;
    setPinBusy(true); setPinMessage(null); setPublishedUrl('');
    try {
      const result = await api<{ url: string }>('/api/connections/pinterest/publish', pin);
      setPublishedUrl(result.url); setPinMessage({ kind: 'success', text: 'Your pin was published to Pinterest.' }); setPin(current => ({ ...current, confirmPublish: false }));
    } catch (error) { setPinMessage({ kind: 'error', text: (error as Error).message }); }
    finally { setPinBusy(false); }
  }
  async function loadListing() {
    if (formBusy || !pin.link.trim()) return;
    const link = pin.link; const generation = ++listingGeneration.current;
    setListingBusy(true); setPinMessage(null); setPublishedUrl('');
    try {
      const result = await api<{ title: string; description: string; imageUrls: string[]; url: string }>(`/api/connections/etsy?view=listing&url=${encodeURIComponent(link)}`);
      if (generation === listingGeneration.current && pinLinkRef.current === link) {
        pinLinkRef.current = result.url; setListingImages(result.imageUrls);
        setPin(current => ({ ...current, link: result.url, title: result.title, description: result.description, imageUrl: result.imageUrls[0] || '', confirmPublish: false }));
        if (!result.imageUrls.length) setPinMessage({ kind: 'error', text: 'This listing has no usable images. Add an image in Etsy and load the listing again.' });
      }
    } catch (error) { if (generation === listingGeneration.current) setPinMessage({ kind: 'error', text: (error as Error).message }); }
    finally { if (generation === listingGeneration.current) setListingBusy(false); }
  }
  async function sendTest(event: FormEvent) {
    event.preventDefault(); if (emailBusy || formBusy || busy.email) return;
    setEmailBusy(true); setEmailMessage(null); emailRequestId.current ||= crypto.randomUUID();
    try {
      const result = await api<{ recipient: string }>('/api/connections/email/send', { ...emailDraft, requestId: emailRequestId.current });
      setEmailMessage({ kind: 'success', text: `Resend accepted your test email for ${result.recipient}. Check your inbox.` }); emailRequestId.current = ''; setEmailDraft(current => ({ ...current, confirmSend: false }));
    } catch (error) { setEmailMessage({ kind: 'error', text: (error as Error).message }); }
    finally { setEmailBusy(false); }
  }

  return <div className="ac-shell" id="connections">
    <div className="ac-heading"><span className="ac-kicker"><PiPlugBold aria-hidden="true" />YOUR CONNECTED ACCOUNTS</span><h2 ref={heading} tabIndex={-1}>A workspace that connects to your shop.</h2><p>Choose what to connect, approve the permissions, and decide when to publish or send.</p></div>
    <FeedbackMessage value={message} />
    <div className="ac-cards" aria-busy={loading}>{providers.map(provider => {
      const status = statuses[provider]; const Icon = icons[provider];
      return <section className="ac-card" key={provider} aria-labelledby={`ac-${provider}-title`}>
        <div className="ac-card-top"><span className={`ac-provider-icon ac-${provider}`}><Icon aria-hidden="true" /></span><span className={`ac-badge ${status?.connected ? 'connected' : ''}`}>{loading && !status ? 'Loading…' : status?.connected ? 'Connected' : 'Not connected'}</span></div>
        <h3 id={`ac-${provider}-title`}>{names[provider]}</h3><p>{descriptions[provider]}</p>
        {status?.connected && <div className="ac-account"><PiCheckCircleBold aria-hidden="true" /><span>{status.label || 'Account connected'}</span></div>}
        {!loading && status && !status.configured && <p className="ac-unavailable">This connection is not available yet. Check back shortly.</p>}
        <div className="ac-card-actions">{status ? <>
          <button className="ac-button ac-primary" disabled={!status.configured || !!busy[provider] || formBusy || (provider === 'email' && status.connected)} onClick={() => void connect(provider)}>{busy[provider] ? 'Please wait…' : status.connected ? provider === 'email' ? 'Testing enabled' : 'Reconnect' : provider === 'email' ? 'Enable email testing' : `Connect ${provider === 'etsy' ? 'Etsy' : 'Pinterest'}`}<PiArrowSquareOutBold aria-hidden="true" /></button>
          {status.connected && <button className="ac-disconnect" disabled={!!busy[provider] || formBusy} onClick={() => setRemove(provider)}>Disconnect</button>}
        </> : !loading && <button className="ac-button ac-secondary" disabled={!!busy[provider]} onClick={() => void retry(provider)}><PiArrowClockwiseBold aria-hidden="true" />Retry connection status</button>}</div>
        <FeedbackMessage value={errors[provider] ? { kind: 'error', text: errors[provider]! } : null} />
      </section>;
    })}</div>
    <div className="ac-privacy-note"><PiLockKeyBold aria-hidden="true" /><p>Your authorization stays private. Disconnect removes PNG Scout’s saved access. You can also revoke the app’s permissions in Etsy or Pinterest.</p></div>
    <div className="ac-tool-heading"><div><h3>Send an update to your subscribers.</h3><p>Campaigns use your own Resend account, verified sender, and opted-in contact list.</p></div><a className="ac-button ac-secondary" href="/workspace?section=campaigns"><PiEnvelopeSimpleBold aria-hidden="true" />Open email campaigns</a></div>

    {statuses.etsy?.connected && <section className="ac-tool" aria-labelledby="ac-shop-title"><div className="ac-tool-heading"><div><span className="ac-tool-kicker">YOUR ETSY SHOP</span><h3 id="ac-shop-title">Recent activity, directly from Etsy.</h3><p>Load a snapshot of your own shop and its latest orders from the past 30 days.</p></div><button className="ac-button ac-secondary" disabled={formBusy || !!busy.etsy || !statuses.etsy.configured} onClick={() => void loadShop()}><PiArrowClockwiseBold aria-hidden="true" />{shopBusy ? 'Loading your shop…' : shop ? 'Refresh overview' : 'Load shop overview'}</button></div>
      <FeedbackMessage value={shopMessage} />
      {shop && <><div className="ac-shop-name"><strong>{shop.shop.name}</strong><a href={shop.shop.url} target="_blank" rel="noopener noreferrer">Visit your shop<PiArrowSquareOutBold aria-hidden="true" /></a></div><div className="ac-shop-stats"><div><span>Active listings</span><strong>{shop.shop.activeListings ?? 'Unavailable'}</strong></div><div><span>Paid orders returned</span><strong>{shop.paidOrders}</strong></div><div><span>Awaiting shipment</span><strong>{shop.awaitingShipment}</strong></div><div><span>Paid order totals</span><strong>{shop.paidOrderTotals.length ? shop.paidOrderTotals.map(money).join(' / ') : shop.paidOrders === 0 ? 'No paid orders' : 'Unavailable'}</strong></div></div>
        <p className="ac-field-help">{shop.hasMore ? `Showing the latest ${shop.loadedOrders} of ${shop.matchingOrders} orders from the past ${shop.periodDays} days.` : `Based on ${shop.loadedOrders} orders from the past ${shop.periodDays} days.`}</p>
        {shop.orders.length > 0 ? <div className="ac-table-wrap" tabIndex={0} role="region" aria-label="Recent Etsy orders"><table className="ac-orders"><caption>Latest orders</caption><thead><tr><th scope="col">Order</th><th scope="col">Date</th><th scope="col">Status</th><th scope="col">Order total</th><th scope="col">Processing fee</th></tr></thead><tbody>{shop.orders.map(order => <tr key={order.id}><th scope="row">#{order.id}</th><td>{date(order.createdAt)}</td><td>{order.status}</td><td>{money(order.total)}</td><td>{money(order.processingFee)}</td></tr>)}</tbody></table></div> : <div className="ac-empty">No orders were returned for this period.</div>}<p className="ac-field-help ac-summary-note">{shop.note}</p></>}
    </section>}

    {statuses.pinterest?.connected && <section className="ac-tool" aria-labelledby="ac-pin-title"><div className="ac-tool-heading"><div><span className="ac-tool-kicker">PINTEREST PUBLISHING</span><h3 id="ac-pin-title">Turn your own listing into a pin.</h3><p>Choose a public board and an image from a listing in your connected Etsy shop.</p></div><button className="ac-button ac-secondary" disabled={formBusy || !!busy.pinterest || !statuses.pinterest.configured} onClick={() => void loadBoards()}><PiArrowClockwiseBold aria-hidden="true" />{boardsBusy ? 'Loading boards…' : boardsLoaded ? 'Refresh boards' : 'Load your boards'}</button></div>
      {!statuses.etsy?.connected && <p className="ac-inline-note">Connect your Etsy shop above to publish one of your listings.</p>}
      {boardsLoaded && !boards.length && <p className="ac-inline-note">No public boards were returned. Create a public board in Pinterest, then refresh your boards.</p>}
      {boardsMore && <p className="ac-field-help">Showing the first 100 public boards.</p>}
      <form className="ac-form" onSubmit={publishPin}>
        <fieldset disabled={formBusy || !statuses.etsy?.connected || !statuses.etsy?.configured || !statuses.pinterest.configured || !!busy.pinterest || !!busy.etsy}>
          <legend className="ac-sr-only">Pin details</legend>
          <div className="ac-import-listing"><label htmlFor="ac-listing-link">Your Etsy listing link<input id="ac-listing-link" type="url" required maxLength={2048} value={pin.link} onChange={event => { pinLinkRef.current = event.target.value; listingGeneration.current++; setListingImages([]); setPinMessage(null); setPin(current => ({ ...current, link: event.target.value, imageUrl: '', confirmPublish: false })); }} placeholder="https://www.etsy.com/listing/…" /></label><button className="ac-button ac-secondary" type="button" disabled={!pin.link.trim()} onClick={() => void loadListing()}>{listingBusy ? 'Loading listing…' : 'Load listing details'}</button></div>
          <p className="ac-field-help">Load a listing from your connected Etsy shop to choose one of its real product images.</p>
          {listingImages.length > 0 && <div className="ac-image-picker" role="group" aria-label="Choose the pin image">{listingImages.map((image, index) => <button key={image} type="button" className={pin.imageUrl === image ? 'selected' : ''} aria-label={`Use listing image ${index + 1}`} aria-pressed={pin.imageUrl === image} onClick={() => setPin(current => ({ ...current, imageUrl: image, confirmPublish: false }))}><img src={image} alt={`Listing image ${index + 1}`} loading="lazy" /><span>Image {index + 1}</span></button>)}</div>}
          <div className="ac-fields"><label htmlFor="ac-board">Public Pinterest board<select id="ac-board" required value={pin.boardId} onChange={event => setPin(current => ({ ...current, boardId: event.target.value, confirmPublish: false }))}><option value="">{boardsLoaded ? 'Choose a board' : 'Load your boards first'}</option>{boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}</select></label><label htmlFor="ac-pin-title-input">Pin title<input id="ac-pin-title-input" maxLength={100} required value={pin.title} onChange={event => setPin(current => ({ ...current, title: event.target.value, confirmPublish: false }))} placeholder="Describe your product" /></label><label className="ac-full-width" htmlFor="ac-pin-description">Description<textarea id="ac-pin-description" rows={3} maxLength={800} value={pin.description} onChange={event => setPin(current => ({ ...current, description: event.target.value, confirmPublish: false }))} placeholder="Tell shoppers about this product" /></label></div>
          <label className="ac-confirm"><input type="checkbox" required checked={pin.confirmPublish} onChange={event => setPin(current => ({ ...current, confirmPublish: event.target.checked }))} /><span>Publish this pin to my selected board now.</span></label><button className="ac-button ac-primary" type="submit" disabled={!pin.boardId || !pin.imageUrl || !pin.confirmPublish}><PiPaperPlaneTiltBold aria-hidden="true" />{pinBusy ? 'Publishing…' : 'Publish pin'}</button>
        </fieldset>
      </form><FeedbackMessage value={pinMessage} />{publishedUrl && <a className="ac-result-link" href={publishedUrl} target="_blank" rel="noopener noreferrer">View your published pin<PiArrowSquareOutBold aria-hidden="true" /></a>}
    </section>}

    {statuses.email?.connected && <section className="ac-tool" aria-labelledby="ac-email-title"><div className="ac-tool-heading"><div><span className="ac-tool-kicker">EMAIL DELIVERY TEST</span><h3 id="ac-email-title">See your draft in your own inbox.</h3><p>Send one test through Resend to your signed-in email. Use Email campaigns to reach your opted-in subscribers.</p></div></div><div className="ac-email-layout"><form className="ac-form" onSubmit={sendTest}><fieldset disabled={formBusy || !!busy.email || !statuses.email.configured}><legend className="ac-sr-only">Test email draft</legend><label htmlFor="ac-recipient">Test recipient<input id="ac-recipient" type="email" readOnly value={statuses.email.recipient || statuses.email.label || ''} /><span className="ac-field-help">Tests can only be sent to your own signed-in account.</span></label><label htmlFor="ac-email-subject">Subject<input id="ac-email-subject" required maxLength={150} value={emailDraft.subject} onChange={event => { emailRequestId.current = ''; setEmailDraft(current => ({ ...current, subject: event.target.value, confirmSend: false })); }} /></label><label htmlFor="ac-email-text">Email text<textarea id="ac-email-text" rows={6} required maxLength={8000} value={emailDraft.text} onChange={event => { emailRequestId.current = ''; setEmailDraft(current => ({ ...current, text: event.target.value, confirmSend: false })); }} placeholder="Write your message here…" /></label><label className="ac-confirm"><input type="checkbox" required checked={emailDraft.confirmSend} onChange={event => setEmailDraft(current => ({ ...current, confirmSend: event.target.checked }))} /><span>Send this test email to me now.</span></label><button className="ac-button ac-primary" type="submit" disabled={!emailDraft.confirmSend}><PiEnvelopeSimpleBold aria-hidden="true" />{emailBusy ? 'Sending test…' : 'Send test to myself'}</button><p className="ac-field-help">One test per minute, up to ten per day. Provider sending limits also apply.</p></fieldset></form><aside className="ac-email-preview" aria-label="Email draft preview"><span>EMAIL PREVIEW</span><h4>{emailDraft.subject || 'Your email subject'}</h4><p>{emailDraft.text || 'Your draft text will appear here as you type.'}</p></aside></div><FeedbackMessage value={emailMessage} /></section>}

    <dialog ref={dialog} className="ac-dialog" aria-labelledby="ac-disconnect-title" aria-describedby="ac-disconnect-description" onCancel={event => { if (remove && busy[remove]) event.preventDefault(); else setRemove(null); }} onClose={() => { if (!(remove && busy[remove])) setRemove(null); }}><span className="ac-provider-icon"><PiPlugBold aria-hidden="true" /></span><h3 id="ac-disconnect-title">Disconnect {remove ? names[remove] : 'this account'}?</h3><p id="ac-disconnect-description">PNG Scout will remove its saved access. Existing Etsy listings, published pins, and sent emails stay in their respective accounts.</p><div className="ac-dialog-actions"><button className="ac-button ac-secondary" autoFocus disabled={!!(remove && busy[remove])} onClick={() => setRemove(null)}>Keep connected</button><button className="ac-button ac-danger" disabled={!!(remove && busy[remove])} onClick={() => { if (remove) void disconnect(remove); }}>{remove && busy[remove] ? 'Disconnecting…' : 'Disconnect'}</button></div></dialog>
  </div>;
}
