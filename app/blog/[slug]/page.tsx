import { notFound, permanentRedirect } from 'next/navigation';
import { getResource } from '../../../lib/resources';

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!getResource('article', (await params).slug)) notFound();
  permanentRedirect('/about');
}
