import { researchAccess,errorResponse } from '../../../lib/api';
import { cachedProducts } from '../../../lib/etsy';
import { searchOptionsFrom } from '../../../lib/search-options';
import { json } from '../../../lib/admin';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{await researchAccess();return json(await cachedProducts(searchOptionsFrom(request)))}catch(e){return errorResponse(e)}}
