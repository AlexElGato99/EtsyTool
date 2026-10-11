import { cookies } from 'next/headers';
import { clearSession, getPageUser, getUser, WORKSPACE_REFRESH_COOKIE } from '../../../lib/auth';

export const dynamic='force-dynamic';

function destination(request:Request,path:'/workspace'|'/login'){
  return new Response(null,{status:303,headers:{Location:new URL(path,request.url).toString(),'Cache-Control':'no-store'}});
}

export async function GET(request:Request){
  const jar=await cookies();
  // A failed verification after a refresh must lead to sign-in, rather than a redirect loop.
  if(jar.get(WORKSPACE_REFRESH_COOKIE)?.value==='1'){
    const {user}=await getPageUser();
    if(user)return destination(request,'/workspace');
    await clearSession();
    return destination(request,'/login');
  }
  jar.set(WORKSPACE_REFRESH_COOKIE,'1',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/workspace',maxAge:120});
  try{
    const user=await getUser();
    if(user?.userId&&user.email)return destination(request,'/workspace');
  }catch{}
  await clearSession();
  return destination(request,'/login');
}
