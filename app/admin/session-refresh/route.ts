import { cookies } from 'next/headers';
import { ADMIN_REFRESH_COOKIE, clearSession, getPageUser, getUser } from '../../../lib/auth';

export const dynamic='force-dynamic';

function destination(request:Request,path:'/admin'|'/login'){
  return new Response(null,{status:303,headers:{Location:new URL(path,request.url).toString(),'Cache-Control':'no-store'}});
}

export async function GET(request:Request){
  const jar=await cookies();
  if(jar.get(ADMIN_REFRESH_COOKIE)?.value==='1'){
    const {user}=await getPageUser(ADMIN_REFRESH_COOKIE);
    if(user)return destination(request,'/admin');
    await clearSession();
    return destination(request,'/login');
  }
  jar.set(ADMIN_REFRESH_COOKIE,'1',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/admin',maxAge:120});
  try{
    const user=await getUser();
    if(user?.userId&&user.email)return destination(request,'/admin');
  }catch{}
  await clearSession();
  return destination(request,'/login');
}
