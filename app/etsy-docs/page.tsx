import { permanentRedirect } from 'next/navigation';

export default function EtsyDocsPage() {
  permanentRedirect('/about#application-purpose');
}
