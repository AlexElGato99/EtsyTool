import { getUser } from '../../../../lib/auth';
import { hasAdminMembership, json, sameOrigin } from '../../../../lib/admin';
import { errorResponse, parseBody } from '../../../../lib/api';
import { ApiError } from '../../../../lib/etsy';
import { changeEtsyAccess, ownerEtsyAccess } from '../../../../lib/etsy-access';
export const dynamic = 'force-dynamic';
async function owner() { const user = await getUser(); if (!user || !await hasAdminMembership(user.userId)) throw new ApiError(403, 'Owner access required.'); return user; }
export async function GET() { try { await owner(); return json(await ownerEtsyAccess()); } catch (error) { return errorResponse(error, { admin: true }); } }
export async function POST(request: Request) { try { if (!sameOrigin(request)) throw new ApiError(403, 'Invalid request origin.'); const user = await owner(); return json(await changeEtsyAccess(user.userId, await parseBody(request))); } catch (error) { return errorResponse(error, { admin: true }); } }
