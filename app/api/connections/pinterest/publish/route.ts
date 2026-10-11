import { researchAccess, errorResponse, parseBody } from '../../../../../lib/api';
import { json, sameOrigin } from '../../../../../lib/admin';
import { ApiError } from '../../../../../lib/etsy';
import { publishPinterest } from '../../../../../lib/connections';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new ApiError(403, 'Invalid request origin.');
    const user = await researchAccess();
    return json(await publishPinterest(user.userId, await parseBody(request)));
  } catch (error) { return errorResponse(error); }
}
