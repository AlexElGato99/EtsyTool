'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { PiArrowRightBold, PiEyeBold, PiEyeSlashBold, PiShieldCheckBold } from 'react-icons/pi';
import { safeWorkspaceDestination, workspaceAuthHref } from '../lib/workspace-link';

type AuthFormProps = { mode: 'login' | 'signup' };

const safeErrors = new Set([
  'Enter a valid email and password.',
  'Enter a valid email and password of at least 8 characters.',
  'Unable to sign in. Check your email, password, and email confirmation.',
  'Account registration could not be completed. Check your details or try signing in.',
]);

export default function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === 'signup';
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [workspaceDestination, setWorkspaceDestination] = useState('/workspace');

  useEffect(() => {
    setWorkspaceDestination(safeWorkspaceDestination(new URLSearchParams(window.location.search).get('next')));
  }, [mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || confirmationRequired) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const email = String(fields.get('email') || '').trim();
    const password = String(fields.get('password') || '');
    setError('');
    setStatus('');
    if (isSignup && password !== fields.get('confirmPassword')) {
      setError('Your passwords do not match. Please check them and try again.');
      form.querySelector<HTMLInputElement>('#confirm-password')?.focus();
      return;
    }
    if (isSignup && fields.get('acceptTerms') !== 'on') {
      setError('Please agree to the Terms of Use and Privacy Policy to create your account.');
      return;
    }
    setPending(true);
    setConfirmationRequired(false);
    setStatus(isSignup ? 'Creating your free account…' : 'Signing you in…');
    let openingWorkspace = false;
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        setStatus('');
        setError(result.error === 'Authentication is unavailable. Check Supabase configuration.'
          ? 'Account access is temporarily unavailable. Please try again later.'
          : safeErrors.has(result.error)
          ? result.error
          : isSignup ? 'We could not create your account. Please try again.' : 'We could not sign you in. Please try again.');
        return;
      }
      if (result.confirmationRequired) {
        form.reset();
        setConfirmationRequired(true);
        setStatus('Check your inbox for the confirmation email. Confirm your account, then come back here to sign in.');
        return;
      }
      setStatus('You’re signed in. Opening your workspace…');
      openingWorkspace = true;
      window.location.assign(safeWorkspaceDestination(new URLSearchParams(window.location.search).get('next')));
    } catch {
      openingWorkspace = false;
      setStatus('');
      setError('We could not connect. Check your connection and try again.');
    } finally {
      if (!openingWorkspace) setPending(false);
    }
  }

  return (
    <div className="auth-card">
      <span className="free-badge"><PiShieldCheckBold aria-hidden="true" /> Free access · No payment required</span>
      <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
      <p>{isSignup ? 'A little clarity for your next creative idea.' : 'Your research workspace is ready when you are.'}</p>
      {!confirmationRequired && <form className="auth-form" onSubmit={submit} aria-busy={pending}>
        <div className="form-field">
          <label className="form-label" htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required disabled={pending} />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="password">Password</label>
          <div className="auth-input-wrap">
            <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={isSignup ? 8 : undefined} maxLength={1024} aria-describedby={isSignup ? 'password-help' : undefined} required disabled={pending} />
            <button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} disabled={pending}>
              {showPassword ? <PiEyeSlashBold aria-hidden="true" /> : <PiEyeBold aria-hidden="true" />}
            </button>
          </div>
          {isSignup && <small id="password-help">Use at least 8 characters.</small>}
        </div>
        {isSignup && <>
          <div className="form-field">
            <label className="form-label" htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={1024} required disabled={pending} />
          </div>
          <label className="auth-checkbox" htmlFor="accept-terms">
            <input id="accept-terms" name="acceptTerms" type="checkbox" required disabled={pending} />
            <span>I agree to the <Link href="/terms">Terms of Use</Link> and have read the <Link href="/privacy">Privacy Policy</Link>.</span>
          </label>
        </>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {status && <p className="auth-status" role="status">{status}</p>}
        <button className="button" type="submit" disabled={pending}>
          {pending ? isSignup ? 'Creating account…' : 'Signing in…' : isSignup ? 'Create free account' : 'Sign in'}
          <PiArrowRightBold aria-hidden="true" />
        </button>
      </form>}
      {confirmationRequired && <>
        <p className="auth-status" role="status">{status}</p>
        <Link className="button button-secondary" href={workspaceAuthHref('login', workspaceDestination)}>Go to sign in <PiArrowRightBold aria-hidden="true" /></Link>
      </>}
      <div className="auth-links">
        <p>{isSignup ? 'Already have an account?' : 'New to PNG Scout?'} <Link href={workspaceAuthHref(isSignup ? 'login' : 'signup', workspaceDestination)}>{isSignup ? 'Sign in' : 'Create a free account'}</Link></p>
        <Link href="/">Back to the homepage</Link>
      </div>
      {!isSignup && <p className="auth-legal">By using PNG Scout, you agree to our <Link href="/terms">Terms of Use</Link>. See how we handle data in our <Link href="/privacy">Privacy Policy</Link>.</p>}
    </div>
  );
}
