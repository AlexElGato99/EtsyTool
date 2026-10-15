import { permanentRedirect } from 'next/navigation';

export default function DiscoverPage() {
  permanentRedirect('/about#application-purpose');
}
