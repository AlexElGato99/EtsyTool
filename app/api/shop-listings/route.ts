import { researchAccess, errorResponse } from '../../../lib/api';
import { json } from '../../../lib/admin';
import { ApiError } from '../../../lib/etsy';
import { connectedShopListings } from '../../../lib/connections';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some(key => !['state', 'limit', 'offset'].includes(key) || params.getAll(key).length !== 1)) throw new ApiError(400, 'Only your connected shop’s listing state and page can be selected once.');
    const state = params.get('state') || 'active';
    const rawLimit = params.get('limit') || '25'; const rawOffset = params.get('offset') || '0';
    if (!['active', 'draft'].includes(state) || !/^\d{1,2}$/.test(rawLimit) || !/^\d{1,5}$/.test(rawOffset)) throw new ApiError(400, 'Choose active or draft listings and a valid page.');
    const user = await researchAccess();
    return json(await connectedShopListings(user.userId, { state: state as 'active' | 'draft', limit: Number(rawLimit), offset: Number(rawOffset) }));
  } catch (error) { return errorResponse(error); }
}
