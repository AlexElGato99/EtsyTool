'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { PiArrowClockwiseBold, PiCheckCircleBold, PiFloppyDiskBold, PiInfoBold, PiLockKeyBold, PiShieldCheckBold, PiTrashBold, PiWarningCircleBold } from 'react-icons/pi';
import './etsy-access-settings.css';

export type EtsyAccess = {
  state: 'pending' | 'approved' | 'withdrawn' | 'revoked'; approved: boolean; available: boolean;
  configured: boolean; keyMatches: boolean; accessMode: 'seller' | 'personal' | 'commercial' | null;
  applicationPurpose: string | null; approvalSource: 'developer_portal' | 'etsy_email' | 'written_agreement' | null;
  approvalReference: string | null; approvedAt: string | null; recordedAt: string | null;
};
type Review = { access: EtsyAccess; requiredPurpose: string; currentApplicationName: string; previousApplicationName: string; sameApplication: boolean; attestationOnly: boolean; purged?: boolean; withdrawn?: boolean };
type Feedback = { kind: 'success' | 'error'; text: string } | null;
type Action = 'approve' | 'withdraw' | 'purge';

async function request(body?: Record<string, unknown>): Promise<Review> {
  let response: Response;
  try { response = await fetch('/api/admin/etsy-access', { ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' }), signal: AbortSignal.timeout(25_000) }); }
  catch { throw new Error('The request could not be confirmed. Refresh the access record before trying again.'); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'The access record could not be updated. Try again.');
  return result;
}
function Message({ value }: { value: Feedback }) {
  return value ? <div className={`ad-feedback ${value.kind}`} role={value.kind === 'error' ? 'alert' : 'status'}>{value.kind === 'success' ? <PiCheckCircleBold /> : <PiWarningCircleBold />}<span>{value.text}</span></div> : null;
}
function dateInput(value: string | null) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return '';
  const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function dateLabel(value: string | null) { return value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString() : 'Not recorded'; }

export default function EtsyAccessSettings({ onAccessChange, onManageCredentials }: { onAccessChange: (value: EtsyAccess) => void; onManageCredentials: () => void }) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState<'seller' | 'personal' | 'commercial'>('personal');
  const [source, setSource] = useState<'developer_portal' | 'etsy_email' | 'written_agreement'>('developer_portal');
  const [reference, setReference] = useState(''); const [approvedAt, setApprovedAt] = useState('');
  const [purposeConfirmed, setPurposeConfirmed] = useState(false); const [sameAppConfirmed, setSameAppConfirmed] = useState(false);
  const [busy, setBusy] = useState<Action | ''>(''); const [message, setMessage] = useState<Feedback>(null);
  const [confirmation, setConfirmation] = useState<'withdraw' | 'purge' | ''>(''); const [purgeText, setPurgeText] = useState('');
  function accept(data: Review) { setReview(data); onAccessChange(data.access); }
  async function load() {
    setLoading(true); setLoadError('');
    try {
      const data = await request(); accept(data); setMode(data.access.accessMode || 'personal'); setSource(data.access.approvalSource || 'developer_portal'); setReference(data.access.approvalReference || ''); setApprovedAt(dateInput(data.access.approvedAt));
    } catch (error) { setLoadError((error as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function approve(event: FormEvent) {
    event.preventDefault(); if (busy || !review || !purposeConfirmed || !sameAppConfirmed) return;
    const date = new Date(approvedAt); if (!Number.isFinite(date.getTime())) { setMessage({ kind: 'error', text: 'Enter the date and time of Etsy’s approval.' }); return; }
    setBusy('approve'); setMessage(null);
    try {
      const data = await request({ action: 'approve', accessMode: mode, applicationPurpose: review.requiredPurpose, approvalSource: source, approvalReference: reference.trim(), approvedAt: date.toISOString(), confirmApprovedPurpose: true, confirmSameApplication: true });
      accept(data); setPurposeConfirmed(false); setSameAppConfirmed(false); setMessage({ kind: 'success', text: 'Your approval declaration was saved and bound to the current credentials. This record does not grant or verify approval from Etsy.' });
    } catch (error) { setMessage({ kind: 'error', text: (error as Error).message }); }
    finally { setBusy(''); }
  }
  async function confirmedAction(action: 'withdraw' | 'purge') {
    if (busy || (action === 'purge' && purgeText !== 'REMOVE ETSY DATA')) return;
    setBusy(action); setMessage(null);
    try {
      const data = await request(action === 'withdraw' ? { action, confirmWithdraw: true } : { action, confirmCleanup: true, confirmation: purgeText });
      accept(data); setConfirmation(''); setPurgeText(''); setPurposeConfirmed(false); setSameAppConfirmed(false);
      setMessage({ kind: 'success', text: action === 'withdraw' ? 'Etsy access withdrawn and saved app credentials removed. Use the cleanup control to remove previously stored Etsy data.' : 'Previously stored Etsy research, history, watchlists, and seller connection records were removed. Independently entered listing drafts are preserved.' });
    } catch (error) { setMessage({ kind: 'error', text: (error as Error).message }); }
    finally { setBusy(''); }
  }
  if (loading) return <div className="ad-loading" role="status"><span className="ad-spinner" /><h2>Loading Etsy access record</h2><p>Checking the declared approval and current credentials…</p></div>;
  if (loadError || !review) return <section className="ad-card ad-load-error"><h2>Access record could not be loaded.</h2><p>{loadError || 'Try again.'}</p><button className="ad-button ad-primary" onClick={() => void load()}><PiArrowClockwiseBold />Try again</button></section>;
  const access = review.access;
  return <div className="ea-settings">
    <div className={`ea-status ${access.available ? 'ea-enabled' : ''}`}><PiShieldCheckBold /><div><strong>{access.available ? 'Declared approved access is available' : 'Etsy calls are disabled'}</strong><p>{access.available ? 'Only the current seller-owned listing purpose is enabled.' : access.state === 'withdrawn' ? 'The operator withdrew access. No saved app credentials are active.' : access.state === 'revoked' ? 'Access was revoked or blocked. Record valid approval before any new connection.' : access.approved && !access.keyMatches ? 'The saved credentials differ from the approval record. Approval must cover the current application and key.' : 'Save credentials and record Etsy’s approval of this application purpose before connecting a seller.'}</p></div><span className="ea-state-label">{access.state}</span></div>
    <section className="ad-card"><div className="ad-panel-heading"><span className="ad-section-icon"><PiLockKeyBold /></span><div><h2>Record existing Etsy approval</h2><p>Complete this only after Etsy has approved the revised application and purpose.</p></div></div>
      <div className="ad-note"><PiInfoBold /><p>This is an operator declaration, not a request to Etsy or independent proof of approval. Keep approval evidence privately. Enter a date or reference identifier; do not paste an email or secret here.</p></div>
      <dl className="ea-record"><div><dt>Application</dt><dd>{review.currentApplicationName}</dd></div><div><dt>Previously submitted name</dt><dd>{review.previousApplicationName}</dd></div><div><dt>Approval recorded</dt><dd>{dateLabel(access.recordedAt)}</dd></div></dl>
      {!access.configured && <div className="ea-setup-note"><p>Save the application’s key and shared secret before recording approval.</p><button className="ad-button ad-secondary" onClick={onManageCredentials}>Manage credentials</button></div>}
      <form className="ad-form" onSubmit={event => void approve(event)}><fieldset className="ea-fields" disabled={!!busy || !access.configured}><label htmlFor="ea-purpose">Supported application purpose<textarea id="ea-purpose" readOnly rows={3} value={review.requiredPurpose} /><span className="ad-field-help">Other purposes and endpoints are unavailable in this application.</span></label><div className="ea-field-row"><label htmlFor="ea-mode">Approved access type<select id="ea-mode" value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="seller">Seller App · operator’s own registered shop</option><option value="personal">Personal App · reviewed limited-scale use</option><option value="commercial">Commercial Access · approved broader seller use</option></select></label><label htmlFor="ea-source">Approval source<select id="ea-source" value={source} onChange={event => setSource(event.target.value as typeof source)}><option value="developer_portal">Etsy Developer Portal</option><option value="etsy_email">Written approval from Etsy</option><option value="written_agreement">Written agreement with Etsy</option></select></label></div><div className="ea-field-row"><label htmlFor="ea-date">Approval date and time<input id="ea-date" type="datetime-local" required value={approvedAt} onChange={event => setApprovedAt(event.target.value)} /><span className="ad-field-help">Enter the approval time in your browser’s local timezone.</span></label><label htmlFor="ea-reference">Approval reference<input id="ea-reference" required maxLength={240} value={reference} onChange={event => setReference(event.target.value)} placeholder="Date, portal record, or reference ID" /></label></div>
        <label className="ea-checkbox"><input type="checkbox" required checked={purposeConfirmed} onChange={event => setPurposeConfirmed(event.target.checked)} /><span>I confirm Etsy approved the purpose shown above for this application and its current credentials.</span></label><label className="ea-checkbox"><input type="checkbox" required checked={sameAppConfirmed} onChange={event => setSameAppConfirmed(event.target.checked)} /><span>I disclosed the change from {review.previousApplicationName} to {review.currentApplicationName}, with its revised purpose, for the same application.</span></label><button className="ad-button ad-primary" type="submit" disabled={!purposeConfirmed || !sameAppConfirmed || !reference.trim() || !approvedAt}><PiFloppyDiskBold />{busy === 'approve' ? 'Saving…' : 'Save approval declaration'}</button></fieldset></form>
      <div className="ea-links"><a href="https://www.etsy.com/developers/your-apps" target="_blank" rel="noopener noreferrer">Etsy Developer Portal</a><a href="https://developers.etsy.com/documentation/" target="_blank" rel="noopener noreferrer">Access requirements</a><a href="https://www.etsy.com/legal/api/" target="_blank" rel="noopener noreferrer">API terms</a></div>
    </section>
    <Message value={message} />
    <section className="ad-card ea-controls"><div className="ad-panel-heading"><span className="ad-section-icon"><PiWarningCircleBold /></span><div><h2>Withdraw access and remove legacy data</h2><p>These controls affect Etsy integration for every account.</p></div></div><div className="ea-control-row"><div><h3>Withdraw Etsy access</h3><p>Disable new Etsy calls and remove saved application credentials.</p></div><button className="ad-button ad-danger" disabled={!!busy} onClick={() => setConfirmation('withdraw')}>Withdraw access</button></div><div className="ea-control-row"><div><h3>Remove previously stored Etsy data</h3><p>Delete legacy Etsy caches, snapshots, watchlists, and seller grants. Independently entered listing drafts stay available.</p></div><button className="ad-button ad-danger" disabled={!!busy} onClick={() => { setConfirmation('purge'); setPurgeText(''); }}><PiTrashBold />Review cleanup</button></div>
      {confirmation && <div className="ea-confirm" role="group" aria-label={confirmation === 'purge' ? 'Confirm Etsy data removal' : 'Confirm access withdrawal'}><h3>{confirmation === 'purge' ? 'Remove legacy Etsy records for all users?' : 'Withdraw this app’s Etsy access?'}</h3><p>{confirmation === 'purge' ? 'This deletion is permanent. It includes Etsy authorization tokens and pending authorization records, and does not delete manually entered listing drafts. It does not revoke grants on Etsy’s website.' : 'Etsy connections will stop until valid approval and credentials are saved again. This action does not remove old research records; use the separate cleanup control for that.'}</p>{confirmation === 'purge' && <label htmlFor="ea-purge-confirm">Type REMOVE ETSY DATA<input id="ea-purge-confirm" value={purgeText} maxLength={16} autoComplete="off" spellCheck={false} disabled={!!busy} onChange={event => setPurgeText(event.target.value)} /></label>}<div><button className="ad-button ad-secondary" disabled={!!busy} onClick={() => setConfirmation('')}>Cancel</button><button className="ad-button ad-danger" disabled={!!busy || (confirmation === 'purge' && purgeText !== 'REMOVE ETSY DATA')} onClick={() => void confirmedAction(confirmation)}>{busy ? 'Processing…' : confirmation === 'purge' ? 'Permanently remove Etsy records' : 'Confirm withdrawal'}</button></div></div>}
    </section>
  </div>;
}
