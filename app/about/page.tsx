import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-shell';
import { ResourceFrame, ResourceLinks } from '../../components/resource-pages';
import { getPublicContact } from '../../lib/public-contact';

export const metadata: Metadata = {
  title: 'About | podadd',
  description: 'What podadd does, who operates it, and how its free listing tools and optional own-shop connection work.',
};
export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const { email, operatorName } = await getPublicContact();
  return <><SiteHeader /><ResourceFrame eyebrow="About podadd" title="Your own work, a little better prepared." description="Free tools for sellers who want to write clearer listings, plan their own costs, and keep the next edit organized.">
    <ResourceLinks items={[
      { title: 'Prepare your listing', description: 'Check your own title, tags, and description with practical text checks.', href: '/tools/listing-helper', icon: 'file' },
      { title: 'Keep private manual drafts', description: 'Save up to 30 drafts you write in an encrypted account workspace.', href: '/workspace?section=drafts', icon: 'bookmark' },
      { title: 'Plan and organize', description: 'Use your own numbers in calculators and your own references in local task reminders.', href: '/tools', icon: 'info' },
    ]} />
    <article className="rp-prose">
      <section id="application-purpose"><h2>A focused purpose</h2>
        <p>podadd helps sellers prepare their own listing text and use manual shop-planning tools. Write a title, description, tags, and private notes, then return to your saved draft when you are ready to edit.</p>
        <p>The public tools work with information you enter. Fee and profit planners use your assumptions, and text checks help you review practical listing limits. You review and publish your work yourself.</p>
        <p>An optional Etsy connection is intended to let an authorizing seller temporarily review their own active and draft listings. Read the current title, description, tags, and price together before deciding what to edit. This is a read-only reference; changes and publication stay in Etsy Shop Manager.</p>
        <p>The connection requires Etsy approval of this application purpose and the seller&apos;s authorization. It remains unavailable without that approval, while manual preparation stays available.</p>
        <p>podadd was previously submitted as <strong>png-scout (PNG Scout)</strong>. This is the same application with a revised name and purpose. Marketplace research, competitor analytics, historical listing tracking, browser-extension research, and API-linked marketing are retired.</p>
      </section>
      <section><h2>Your information, used for your work</h2>
        <p>Saved drafts contain the content you enter and are encrypted in your account. You can edit, download, or delete your own drafts. Optional shop listings are a temporary view and are kept separate from your saved text.</p>
        <p>The connection requests listing-read permission only. It does not request orders, payments, or buyer email addresses, and retrieved shop content is not transferred to marketing services or used for AI training. Read the <Link href="/privacy">Privacy Policy</Link> for storage, retention, and deletion details.</p>
      </section>
      <section><h2>The person behind podadd</h2>
        <p>podadd is operated by <strong>{operatorName}</strong>. Every available tool and account is free, with no subscriptions or payment details required.</p>
        <p>For support or privacy requests, email <a href={'mailto:' + email}>{email}</a> or visit <Link href="/contact">Contact</Link>. Our <Link href="/terms">Terms of Use</Link> explain the service and the operator&apos;s responsibilities.</p>
      </section>
      <section id="independence"><h2>An independent service</h2>
        <p>podadd is independently developed and operated. Etsy does not provide, endorse, or certify podadd. Etsy access and approval are determined by Etsy.</p>
        <p>You remain responsible for the accuracy of your listings and the rights to your products, designs, and text. Our tools help with preparation and do not promise rankings, sales, or legal compliance.</p>
      </section>
    </article>
  </ResourceFrame><SiteFooter /></>;
}
