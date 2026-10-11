import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPageUser } from '../../lib/auth';
import Workspace from '../../components/workspace';
import { workspaceDestinationFromParams, workspaceAuthHref, workspaceRefreshHref } from '../../lib/workspace-link';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Workspace · PNG Scout',robots:{index:false,follow:false}};

export default async function WorkspacePage(props: {searchParams?:Promise<Record<string,string|string[]|undefined>>}){
  const destination=workspaceDestinationFromParams(await props?.searchParams||{});
  const {user,refreshRequired}=await getPageUser();
  if(!user)redirect(refreshRequired?workspaceRefreshHref(destination):workspaceAuthHref('login',destination));
  return <Workspace email={user.email} />;
}
