import { researchAccess, userAccess, parseBody, errorResponse } from '../../../lib/api';
import { json, sameOrigin } from '../../../lib/admin';
import { ApiError } from '../../../lib/etsy';
import { campaignAccount, campaignAction, campaignBroadcasts, campaignContacts } from '../../../lib/email-campaigns';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams; const view = params.get('view');
    const user = view === 'contacts' ? await researchAccess() : await userAccess();
    if (!view || view === 'account') return json(await campaignAccount(user.userId));
    if (view === 'broadcasts') return json(await campaignBroadcasts(user.userId));
    if (view === 'contacts') return json(await campaignContacts(user.userId, params.get('after') || undefined));
    throw new ApiError(400, 'Choose a valid campaign view.');
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new ApiError(403, 'Invalid request origin.');
    const user = await researchAccess();
    return json(await campaignAction(user.userId, await parseBody(request)));
  } catch (error) { return errorResponse(error); }
}
