'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  PiArrowClockwiseBold, PiArrowSquareOutBold, PiCheckCircleBold, PiCopyBold,
  PiEnvelopeSimpleBold, PiEyeBold, PiEyeSlashBold, PiFloppyDiskBold,
  PiInfoBold, PiLockKeyBold, PiPlugBold, PiTrashBold, PiWarningCircleBold,
} from 'react-icons/pi';
import { FaPinterestP } from 'react-icons/fa6';
import './provider-settings.css';

type ProviderStatus = {
  pinterest: { configured: boolean; appId: string | null };
  email: { configured: boolean; provider: 'resend'; fromEmail: string | null; fromName: string | null };
};
type Feedback = { kind: 'success' | 'error'; text: string } | null;
type Action = 'savePinterest' | 'saveEmail' | 'removePinterest' | 'removeEmail';

async function request(body?: Record<string, unknown>): Promise<ProviderStatus> {
  let response: Response;
  try {
    response = await fetch('/api/admin/providers', {
      ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch { throw new Error('Could not reach your provider settings. Check your connection and try again.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Your settings could not be saved. Please try again.');
  return data;
}

function Message({ value }: { value: Feedback }) {
  return value ? <div className={`ad-feedback ${value.kind}`} role={value.kind === 'error' ? 'alert' : 'status'}>
    {value.kind === 'success' ? <PiCheckCircleBold /> : <PiWarningCircleBold />}<span>{value.text}</span>
  </div> : null;
}

function Callback({ provider, origin }: { provider: 'etsy' | 'pinterest'; origin: string }) {
  const [message, setMessage] = useState<Feedback>(null);
  const url = origin ? `${origin}/api/connections/${provider}/callback` : '';
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage({ kind: 'success', text: 'Callback URL copied.' }); }
    catch { setMessage({ kind: 'error', text: 'Copy is unavailable. Select the callback URL and copy it manually.' }); }
  }
  return <div className="ps-callback"><label htmlFor={`ps-callback-${provider}`}>Callback URL for this website</label><div>
    <input id={`ps-callback-${provider}`} readOnly value={url} placeholder="Preparing callback URL…" onFocus={event => event.currentTarget.select()} />
    <button className="ad-button ad-secondary" type="button" onClick={() => void copy()} disabled={!url} aria-label={`Copy ${provider === 'etsy' ? 'Etsy' : 'Pinterest'} callback URL`}><PiCopyBold /></button>
  </div><Message value={message} /></div>;
}

export default function ProviderSettings({ onEtsySettings }: { onEtsySettings: () => void }) {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [origin, setOrigin] = useState('');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [showPinterest, setShowPinterest] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [busy, setBusy] = useState<Action | ''>('');
  const [pinterestMessage, setPinterestMessage] = useState<Feedback>(null);
  const [emailMessage, setEmailMessage] = useState<Feedback>(null);
  const [confirmRemove, setConfirmRemove] = useState<'pinterest' | 'email' | ''>('');

  async function load() {
    setLoading(true); setLoadError('');
    try {
      const data = await request();
      setStatus(data); setAppId(data.pinterest.appId || '');
      setFromEmail(data.email.fromEmail || ''); setFromName(data.email.fromName || '');
      setAppSecret(''); setApiKey(''); setShowPinterest(false); setShowEmail(false);
    } catch (error) { setLoadError((error as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { setOrigin(window.location.origin); void load(); }, []);

  async function save(event: FormEvent, action: 'savePinterest' | 'saveEmail') {
    event.preventDefault(); if (busy) return;
    const isPinterest = action === 'savePinterest';
    const message = isPinterest ? setPinterestMessage : setEmailMessage;
    setBusy(action); message(null); setConfirmRemove('');
    try {
      const data = await request(isPinterest ? { action, appId: appId.trim(), appSecret } : { action, apiKey, fromEmail: fromEmail.trim(), fromName: fromName.trim() });
      setStatus(data);
      if (isPinterest) { setAppId(data.pinterest.appId || ''); setAppSecret(''); setShowPinterest(false); }
      else { setApiKey(''); setShowEmail(false); setFromEmail(data.email.fromEmail || ''); setFromName(data.email.fromName || ''); }
      message({ kind: 'success', text: `${isPinterest ? 'Pinterest app' : 'Shared Resend test sender'} saved securely. Users can enable it in Connected accounts. Changed credentials require affected users to connect again.` });
    } catch (error) { message({ kind: 'error', text: (error as Error).message }); }
    finally { setBusy(''); }
  }
  async function remove(provider: 'pinterest' | 'email') {
    if (busy) return;
    const action = provider === 'pinterest' ? 'removePinterest' : 'removeEmail';
    const message = provider === 'pinterest' ? setPinterestMessage : setEmailMessage;
    setBusy(action); message(null);
    try {
      const data = await request({ action }); setStatus(data); setConfirmRemove('');
      if (provider === 'pinterest') { setAppId(''); setAppSecret(''); setShowPinterest(false); }
      else { setApiKey(''); setFromEmail(''); setFromName(''); setShowEmail(false); }
      message({ kind: 'success', text: `${provider === 'pinterest' ? 'Pinterest credentials' : 'Resend credentials'} removed. This service is unavailable until credentials are added again.` });
    } catch (error) { message({ kind: 'error', text: (error as Error).message }); }
    finally { setBusy(''); }
  }
  function removal(provider: 'pinterest' | 'email') {
    if (confirmRemove !== provider) return <button className="ad-button ad-danger" type="button" disabled={!!busy} onClick={() => setConfirmRemove(provider)}><PiTrashBold />Remove saved credentials</button>;
    return <div className="ps-remove-confirm" role="group" aria-label={`Confirm ${provider} credential removal`}><p>Removing these credentials disables {provider === 'pinterest' ? 'Pinterest connections' : 'email tests'} for all users. They can reconnect after you configure the service again.</p><div><button className="ad-button ad-secondary" type="button" disabled={!!busy} onClick={() => setConfirmRemove('')}>Keep credentials</button><button className="ad-button ad-danger" type="button" disabled={!!busy} onClick={() => void remove(provider)}>{busy === (provider === 'pinterest' ? 'removePinterest' : 'removeEmail') ? 'Removing…' : 'Confirm removal'}</button></div></div>;
  }

  if (loading) return <div className="ad-loading" role="status"><span className="ad-spinner" /><h2>Loading connected services</h2><p>Checking saved provider settings…</p></div>;
  if (loadError || !status) return <section className="ad-card ad-load-error"><div className="ad-section-icon"><PiWarningCircleBold /></div><h2>Provider settings could not be loaded.</h2><p>{loadError || 'Please try again.'}</p><button className="ad-button ad-primary" onClick={() => void load()}><PiArrowClockwiseBold />Try again</button></section>;

  return <div className="ps-settings">
    <div className="ps-intro"><PiLockKeyBold /><div><strong>Configure the services your users can connect.</strong><p>Secrets are encrypted on the server and never returned to this dashboard. Saving credentials does not connect an account or send a message.</p></div></div>
    <section className="ad-card ps-etsy"><div className="ps-card-top"><span className="ad-section-icon"><PiPlugBold /></span><div><h2>Etsy account connection</h2><p>Uses the key and shared secret in your Etsy integration settings.</p></div><button className="ad-button ad-secondary" type="button" onClick={onEtsySettings}>Manage Etsy credentials</button></div><Callback provider="etsy" origin={origin} /><p className="ps-help">Add this exact redirect URL to your Etsy application. Etsy account connections require your live HTTPS website address.</p></section>

    <div className="ps-provider-grid">
      <section className="ad-card"><div className="ps-card-top"><span className="ad-section-icon"><FaPinterestP /></span><div><h2>Pinterest</h2><p>Connect a user’s boards and publish their own pins.</p></div><span className={`ps-badge ${status.pinterest.configured ? 'is-saved' : ''}`}>{status.pinterest.configured ? 'Credentials saved' : 'Not configured'}</span></div>
        <form className="ad-form" onSubmit={event => void save(event, 'savePinterest')}><fieldset className="ps-fields" disabled={!!busy}><label htmlFor="ps-app-id">App ID<input id="ps-app-id" required maxLength={128} pattern="[A-Za-z0-9_-]+" value={appId} autoComplete="off" spellCheck={false} onChange={event => { setAppId(event.target.value); setPinterestMessage(null); }} /></label>
          <label htmlFor="ps-app-secret">App secret<div className="ad-password-field"><input id="ps-app-secret" type={showPinterest ? 'text' : 'password'} required maxLength={4096} value={appSecret} autoComplete="new-password" spellCheck={false} placeholder={status.pinterest.configured ? 'Saved securely · enter to replace' : 'Enter your Pinterest app secret'} onChange={event => { setAppSecret(event.target.value); setPinterestMessage(null); }} /><button type="button" aria-label={showPinterest ? 'Hide Pinterest app secret' : 'Show Pinterest app secret'} aria-pressed={showPinterest} onClick={() => setShowPinterest(!showPinterest)}>{showPinterest ? <PiEyeSlashBold /> : <PiEyeBold />}</button></div><span className="ad-field-help">Enter the app secret each time you save. Saved secrets stay hidden.</span></label></fieldset>
          <div className="ps-form-actions"><button className="ad-button ad-primary" disabled={!!busy || !appId.trim() || !appSecret.trim()} type="submit"><PiFloppyDiskBold />{busy === 'savePinterest' ? 'Saving…' : 'Save Pinterest settings'}</button>{appSecret && <button className="ad-button ad-secondary" disabled={!!busy} type="button" onClick={() => { setAppSecret(''); setShowPinterest(false); }}>Clear secret</button>}</div></form>
        <Message value={pinterestMessage} /><Callback provider="pinterest" origin={origin} /><p className="ps-help">Configure the exact callback URL in your Pinterest app before users connect. App access and approval are managed by Pinterest.</p><a className="ps-doc-link" href="https://developer.pinterest.com/docs/getting-started/connect-app/" target="_blank" rel="noopener noreferrer">Pinterest app setup<PiArrowSquareOutBold /></a>
        {status.pinterest.configured && <div className="ps-removal">{removal('pinterest')}</div>}
      </section>

      <section className="ad-card"><div className="ps-card-top"><span className="ad-section-icon"><PiEnvelopeSimpleBold /></span><div><h2>Shared email test sender</h2><p>Use Resend for explicit account self-tests.</p></div><span className={`ps-badge ${status.email.configured ? 'is-saved' : ''}`}>{status.email.configured ? 'Credentials saved' : 'Not configured'}</span></div>
        <form className="ad-form" onSubmit={event => void save(event, 'saveEmail')}><fieldset className="ps-fields" disabled={!!busy}><label htmlFor="ps-resend-key">Shared test sender API key<div className="ad-password-field"><input id="ps-resend-key" type={showEmail ? 'text' : 'password'} required maxLength={4096} value={apiKey} autoComplete="new-password" spellCheck={false} placeholder={status.email.configured ? 'Saved securely · enter to replace' : 'Enter your Resend API key'} onChange={event => { setApiKey(event.target.value); setEmailMessage(null); }} /><button type="button" aria-label={showEmail ? 'Hide Resend API key' : 'Show Resend API key'} aria-pressed={showEmail} onClick={() => setShowEmail(!showEmail)}>{showEmail ? <PiEyeSlashBold /> : <PiEyeBold />}</button></div><span className="ad-field-help">Enter the API key each time you save. Saved keys stay hidden.</span></label>
          <label htmlFor="ps-from-email">Sender email<input id="ps-from-email" type="email" required maxLength={254} value={fromEmail} autoComplete="email" placeholder="hello@yourdomain.com" onChange={event => { setFromEmail(event.target.value); setEmailMessage(null); }} /><span className="ad-field-help">Use an address on a domain you verified in Resend.</span></label><label htmlFor="ps-from-name">Sender name <span className="ps-optional">(optional)</span><input id="ps-from-name" maxLength={100} value={fromName} autoComplete="organization" placeholder="PNG Scout" onChange={event => { setFromName(event.target.value); setEmailMessage(null); }} /></label></fieldset>
          <div className="ps-form-actions"><button className="ad-button ad-primary" disabled={!!busy || !apiKey.trim() || !fromEmail.trim()} type="submit"><PiFloppyDiskBold />{busy === 'saveEmail' ? 'Saving…' : 'Save email settings'}</button>{apiKey && <button className="ad-button ad-secondary" type="button" disabled={!!busy} onClick={() => { setApiKey(''); setShowEmail(false); }}>Clear key</button>}</div></form>
        <Message value={emailMessage} /><div className="ps-email-note"><PiInfoBold /><p>This shared sender handles explicit tests to a user’s own verified account email in <a href="/workspace?section=connections">Connected accounts</a>. Users configure their own sender separately in <a href="/workspace?section=campaigns">Email campaigns</a> to manage contacts and confirmed campaigns.</p></div><div className="ps-links"><a className="ps-doc-link" href="https://resend.com/pricing" target="_blank" rel="noopener noreferrer">Resend free plan<PiArrowSquareOutBold /></a><a className="ps-doc-link" href="https://resend.com/docs/dashboard/domains/introduction" target="_blank" rel="noopener noreferrer">Verify your sender domain<PiArrowSquareOutBold /></a></div><p className="ps-help">A free Resend plan is available. Provider quotas apply, and PNG Scout does not upgrade a provider plan.</p>
        {status.email.configured && <div className="ps-removal">{removal('email')}</div>}
      </section>
    </div>
  </div>;
}
