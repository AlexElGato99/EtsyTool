import { isOwner, sameOrigin, json } from '../../../../lib/admin';
import { ownerEtsyAccess } from '../../../../lib/etsy-access';
import { errorResponse } from '../../../../lib/api';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) { if (!sameOrigin(request) || !await isOwner()) return json({ error: 'Owner access required' }, 403); try { const { access } = await ownerEtsyAccess(); return json({ ok: access.available, checkedAt: new Date().toISOString(), check: 'local_configuration', providerVerified: false, approvalRequired: !access.approved }); } catch (error) { return errorResponse(error, { admin: true }); } }
