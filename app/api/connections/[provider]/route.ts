import { userAccess, researchAccess, errorResponse, parseBody } from '../../../../lib/api';
import { json, sameOrigin } from '../../../../lib/admin';
import { ApiError } from '../../../../lib/etsy';
import { connectionProvider, connectionStatus, beginConnection, disconnectConnection, connectedShop, connectedListing, pinterestBoards } from '../../../../lib/connections';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ provider: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const provider = connectionProvider((await context.params).provider);
    const view = new URL(request.url).searchParams.get('view');
    const user = view ? await researchAccess() : await userAccess();
    if (view === 'shop' && provider === 'etsy') return json(await connectedShop(user.userId));
    if (view === 'listing' && provider === 'etsy') return json(await connectedListing(user.userId, new URL(request.url).searchParams.get('url') || ''));
    if (view === 'boards' && provider === 'pinterest') return json(await pinterestBoards(user.userId));
    if (view) throw new ApiError(400, 'Choose a supported connection view.');
    return json({ ...await connectionStatus(user.userId, provider), ...(provider === 'email' ? { recipient: user.email } : {}) });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    if (!sameOrigin(request)) throw new ApiError(403, 'Invalid request origin.');
    const provider = connectionProvider((await context.params).provider);
    const user = await researchAccess(); const body = await parseBody(request);
    if (body.action === 'connect') return json(await beginConnection(user.userId, provider, new URL(request.url).origin, user.email));
    if (body.action === 'disconnect') { await disconnectConnection(user.userId, provider); return json({ disconnected: true }); }
    throw new ApiError(400, 'Choose a supported connection action.');
  } catch (error) { return errorResponse(error); }
}
