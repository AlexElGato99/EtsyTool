import { parseBody } from '../../../../lib/api';
import { isOwner, sameOrigin, json } from '../../../../lib/admin';
import { publicSettings, readSetting, writeSetting, encryptCredentials } from '../../../../lib/settings';
import { getPublicContact, validatePublicContact } from '../../../../lib/public-contact';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!await isOwner()) return json({ error: 'Owner access required' }, 403);
  return json({
    app: await publicSettings(),
    publicContact: await getPublicContact(),
    credentialsSaved: !!await readSetting('etsy_credentials'),
    connection: await readSetting('connection_status'),
  });
}

export async function POST(request: Request) {
  if (!await isOwner()) return json({ error: 'Owner access required' }, 403);
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin' }, 403);
  if (Number(request.headers.get('content-length')) > 16000) return json({ error: 'Request too large' }, 413);
  try {
    const body = await parseBody(request);
    if (body.action === 'publicContact') {
      const contact = validatePublicContact(body);
      if (!contact) return json({ error: 'Enter a valid contact email and an operator name of up to 100 characters.' }, 400);
      await writeSetting('publicContact', contact);
      return json({ saved: true, publicContact: contact });
    }
    if (body.action === 'credentials') {
      if (typeof body.key !== 'string' || typeof body.secret !== 'string' || !body.key.trim() || !body.secret.trim() || body.key.length > 1024 || body.secret.length > 1024) return json({ error: 'Enter a valid API key and shared secret' }, 400);
      await writeSetting('connection_status', null);
      await writeSetting('etsy_credentials', await encryptCredentials({ key: body.key.trim(), secret: body.secret.trim() }));
      return json({ saved: true, credentialsSaved: true, connection: await readSetting('connection_status') });
    }
    if (body.action === 'removeCredentials') {
      await writeSetting('etsy_credentials', null);
      await writeSetting('connection_status', null);
      return json({ saved: true, credentialsSaved: false });
    }
    if (body.action !== 'app' || typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 60 || !['grid', 'list'].includes(String(body.defaultView)) || typeof body.allowExport !== 'boolean' || typeof body.showEstimates !== 'boolean') return json({ error: 'Invalid application settings' }, 400);
    const settings = { name: body.name.trim(), defaultView: String(body.defaultView), allowExport: body.allowExport, showEstimates: body.showEstimates };
    await writeSetting('app', settings);
    return json({ saved: true, app: settings });
  } catch {
    return json({ error: 'Unable to save settings. Check configuration and try again.' }, 500);
  }
}
