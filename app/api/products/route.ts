import { researchAccess,errorResponse,queryFrom } from '../../../lib/api';
import { cachedSearch } from '../../../lib/etsy';
import { json } from '../../../lib/admin';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{await researchAccess();const query=queryFrom(request);const offset=Number(new URL(request.url).searchParams.get('offset')||0);if(!Number.isInteger(offset)||offset<0||offset>10000)return json({error:'Invalid page'},400);return json(await cachedSearch(query,offset))}catch(e){return errorResponse(e)}}
