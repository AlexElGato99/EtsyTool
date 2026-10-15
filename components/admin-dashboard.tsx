'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  PiSquaresFourBold, PiPlugBold, PiSlidersHorizontalBold, PiEnvelopeSimpleBold,
  PiArrowRightBold, PiArrowSquareOutBold, PiShieldCheckBold, PiCheckCircleBold,
  PiWarningCircleBold, PiClockBold, PiListBold, PiFileTextBold,
  PiLockKeyBold, PiEyeBold, PiEyeSlashBold, PiKeyBold, PiTrashBold,
  PiArrowClockwiseBold, PiHouseBold, PiSignOutBold, PiCaretRightBold,
  PiInfoBold, PiXBold, PiFloppyDiskBold,
} from 'react-icons/pi';
import { BrandMark } from './site-icon';
import EtsyAccessSettings, { type EtsyAccess } from './etsy-access-settings';
import './admin-dashboard.css';

type Tab = 'overview' | 'integration' | 'workspace' | 'contact' | 'services';
type AppSettings = { name: string; defaultView: 'grid' | 'list'; allowExport: boolean; showEstimates: boolean };
type PublicContact = { email: string; operatorName: string };
type Connection = { ok: boolean; checkedAt: string } | null;
type Settings = { app: AppSettings; publicContact: PublicContact; credentialsSaved: boolean; connection: Connection };
type Feedback = { kind: 'success' | 'error'; text: string } | null;
const tabs = [
  { id: 'overview', title: 'Overview', icon: PiSquaresFourBold },
  { id: 'integration', title: 'Etsy integration', icon: PiPlugBold },
  { id: 'workspace', title: 'Workspace details', icon: PiSlidersHorizontalBold },
  { id: 'contact', title: 'Public contact', icon: PiEnvelopeSimpleBold },
  { id: 'services', title: 'Etsy review & data', icon: PiShieldCheckBold },
] as const;
const headings: Record<Tab, { title: string; description: string; kicker: string }> = {
  overview: { title: 'Your app, thoughtfully managed.', description: 'A clear view of Etsy access, the listing workspace, and public contact details.', kicker: 'OWNER OVERVIEW' },
  integration: { title: 'Manage your application credentials.', description: 'Save credentials for the declared seller-owned listing purpose. Etsy access requires approval.', kicker: 'ETSY INTEGRATION' },
  workspace: { title: 'Know what your workspace supports.', description: 'Review account limits, storage, and the tools available to your users.', kicker: 'WORKSPACE DETAILS' },
  contact: { title: 'Make it easy to reach you.', description: 'Keep the contact details on your public and legal pages up to date.', kicker: 'PUBLIC CONTACT' },
  services: { title: 'Keep access aligned with approval.', description: 'Record existing Etsy approval, withdraw access, and review legacy-data cleanup.', kicker: 'ETSY REVIEW & DATA' },
};
function checkedAt(value: string | undefined) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'No connection test recorded';
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
async function request<T>(url: string, body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(url, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  catch { throw new Error('Could not connect. Check your connection and try again.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed. Please try again.');
  return data as T;
}
function Message({ feedback }: { feedback: Feedback }) {
  return feedback ? <div className={`ad-feedback ${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
    {feedback.kind === 'success' ? <PiCheckCircleBold /> : <PiWarningCircleBold />}<span>{feedback.text}</span>
  </div> : null;
}

export default function AdminDashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [etsyAccess, setEtsyAccess] = useState<EtsyAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [contact, setContact] = useState<PublicContact>({ email: '', operatorName: '' });
  const [key, setKey] = useState('');
  const [secret, setSecret] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [integrationBusy, setIntegrationBusy] = useState<'' | 'save' | 'test' | 'remove'>('');
  const [contactSaving, setContactSaving] = useState(false);
  const [integrationMessage, setIntegrationMessage] = useState<Feedback>(null);
  const [contactMessage, setContactMessage] = useState<Feedback>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState<Feedback>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const restoreMenuFocus = useRef(false);
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const contactDirty = !!settings && (contact.email !== settings.publicContact.email || contact.operatorName !== settings.publicContact.operatorName);
  const credentialsEntered = !!(key || secret);
  const heading = headings[tab];
  const connection = settings?.connection;
  const credentialsSaved = settings?.credentialsSaved === true;
  const connectionTitle = !credentialsSaved ? 'No credentials saved' : !etsyAccess?.available ? 'Access disabled · approval required' : !connection ? 'Approved credentials · ready to test' : connection.ok ? 'Last connection test passed' : 'Last connection test failed';
  const connectionTone = !credentialsSaved || !etsyAccess?.available || !connection ? 'is-neutral' : connection.ok ? 'is-connected' : 'is-error';

  function updateEtsyAccess(access: EtsyAccess) {
    setEtsyAccess(access);
    setSettings(current => current ? { ...current, credentialsSaved: access.configured, connection: access.available ? current.connection : null } : current);
  }

  async function loadSettings() {
    setLoading(true); setLoadError('');
    try {
      const data = await request<Settings>('/api/admin/settings');
      setSettings(data); setContact(data.publicContact);
      try { const review = await request<{ access: EtsyAccess }>('/api/admin/etsy-access'); setEtsyAccess(review.access); } catch { setEtsyAccess(null); }
    } catch (error) { setLoadError((error as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadSettings(); }, []);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => { setMobile(media.matches); if (!media.matches) setNavOpen(false); };
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (navOpen && mobile) sidebar.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    else if (!navOpen && restoreMenuFocus.current) { if (mobile) menuButton.current?.focus(); restoreMenuFocus.current = false; }
  }, [navOpen, mobile]);
  useEffect(() => {
    if (!mobile || !navOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [navOpen, mobile]);
  useEffect(() => {
    if (confirmRemove && confirmDialog.current && !confirmDialog.current.open) confirmDialog.current.showModal();
    if (!confirmRemove && confirmDialog.current?.open) confirmDialog.current.close();
  }, [confirmRemove]);
  function closeNav() { restoreMenuFocus.current = true; setNavOpen(false); }
  function selectTab(next: Tab) { setTab(next); if (mobile) closeNav(); }
  function tabKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowDown') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault(); setTab(tabs[next].id); tabButtons.current[next]?.focus();
  }
  function sidebarKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (!mobile || !navOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); closeNav(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...(sidebar.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') || [])].filter(el => el.tabIndex >= 0 && el.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  async function saveCredentials(event: FormEvent) {
    event.preventDefault(); if (integrationBusy || !settings) return;
    setIntegrationBusy('save'); setIntegrationMessage(null);
    try {
      const data = await request<{ credentialsSaved: boolean; connection: Connection }>('/api/admin/settings', { action: 'credentials', key, secret });
      setSettings(current => current ? { ...current, credentialsSaved: data.credentialsSaved, connection: data.connection } : current);
      setKey(''); setSecret(''); setShowKey(false); setShowSecret(false);
      setEtsyAccess(current => current ? { ...current, available: false, keyMatches: false, approved: false, state: 'pending', configured: true } : current);
      setIntegrationMessage({ kind: 'success', text: 'Credentials saved securely. Review the approval record before enabling Etsy access.' });
    } catch (error) { setIntegrationMessage({ kind: 'error', text: (error as Error).message }); }
    finally { setIntegrationBusy(''); }
  }
  async function testConnection() {
    if (integrationBusy || !credentialsSaved || credentialsEntered || !etsyAccess?.available) return;
    setIntegrationBusy('test'); setIntegrationMessage(null);
    try {
      const data = await request<{ ok: boolean; checkedAt: string }>('/api/admin/test', {});
      setSettings(current => current ? { ...current, connection: data } : current);
      setIntegrationMessage({ kind: 'success', text: 'Connection test passed for the declared application access.' });
    } catch (error) {
      try {
        const saved = await request<Settings>('/api/admin/settings');
        setSettings(current => current ? { ...current, credentialsSaved: saved.credentialsSaved, connection: saved.connection } : current);
        const review = await request<{ access: EtsyAccess }>('/api/admin/etsy-access');
        setEtsyAccess(review.access);
      } catch {}
      setIntegrationMessage({ kind: 'error', text: (error as Error).message });
    } finally { setIntegrationBusy(''); }
  }
  async function removeCredentials() {
    if (integrationBusy) return;
    setIntegrationBusy('remove'); setIntegrationMessage(null);
    try {
      await request('/api/admin/settings', { action: 'removeCredentials' });
      setSettings(current => current ? { ...current, credentialsSaved: false, connection: null } : current);
      setKey(''); setSecret(''); setShowKey(false); setShowSecret(false); setConfirmRemove(false);
      setEtsyAccess(current => current ? { ...current, available: false, configured: false, keyMatches: false, approved: false, state: 'withdrawn' } : current);
      setIntegrationMessage({ kind: 'success', text: 'Saved Etsy credentials removed.' });
    } catch (error) { setIntegrationMessage({ kind: 'error', text: (error as Error).message }); setConfirmRemove(false); }
    finally { setIntegrationBusy(''); }
  }
  async function saveContact(event: FormEvent) {
    event.preventDefault(); if (!settings || contactSaving) return;
    setContactSaving(true); setContactMessage(null);
    try {
      const data = await request<{ publicContact: PublicContact }>('/api/admin/settings', { action: 'publicContact', ...contact });
      setSettings(current => current ? { ...current, publicContact: data.publicContact } : current);
      setContact(data.publicContact);
      setContactMessage({ kind: 'success', text: 'Public contact details saved. They appear on the Contact, Privacy, and Terms pages.' });
    } catch (error) { setContactMessage({ kind: 'error', text: (error as Error).message }); }
    finally { setContactSaving(false); }
  }
  async function signOut() {
    setSigningOut(true); setLogoutMessage(null);
    try { await request('/api/auth/logout', {}); window.location.assign('/login'); }
    catch (error) { setLogoutMessage({ kind: 'error', text: (error as Error).message }); setSigningOut(false); }
  }

  return <div className="ad-shell">
    <a className="skip-link" href="#admin-main">Skip to dashboard</a>
    {mobile && navOpen && <button className="ad-nav-backdrop" aria-label="Close navigation" onClick={closeNav} tabIndex={-1} />}
    <aside ref={sidebar} id="admin-sidebar" className={`ad-sidebar ${navOpen ? 'is-open' : ''}`} aria-label="Admin navigation" aria-hidden={mobile && !navOpen} inert={mobile && !navOpen} onKeyDown={sidebarKeyboard}>
      <a className="brand ad-brand" href="/" aria-label="podadd home"><BrandMark /></a>
      <button className="ad-close-nav" aria-label="Close navigation" onClick={closeNav}><PiXBold /></button>
      <div className="ad-side-label">ADMINISTRATION</div>
      <div className="ad-tabs" role="tablist" aria-label="Admin sections" aria-orientation="vertical">
        {tabs.map((item, index) => <button key={item.id} ref={el => { tabButtons.current[index] = el; }} className="ad-tab" id={`ad-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`ad-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onKeyDown={event => tabKeyboard(event, index)} onClick={() => selectTab(item.id)}>
          <item.icon aria-hidden="true" /><span>{item.title}</span>
        </button>)}
      </div>
      <div className="ad-sidebar-bottom">
        <a className="ad-side-link" href="/workspace"><PiArrowSquareOutBold />Open workspace</a>
        <a className="ad-side-link" href="/"><PiHouseBold />Public website</a>
        <div className="ad-profile"><span className="ad-avatar" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span><div><strong>Owner account <PiShieldCheckBold /></strong><span title={email}>{email}</span></div></div>
        <button className="ad-signout" onClick={() => void signOut()} disabled={signingOut}><PiSignOutBold />{signingOut ? 'Signing out…' : 'Sign out'}</button>
      </div>
    </aside>
    <div className="ad-body" inert={mobile && navOpen}>
      <header className="ad-topbar"><div className="ad-breadcrumb"><button className="ad-menu-button" ref={menuButton} aria-label="Open admin navigation" aria-expanded={navOpen} aria-controls="admin-sidebar" onClick={() => setNavOpen(true)}><PiListBold /></button><span>Administration</span><PiCaretRightBold /><strong>{tabs.find(item => item.id === tab)?.title}</strong></div><div className="ad-top-actions"><a className="ad-button ad-secondary" href="/workspace" aria-label="Open workspace"><span className="ad-open-workspace-label">Open workspace</span><PiArrowSquareOutBold /></a></div></header>
      <main id="admin-main" className="ad-main">
        <div className="ad-heading"><span className="ad-kicker">{heading.kicker}</span><h1>{heading.title}</h1><p>{heading.description}</p></div>
        <Message feedback={logoutMessage} />
        <section className="ad-panel" id={`ad-panel-${tab}`} role="tabpanel" aria-labelledby={`ad-tab-${tab}`} tabIndex={0}>
          {loading ? <div className="ad-loading" role="status"><span className="ad-spinner" /><h2>Loading your settings</h2><p>Preparing your dashboard…</p></div> : loadError ? <div className="ad-card ad-load-error"><div className="ad-section-icon"><PiWarningCircleBold /></div><h2>Your settings could not be loaded.</h2><p>{loadError}</p><button className="ad-button ad-primary" onClick={() => void loadSettings()}><PiArrowClockwiseBold />Try again</button></div> : settings && <>

            {tab === 'overview' && <>
              <div className="ad-overview-cards">
                <button className="ad-stat-card" onClick={() => selectTab('integration')}><span className="ad-stat-icon"><PiPlugBold /></span><span className="ad-stat-label">Etsy integration</span><strong className="ad-stat-value">{!etsyAccess?.available ? 'Access disabled' : !connection ? 'Ready to test' : connection.ok ? 'Last test passed' : 'Needs attention'}</strong><span className="ad-stat-note">{!etsyAccess?.available ? 'Approved purpose and credentials are required' : connection ? checkedAt(connection.checkedAt) : 'Verify the approved credentials'}</span><PiArrowRightBold /></button>
                <button className="ad-stat-card" onClick={() => selectTab('workspace')}><span className="ad-stat-icon"><PiFileTextBold /></span><span className="ad-stat-label">Listing workspace</span><strong className="ad-stat-value">30 drafts per account</strong><span className="ad-stat-note">Encrypted, manually entered content</span><PiArrowRightBold /></button>
                <button className="ad-stat-card" onClick={() => selectTab('contact')}><span className="ad-stat-icon"><PiEnvelopeSimpleBold /></span><span className="ad-stat-label">Public contact</span><strong className="ad-stat-value ad-contact-value">{settings.publicContact.email}</strong><span className="ad-stat-note">{settings.publicContact.operatorName}</span><PiArrowRightBold /></button>
              </div>
              <div className="ad-overview-grid"><section className="ad-card"><div className="ad-card-heading"><h2>Manage your app</h2><p>Go straight to the settings you need.</p></div><div className="ad-quick-links">
                <button onClick={() => selectTab('integration')}><PiKeyBold /><div><strong>Etsy credentials</strong><span>Save or replace keys and test access.</span></div><PiArrowRightBold /></button>
                <button onClick={() => selectTab('workspace')}><PiSlidersHorizontalBold /><div><strong>Workspace details</strong><span>Review draft limits, tools, and account controls.</span></div><PiArrowRightBold /></button>
                <button onClick={() => selectTab('contact')}><PiEnvelopeSimpleBold /><div><strong>Public contact details</strong><span>Update your contact email and operator name.</span></div><PiArrowRightBold /></button>
                <button onClick={() => selectTab('services')}><PiShieldCheckBold /><div><strong>Etsy review &amp; data</strong><span>Record approval and manage access or legacy cleanup.</span></div><PiArrowRightBold /></button>
              </div></section><section className="ad-card"><div className="ad-card-heading"><h2>Connection checklist</h2><p>Keep access limited to the declared purpose.</p></div><div className="ad-checklist">
                <div>{credentialsSaved ? <PiCheckCircleBold /> : <PiKeyBold />}<div><strong>{credentialsSaved ? 'Credentials are saved' : 'Add your Etsy credentials'}</strong><span>Both the API key and shared secret are required.</span></div></div>
                <div>{etsyAccess?.available ? <PiCheckCircleBold /> : <PiClockBold />}<div><strong>{etsyAccess?.available ? 'Approval declaration recorded' : 'Obtain approval for the revised purpose'}</strong><span>Disclose png-scout’s change to podadd in the same application record.</span></div></div>
                <div>{connection?.ok && etsyAccess?.available ? <PiCheckCircleBold /> : <PiClockBold />}<div><strong>{connection?.ok && etsyAccess?.available ? 'Last test passed' : 'Verify approved API access'}</strong><span>{connection ? checkedAt(connection.checkedAt) : 'A test is available after approval is recorded.'}</span></div></div>
                <div><PiArrowSquareOutBold /><div><strong>Review the user workspace</strong><span>Review creating and saving a manual listing draft.</span></div></div>
              </div><a className="ad-button ad-secondary" href="/workspace">Open workspace<PiArrowSquareOutBold /></a></section></div>
            </>}

            {tab === 'integration' && <>
              <div className={`ad-connection-banner ${connectionTone}`}><PiPlugBold /><div><strong>{connectionTitle}</strong><p>{connection ? `Last checked ${checkedAt(connection.checkedAt)}. This is the result of your last manual test.` : 'Save credentials and record Etsy approval before testing access.'}</p></div><span className={`ad-badge ${connectionTone}`}>{credentialsSaved ? 'Credentials saved' : 'Not configured'}</span></div>
              <div className="ad-integration-layout"><section className="ad-card"><div className="ad-panel-heading"><span className="ad-section-icon"><PiKeyBold /></span><div><h2>{credentialsSaved ? 'Replace saved credentials' : 'Add Etsy credentials'}</h2><p>{credentialsSaved ? 'Enter both fields to replace the currently saved pair.' : 'Enter the approved key and shared secret for your Etsy application.'}</p></div></div>
                <form className="ad-form" onSubmit={saveCredentials}><div className="ad-fields"><label className="ad-full-width" htmlFor="ad-api-key">API key / keystring<div className="ad-password-field"><input id="ad-api-key" type={showKey ? 'text' : 'password'} value={key} onChange={event => { setKey(event.target.value); setIntegrationMessage(null); }} disabled={!!integrationBusy} autoComplete="off" spellCheck={false} required maxLength={1024} placeholder="Enter your Etsy API key" /><button type="button" aria-label={showKey ? 'Hide API key' : 'Show API key'} aria-pressed={showKey} disabled={!!integrationBusy} onClick={() => setShowKey(!showKey)}>{showKey ? <PiEyeSlashBold /> : <PiEyeBold />}</button></div></label>
                  <label className="ad-full-width" htmlFor="ad-api-secret">Shared secret<div className="ad-password-field"><input id="ad-api-secret" type={showSecret ? 'text' : 'password'} value={secret} onChange={event => { setSecret(event.target.value); setIntegrationMessage(null); }} disabled={!!integrationBusy} autoComplete="off" spellCheck={false} required maxLength={1024} placeholder="Enter your Etsy shared secret" /><button type="button" aria-label={showSecret ? 'Hide shared secret' : 'Show shared secret'} aria-pressed={showSecret} disabled={!!integrationBusy} onClick={() => setShowSecret(!showSecret)}>{showSecret ? <PiEyeSlashBold /> : <PiEyeBold />}</button></div><span className="ad-field-help">Saved values stay hidden. These fields are always blank when you load the dashboard.</span></label>
                </div><div className="ad-form-actions"><span className="ad-unsaved">{credentialsEntered ? 'Credentials have not been saved yet' : 'Enter both fields to save'}</span><div>{credentialsEntered && <button className="ad-button ad-secondary" type="button" disabled={!!integrationBusy} onClick={() => { setKey(''); setSecret(''); setShowKey(false); setShowSecret(false); setIntegrationMessage(null); }}>Clear fields</button>}<button className="ad-button ad-primary" type="submit" disabled={!!integrationBusy || !key.trim() || !secret.trim()}><PiFloppyDiskBold />{integrationBusy === 'save' ? 'Saving…' : 'Save credentials'}</button></div></div></form>
                <div className="ad-test-area"><h3>Test your saved connection</h3><p>{credentialsEntered ? 'Save or clear the entered credentials before testing the saved connection.' : !etsyAccess?.available ? 'Etsy calls remain disabled until the approval declaration covers the current purpose and credentials.' : credentialsSaved ? 'Check whether Etsy accepts the currently approved application credentials.' : 'Save your credentials to enable the connection test.'}</p><button className="ad-button ad-secondary" type="button" disabled={!!integrationBusy || !credentialsSaved || credentialsEntered || !etsyAccess?.available} onClick={() => void testConnection()}><PiArrowClockwiseBold />{integrationBusy === 'test' ? 'Testing connection…' : 'Test saved connection'}</button></div>
                <Message feedback={integrationMessage} />
              </section><aside className="ad-card ad-integration-help"><div className="ad-panel-heading"><span className="ad-section-icon"><PiShieldCheckBold /></span><div><h2>Protected by design</h2><p>Keep your integration private.</p></div></div><ul className="ad-security-list"><li><PiLockKeyBold /><span>Credentials are encrypted before storage.</span></li><li><PiShieldCheckBold /><span>Stored keys are never returned to the browser.</span></li><li><PiPlugBold /><span>Etsy requests run through the server.</span></li></ul><div className="ad-note"><PiInfoBold /><p>Use credentials from an approved Etsy application. Approval and access are managed through Etsy.</p></div><a className="ad-button ad-secondary" href="https://www.etsy.com/developers/your-apps" target="_blank" rel="noopener noreferrer">Etsy Developer Portal<PiArrowSquareOutBold /></a></aside></div>
              {credentialsSaved && <section className="ad-danger-zone"><div><h3>Remove saved credentials</h3><p>This disables Etsy connections until valid approval and credentials are recorded again.</p></div><button className="ad-button ad-danger" disabled={!!integrationBusy} onClick={() => setConfirmRemove(true)}><PiTrashBold />Remove credentials</button></section>}
            </>}

            {tab === 'services' && <EtsyAccessSettings onAccessChange={updateEtsyAccess} onManageCredentials={() => selectTab('integration')} />}

            {tab === 'workspace' && <div className="ad-integration-layout"><section className="ad-card"><div className="ad-panel-heading"><span className="ad-section-icon"><PiFileTextBold /></span><div><h2>Manual listing preparation</h2><p>Every account has its own encrypted draft library.</p></div></div><div className="ad-checklist">
              <div><PiFileTextBold /><div><strong>Up to 30 saved drafts</strong><span>Title: 140 characters. Description: 10,000. Notes: 2,000.</span></div></div>
              <div><PiCheckCircleBold /><div><strong>Up to 13 tags per draft</strong><span>Each tag can contain up to 20 characters. Checks use the user’s entered text.</span></div></div>
              <div><PiLockKeyBold /><div><strong>Private account storage</strong><span>Users can edit or delete their own drafts and download their own text.</span></div></div>
              <div><PiShieldCheckBold /><div><strong>Current terms acceptance</strong><span>Signup and existing-user consent are recorded on the server before protected actions.</span></div></div>
            </div><div className="ad-form-actions"><span>These limits are enforced by the service.</span><a className="ad-button ad-primary" href="/workspace">Open workspace<PiArrowSquareOutBold /></a></div></section><aside className="ad-card"><div className="ad-panel-heading"><span className="ad-section-icon"><PiInfoBold /></span><div><h2>Tools and account support</h2><p>The listing workflow works without an Etsy connection.</p></div></div><p>Free tools help with manually entered text, fee and profit assumptions, names, privacy drafts, email drafts, and local reminders.</p><div className="ad-note"><PiInfoBold /><p>Privacy and account-deletion requests go to your public support address. Handle verified requests through the deployed account and database services.</p></div><div className="ad-page-links"><a href="/tools">View free tools<PiArrowSquareOutBold /></a><a href="/privacy">Review privacy information<PiArrowSquareOutBold /></a><button className="ad-button ad-secondary" type="button" onClick={() => selectTab('contact')}>Edit support details</button></div></aside></div>}

            {tab === 'contact' && <div className="ad-integration-layout"><section className="ad-card"><div className="ad-panel-heading"><span className="ad-section-icon"><PiEnvelopeSimpleBold /></span><div><h2>Public contact details</h2><p>Use an email address you monitor regularly.</p></div></div><form className="ad-form" onSubmit={saveContact}><div className="ad-fields"><label className="ad-full-width" htmlFor="ad-contact-email">Contact email<input id="ad-contact-email" type="email" required maxLength={254} value={contact.email} autoComplete="email" disabled={contactSaving} onChange={event => { setContact(current => ({ ...current, email: event.target.value })); setContactMessage(null); }} /><span className="ad-field-help">Visitors can use this address to contact you.</span></label><label className="ad-full-width" htmlFor="ad-operator-name">Website operator name<input id="ad-operator-name" type="text" required maxLength={100} value={contact.operatorName} autoComplete="organization" disabled={contactSaving} onChange={event => { setContact(current => ({ ...current, operatorName: event.target.value })); setContactMessage(null); }} /><span className="ad-field-help">The person or organization responsible for the website.</span></label></div><div className="ad-form-actions"><span className="ad-unsaved">{contactDirty ? 'Unsaved changes' : 'Contact details are up to date'}</span><div><button className="ad-button ad-secondary" type="button" disabled={contactSaving || !contactDirty} onClick={() => { setContact(settings.publicContact); setContactMessage(null); }}>Reset changes</button><button className="ad-button ad-primary" type="submit" disabled={contactSaving || !contactDirty}><PiFloppyDiskBold />{contactSaving ? 'Saving…' : 'Save contact details'}</button></div></div><Message feedback={contactMessage} /></form></section>
              <aside className="ad-card ad-contact-preview"><div className="ad-panel-heading"><span className="ad-section-icon"><PiEyeBold /></span><div><h2>Public details preview</h2><p>{contactDirty ? 'Previewing your unsaved changes.' : 'Your currently saved public details.'}</p></div></div><div className="ad-contact-preview-details"><span>Website operator</span><strong>{contact.operatorName.trim() || 'Operator name'}</strong><span>Contact email</span><strong>{contact.email.trim() || 'Contact email'}</strong></div><div className="ad-note"><PiInfoBold /><p>These details are used on the Contact, Privacy, and Terms pages.</p></div><div className="ad-page-links"><a href="/contact" target="_blank" rel="noopener noreferrer">Contact page<PiArrowSquareOutBold /></a><a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy policy<PiArrowSquareOutBold /></a><a href="/terms" target="_blank" rel="noopener noreferrer">Terms of use<PiArrowSquareOutBold /></a></div></aside>
            </div>}
          </>}
        </section>
        {tabs.filter(item => item.id !== tab).map(item => <section key={item.id} hidden id={`ad-panel-${item.id}`} role="tabpanel" aria-labelledby={`ad-tab-${item.id}`} />)}
        <footer className="ad-footer"><span><PiShieldCheckBold />Owner administration</span><div><a href="/">Website</a><a href="/privacy">Privacy</a><a href="/contact">Contact</a></div></footer>
      </main>
    </div>
    <dialog ref={confirmDialog} className="ad-confirm-dialog" aria-labelledby="ad-remove-title" aria-describedby="ad-remove-description" onCancel={event => { if (integrationBusy) event.preventDefault(); else setConfirmRemove(false); }} onClose={() => { if (!integrationBusy) setConfirmRemove(false); }}>
      <span className="ad-confirm-icon"><PiTrashBold /></span><h2 id="ad-remove-title">Remove Etsy credentials?</h2><p id="ad-remove-description">Etsy connections will stop until valid approval and credentials are recorded again. Independently entered listing drafts stay available.</p><div className="ad-confirm-actions"><button className="ad-button ad-secondary" disabled={!!integrationBusy} autoFocus onClick={() => setConfirmRemove(false)}>Keep credentials</button><button className="ad-button ad-danger" disabled={!!integrationBusy} onClick={() => void removeCredentials()}>{integrationBusy === 'remove' ? 'Removing…' : 'Remove credentials'}</button></div>
    </dialog>
  </div>;
}
