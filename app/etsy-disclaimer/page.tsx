import { permanentRedirect } from 'next/navigation';

export default function EtsyDisclaimerPage() {
  permanentRedirect('/about#independence');
}
