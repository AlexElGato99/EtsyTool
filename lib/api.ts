import { db } from './supabase';
import { getUser } from './auth';
import { ApiError } from './etsy';
import { json } from './admin';
export async function userAccess(){const user=await getUser();if(!user)throw new ApiError(401,'Sign in to use research.');return user}
export async function researchAccess(){const user=await userAccess();const count=await db<number>('rpc/research_rate_limit',{method:'POST',body:{request_user_id:user.userId}});if(count>15)throw new ApiError(429,'Too many requests. Please wait one minute.');return user}
export function errorResponse(e:unknown){return json({error:e instanceof ApiError?e.message:'The request could not be completed. Please retry.',code:e instanceof ApiError?e.status:500},e instanceof ApiError?e.status:500)}
export function queryFrom(request:Request){const params=new URL(request.url).searchParams;const q=(params.get('q')||'').trim();if(q.length<2||q.length>100)throw new ApiError(400,'Enter a keyword between 2 and 100 characters.');return q}

export async function parseBody(request:Request):Promise<Record<string,unknown>>{const text=await request.text();if(text.length>16000)throw new ApiError(413,'Request too large');let data:unknown;try{data=JSON.parse(text)}catch{throw new ApiError(400,'Invalid JSON body')}if(!data||typeof data!=='object'||Array.isArray(data))throw new ApiError(400,'Invalid request body');return data as Record<string,unknown>}
