import { notFound, permanentRedirect } from 'next/navigation';
import { getResource } from '../../../lib/resources';

export default async function HelpGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!getResource('guide', (await params).slug)) notFound();
  permanentRedirect('/contact#support');
}
