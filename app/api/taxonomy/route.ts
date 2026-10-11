import { researchAccess, errorResponse } from '../../../lib/api';
import { cachedTaxonomy } from '../../../lib/etsy';
import { json } from '../../../lib/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try { await researchAccess(); return json(await cachedTaxonomy()); }
  catch (error) { return errorResponse(error); }
}
