import { isOwner, json, sameOrigin } from '../../../../lib/admin';
import { parseBody } from '../../../../lib/api';
import { decryptConnectionValue, type ProviderCredentials } from '../../../../lib/connections';
import { ApiError } from '../../../../lib/etsy';
import { validatePublicContact } from '../../../../lib/public-contact';
import { encryptCredentials, readSetting, writeSetting } from '../../../../lib/settings';

export const dynamic = 'force-dynamic';

async function credentials(): Promise<ProviderCredentials> {
  const value = await readSetting('provider_credentials');
  if (!value) return {};
  const decoded = await decryptConnectionValue<ProviderCredentials>(value);
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new ApiError(503, 'Provider settings could not be loaded.');
  return decoded;
}

// Only these non-secret fields may cross the server/browser boundary.
function status(value: ProviderCredentials) {
  const pinterest = value.pinterest;
  const email = value.email;
  return {
    pinterest: {
      configured: typeof pinterest?.appId === 'string' && !!pinterest.appId && typeof pinterest.appSecret === 'string' && !!pinterest.appSecret,
      appId: typeof pinterest?.appId === 'string' ? pinterest.appId : null,
    },
    email: {
      configured: email?.provider === 'resend' && typeof email.apiKey === 'string' && !!email.apiKey && typeof email.fromEmail === 'string' && !!email.fromEmail,
      provider: 'resend',
      fromEmail: typeof email?.fromEmail === 'string' ? email.fromEmail : null,
      fromName: typeof email?.fromName === 'string' ? email.fromName : null,
    },
  };
}

function failure(error: unknown) {
  if (error instanceof ApiError && [400, 413].includes(error.status)) return json({ error: error.message }, error.status);
  return json({ error: 'Provider settings are temporarily unavailable. Please try again.' }, 503);
}

function secret(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096 || /[\s\u0000-\u001f\u007f]/.test(value)) {
    throw new ApiError(400, `Enter a valid ${label} without spaces.`);
  }
  return value;
}

export async function GET() {
  try {
    if (!await isOwner()) return json({ error: 'Owner access required.' }, 403);
    return json(status(await credentials()));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request) || !await isOwner()) return json({ error: 'Owner access required.' }, 403);
    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > 16000) return json({ error: 'Request too large.' }, 413);
    const body = await parseBody(request);
    const action = body.action;
    if (typeof action !== 'string' || !['savePinterest', 'saveEmail', 'removePinterest', 'removeEmail'].includes(action)) {
      return json({ error: 'Choose a valid provider action.' }, 400);
    }

    let pinterest: ProviderCredentials['pinterest'];
    let email: ProviderCredentials['email'];
    if (action === 'savePinterest') {
      if (typeof body.appId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(body.appId.trim())) return json({ error: 'Enter a valid Pinterest app ID.' }, 400);
      pinterest = { appId: body.appId.trim(), appSecret: secret(body.appSecret, 'Pinterest app secret') };
    }
    if (action === 'saveEmail') {
      const address = validatePublicContact({ email: body.fromEmail, operatorName: 'Provider sender' });
      if (!address) return json({ error: 'Enter a valid sender email address.' }, 400);
      if (body.fromName !== undefined && typeof body.fromName !== 'string') return json({ error: 'Enter a valid sender name.' }, 400);
      const fromName = typeof body.fromName === 'string' ? body.fromName.trim() : '';
      if (fromName.length > 100 || /[\u0000-\u001f\u007f<>,;]/.test(String(body.fromName || ''))) return json({ error: 'Use a sender name of up to 100 characters without address punctuation.' }, 400);
      email = { provider: 'resend', apiKey: secret(body.apiKey, 'Resend API key'), fromEmail: address.email, ...(fromName ? { fromName } : {}) };
    }

    const current = await credentials();
    if (action === 'savePinterest') current.pinterest = pinterest;
    else if (action === 'saveEmail') current.email = email;
    else if (action === 'removePinterest') delete current.pinterest;
    else delete current.email;
    // Provider fingerprints in connections.ts invalidate old tokens and OAuth
    // callbacks after relevant credentials change, without touching other users.
    await writeSetting('provider_credentials', await encryptCredentials(current));
    return json({ saved: true, ...status(current) });
  } catch (error) { return failure(error); }
}
