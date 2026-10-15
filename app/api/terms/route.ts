import { userAccess, errorResponse, parseBody } from '../../../lib/api';
import { json, sameOrigin } from '../../../lib/admin';
import { ApiError } from '../../../lib/etsy';
import { recordTermsAcceptance, termsAcceptanceStatus } from '../../../lib/application-terms';
import { APPLICATION_TERMS_VERSION } from '../../../lib/terms-version';

export const dynamic = 'force-dynamic';
export async function GET() {
  try { return json(await termsAcceptanceStatus((await userAccess()).userId)); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new ApiError(403, 'Invalid request origin.');
    const user = await userAccess(); const body = await parseBody(request);
    if (body.acceptTerms !== true || body.version !== APPLICATION_TERMS_VERSION) throw new ApiError(400, 'Accept the current Terms of Use and acknowledge the Privacy Policy.');
    return json(await recordTermsAcceptance(user.userId, 'workspace'));
  } catch (error) { return errorResponse(error); }
}
