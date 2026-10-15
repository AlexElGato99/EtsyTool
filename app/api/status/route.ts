import { readSetting } from '../../../lib/settings';
import { userAccess, errorResponse } from '../../../lib/api';
import { json } from '../../../lib/admin';
import { etsyAccessStatus } from '../../../lib/etsy-access';
export const dynamic = 'force-dynamic';
export async function GET() { try { const user = await userAccess(); const access = await etsyAccessStatus(user.userId); return json({ configured: !!await readSetting('etsy_credentials'), approved: access.approved, available: access.available, accessMode: access.accessMode, purpose: 'own-listing-preparation', termsRequired: true }); } catch (error) { return errorResponse(error); } }
