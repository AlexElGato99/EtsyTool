import { userAccess } from '../../../../../lib/api';
import { connectionProvider, finishConnection } from '../../../../../lib/connections';
import { json } from '../../../../../lib/admin';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const url = new URL(request.url); const destination = new URL('/workspace', url.origin);
  if ((await context.params).provider !== 'etsy') return json({ error: 'This service connection has been retired.', code: 'FEATURE_RETIRED' }, 410);
  destination.searchParams.set('section', 'connections');
  let provider = '';
  try {
    const selected = connectionProvider((await context.params).provider); provider = selected;
    if (selected === 'email') throw Error('Unsupported callback');
    const user = await userAccess();
    const result = await finishConnection(user.userId, selected, request.url);
    destination.searchParams.set('result', result);
  } catch { destination.searchParams.set('result', 'failed'); }
  if (provider) destination.searchParams.set('connection', provider);
  destination.hash = 'connections';
  return new Response(null, { status: 303, headers: { Location: destination.toString(), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
