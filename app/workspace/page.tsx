import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPageUser } from '../../lib/auth';
import Workspace from '../../components/workspace';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Workspace · PNG Scout',robots:{index:false,follow:false}};

export default async function WorkspacePage(){
  const {user,refreshRequired}=await getPageUser();
  if(!user)redirect(refreshRequired?'/workspace/session-refresh':'/login');
  return <Workspace email={user.email} />;
}
