import { getUser } from './auth';
import { db } from './supabase';
export async function isOwner(){const user=await getUser();if(!user)return false;const rows=await db<{user_id:string}[]>('app_admins',{params:{user_id:'eq.'+user.userId,select:'user_id',limit:'1'}});return rows.length===1}
// Call only after verifying identity; owner membership depends on the Supabase user ID.
export async function hasAdminMembership(userId:string){
  if(typeof userId!=='string'||!userId)return false;
  const rows=await db<{user_id:string}[]>('app_admins',{params:{user_id:'eq.'+userId,select:'user_id',limit:'1'}});
  return Array.isArray(rows)&&rows.length===1&&rows[0].user_id===userId;
}
export function sameOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
