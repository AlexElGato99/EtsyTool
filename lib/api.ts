import { db } from './supabase';
import { getUser } from './auth';
import { ApiError } from './etsy';
import { json } from './admin';
export async function userAccess(){const user=await getUser();if(!user)throw new ApiError(401,'Sign in to use your workspace.');return user}
export async function researchAccess(){const user=await userAccess();const count=await db<number>('rpc/research_rate_limit',{method:'POST',body:{request_user_id:user.userId}});if(count>15)throw new ApiError(429,'Too many requests. Please wait one minute.');return user}
export function errorResponse(e:unknown,options:{admin?:boolean}={}){
  let status=e instanceof ApiError?e.status:500;
  let message=e instanceof ApiError?e.message:'The request could not be completed. Please retry.';
  if(!options.admin&&e instanceof ApiError&&e.source==='etsy'){
    if(status===403||status===503){status=503;message='The shop connection is currently unavailable. You can continue with the manual tools.'}
    else if(status===429)message='The shop connection is busy right now. Please wait a minute and try again.';
    else if(status===502)message='The shop connection could not be reached. Please try again shortly.';
  }
  return json({error:message,code:status},status);
}
export function queryFrom(request:Request){const params=new URL(request.url).searchParams;const q=(params.get('q')||'').trim();if(q.length<2||q.length>100)throw new ApiError(400,'Enter a keyword between 2 and 100 characters.');return q}

export async function parseBody(request:Request):Promise<Record<string,unknown>>{const text=await request.text();if(text.length>16000)throw new ApiError(413,'Request too large');let data:unknown;try{data=JSON.parse(text)}catch{throw new ApiError(400,'Invalid JSON body')}if(!data||typeof data!=='object'||Array.isArray(data))throw new ApiError(400,'Invalid request body');return data as Record<string,unknown>}
