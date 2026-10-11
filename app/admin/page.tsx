import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PiArrowRightBold, PiHouseBold, PiLockKeyBold } from 'react-icons/pi';
import { ADMIN_REFRESH_COOKIE, getPageUser } from '../../lib/auth';
import { hasAdminMembership } from '../../lib/admin';
import { BrandMark } from '../../components/site-icon';
import AdminDashboard from '../../components/admin-dashboard';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Owner dashboard · PNG Scout',robots:{index:false,follow:false}};

export default async function AdminPage(){
  const {user,refreshRequired}=await getPageUser(ADMIN_REFRESH_COOKIE);
  if(!user)redirect(refreshRequired?'/admin/session-refresh':'/login');
  let authorized=false;
  try{authorized=await hasAdminMembership(user.userId)}catch{}
  if(authorized)return <AdminDashboard email={user.email} />;
  return <main id="main" className="admin-access-page" tabIndex={-1}>
    <section className="admin-access-card" aria-labelledby="access-title">
      <a className="brand" href="/" aria-label="PNG Scout home"><BrandMark /></a>
      <div className="admin-access-symbol"><PiLockKeyBold aria-hidden="true" focusable="false" /></div>
      <span className="eyebrow">Owner dashboard</span>
      <h1 id="access-title">Access restricted</h1>
      <p>The admin dashboard is available to the PNG Scout owner. You can continue using your free research workspace.</p>
      <div className="page-actions">
        <a className="button" href="/workspace">Open workspace <PiArrowRightBold aria-hidden="true" /></a>
        <a className="button button-secondary" href="/"><PiHouseBold aria-hidden="true" /> Back to home</a>
      </div>
    </section>
  </main>;
}
