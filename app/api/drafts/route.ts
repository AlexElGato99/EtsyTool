import { researchAccess, errorResponse, parseBody } from '../../../lib/api';
import { json, sameOrigin } from '../../../lib/admin';
import { ApiError } from '../../../lib/etsy';
import { requireCurrentTerms } from '../../../lib/application-terms';
import { changeDraft, listingDraftState } from '../../../lib/manual-drafts';

export const dynamic = 'force-dynamic';
export async function GET() {
  try { const user = await researchAccess(); await requireCurrentTerms(user.userId); return json(await listingDraftState(user.userId)); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new ApiError(403, 'Invalid request origin.');
    const user = await researchAccess(); const body = await parseBody(request);
    if (body.action === 'save') await requireCurrentTerms(user.userId);
    return json(await changeDraft(user.userId, body));
  } catch (error) { return errorResponse(error); }
}
