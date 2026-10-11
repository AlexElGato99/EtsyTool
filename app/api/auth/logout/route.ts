import { cookies } from 'next/headers';
import { clearSession } from '../../../../lib/auth';
import { authFetch } from '../../../../lib/supabase';
import { sameOrigin,json } from '../../../../lib/admin';
export async function POST(request:Request){if(!sameOrigin(request))return json({error:'Invalid request origin'},403);const token=(await cookies()).get('scout_access')?.value;if(token){try{await authFetch('logout?scope=local',{method:'POST',token})}catch{}}await clearSession();return json({ok:true})}
