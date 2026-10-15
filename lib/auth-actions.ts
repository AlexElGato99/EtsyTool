import { sameOrigin, json } from './admin';
import { authFetch } from './supabase';
import { setSession } from './auth';
import { recordTermsAcceptance } from './application-terms';
import { APPLICATION_TERMS_VERSION } from './terms-version';

export async function credentialsAction(request: Request, signup = false) {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin' }, 403);
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ error: 'Request too large' }, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(text); } catch { return json({ error: 'Enter a valid email and password.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.email !== 'string' || typeof body.password !== 'string' || body.email.length > 254 || body.password.length > 1024 || !/^\S+@\S+\.\S+$/.test(body.email) || body.password.length < (signup ? 8 : 1)) return json({ error: 'Enter a valid email and password' + (signup ? ' of at least 8 characters.' : '.') }, 400);
    if (signup && (body.acceptTerms !== true || body.termsVersion !== APPLICATION_TERMS_VERSION)) return json({ error: 'Please agree to the current Terms of Use and acknowledge the Privacy Policy.' }, 400);
    const response = await authFetch(signup ? 'signup' : 'token?grant_type=password', { method: 'POST', body: {
      email: body.email, password: body.password,
      ...(signup ? { data: { podadd_terms: { version: APPLICATION_TERMS_VERSION, accepted_at: new Date().toISOString() } } } : {}),
    } });
    const data = await response.json();
    if (!response.ok) return json({ error: signup ? 'Account registration could not be completed. Check your details or try signing in.' : 'Unable to sign in. Check your email, password, and email confirmation.' }, 400);
    if (signup) {
      // The provider supplies the account ID; a caller cannot write another account's consent.
      if (typeof data.user?.id !== 'string') return json({ error: 'Account registration could not be completed. Please try signing in.' }, 503);
      await recordTermsAcceptance(data.user.id, 'signup');
    }
    if (data.access_token) { await setSession(data); return json({ ok: true }); }
    return json({ ok: true, confirmationRequired: true });
  } catch { return json({ error: 'Account access is temporarily unavailable. Please try again later.' }, 503); }
}
