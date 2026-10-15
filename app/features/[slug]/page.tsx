import { notFound, permanentRedirect } from 'next/navigation';
import { featureBySlug, retiredFeatures } from '../../../lib/site-content';

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = featureBySlug(slug);
  if (!feature && !retiredFeatures.some(value => value === slug)) notFound();
  permanentRedirect(feature?.href ?? '/about#application-purpose');
}
