import 'server-only';
import { cookies } from 'next/headers';
import { authFetch } from './supabase';
const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
export async function setSession(session:{access_token:string;refresh_token:string}){const jar=await cookies();jar.set('scout_access',session.access_token,{...cookieOptions,maxAge:60*60*24*7});jar.set('scout_refresh',session.refresh_token,{...cookieOptions,maxAge:60*60*24*30})}
export async function clearSession(){const jar=await cookies();jar.set('scout_access','',{...cookieOptions,maxAge:0});jar.set('scout_refresh','',{...cookieOptions,maxAge:0})}
export async function getUser(){const jar=await cookies();let access=jar.get('scout_access')?.value;const refresh=jar.get('scout_refresh')?.value;if(!access&&!refresh)return null;let response=access?await authFetch('user',{token:access}):null;if(!response?.ok&&refresh){const r=await authFetch('token?grant_type=refresh_token',{method:'POST',body:{refresh_token:refresh}});if(!r.ok)return null;const session=await r.json();await setSession(session);access=session.access_token;response=await authFetch('user',{token:access})}if(!response?.ok)return null;const user=await response.json();return {userId:user.id as string,email:user.email as string}}
