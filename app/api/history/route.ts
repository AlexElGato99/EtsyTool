import { db } from '../../../lib/supabase';
import { userAccess,errorResponse } from '../../../lib/api';
import { ApiError } from '../../../lib/etsy';
import { json } from '../../../lib/admin';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const user=await userAccess();const id=new URL(request.url).searchParams.get('id')||'';if(!/^\d{1,20}$/.test(id))throw new ApiError(400,'Invalid listing ID');const saved=await db<any[]>('watchlist',{params:{user_id:'eq.'+user.userId,listing_id:'eq.'+id,select:'listing_id',limit:'1'}});if(!saved.length)throw new ApiError(403,'Save the listing to view its history');const rows=await db<{captured_at:string;payload:any}[]>('listing_snapshots',{params:{listing_id:'eq.'+id,order:'captured_at.desc',limit:'30'}});return json({snapshots:rows.map(r=>({capturedAt:r.captured_at,...r.payload}))})}catch(e){return errorResponse(e)}}
