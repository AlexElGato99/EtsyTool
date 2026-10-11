import { isOwner,sameOrigin,json } from '../../../../lib/admin';
import { etsy } from '../../../../lib/etsy';
import { errorResponse } from '../../../../lib/api';
import { writeSetting } from '../../../../lib/settings';
export const dynamic='force-dynamic';
export async function POST(request:Request){if(!await isOwner()||!sameOrigin(request))return json({error:'Owner access required'},403);try{await etsy('listings/active',{keywords:'png',limit:'1'});const status={ok:true,checkedAt:new Date().toISOString()};await writeSetting('connection_status',status);return json(status)}catch(e){await writeSetting('connection_status',{ok:false,checkedAt:new Date().toISOString()});return errorResponse(e,{admin:true})}}
