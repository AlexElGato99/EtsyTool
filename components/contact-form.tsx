'use client';

import { useRef, useState, type FormEvent } from 'react';
import { PiArrowUpRightBold, PiCheckBold, PiCopyBold } from 'react-icons/pi';

type ContactFormProps = { email: string };

export default function ContactForm({ email }: ContactFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [manualCopy, setManualCopy] = useState('');

  function prepareDraft() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return null;
    const values = new FormData(form);
    const name = String(values.get('name') || '').trim();
    const senderEmail = String(values.get('email') || '').trim();
    const subject = String(values.get('subject') || '').trim();
    const message = String(values.get('message') || '').trim();

    if (!name || !subject || !message) {
      setStatus('Please enter your name, a subject, and a message.');
      const missing = !name ? 'name' : !subject ? 'subject' : 'message';
      form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${missing}"]`)?.focus();
      return null;
    }

    const emailSubject = `PNG Scout: ${subject}`;
    const body = `Name: ${name}\r\nEmail: ${senderEmail}\r\n\r\n${message}`;
    return {
      url: `mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body)}`,
      text: `To: ${email}\nSubject: ${emailSubject}\n\n${body}`,
    };
  }

  function openDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = prepareDraft();
    if (!draft) return;
    setCopied(false);
    setManualCopy('');
    setStatus('Email draft prepared. If your email app did not open, copy your message and email it to the address below.');
    window.location.assign(draft.url);
  }

  async function copyMessage() {
    const draft = prepareDraft();
    if (!draft || copying) return;
    setCopying(true);
    setCopied(false);
    setManualCopy('');
    try {
      await navigator.clipboard.writeText(draft.text);
      setCopied(true);
      setStatus('Message copied. Paste it into your email app, review it, and send it when ready.');
    } catch {
      setManualCopy(draft.text);
      setStatus('Copy is unavailable in this browser. Select and copy the prepared message below.');
    } finally {
      setCopying(false);
    }
  }

  function clearFeedback() {
    setStatus('');
    setCopied(false);
    setManualCopy('');
  }

  return (
    <form ref={formRef} className="contact-form" action={`mailto:${email}`} method="post" encType="text/plain" onSubmit={openDraft} onChange={clearFeedback} aria-describedby="contact-form-help">
      <div className="contact-form-row">
        <div className="form-field">
          <label className="form-label" htmlFor="contact-name">Your name</label>
          <input id="contact-name" name="name" type="text" autoComplete="name" maxLength={100} placeholder="Your name" required />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="contact-email">Email address</label>
          <input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required />
        </div>
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor="contact-subject">Subject</label>
        <input id="contact-subject" name="subject" type="text" maxLength={150} placeholder="How can we help?" required />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor="contact-message">Message</label>
        <textarea id="contact-message" name="message" rows={6} maxLength={3000} placeholder="Tell us a little about your question or idea." required />
      </div>
      <p id="contact-form-help" className="contact-note">This form opens a draft in your email app. Review it there and send it.</p>
      <div className="page-actions">
        <button className="button button-primary" type="submit">Open email draft <PiArrowUpRightBold aria-hidden="true" /></button>
        <button className="button button-secondary" type="button" onClick={copyMessage} disabled={copying}>
          {copying ? 'Copying...' : copied ? 'Message copied' : 'Copy message'}
          {copied ? <PiCheckBold aria-hidden="true" /> : <PiCopyBold aria-hidden="true" />}
        </button>
      </div>
      <p className="contact-status" role="status" aria-live="polite">{status}</p>
      {manualCopy && <div className="form-field">
        <label className="form-label" htmlFor="contact-copy-text">Prepared email to copy</label>
        <textarea id="contact-copy-text" value={manualCopy} readOnly rows={8} onFocus={(event) => event.currentTarget.select()} />
      </div>}
    </form>
  );
}
