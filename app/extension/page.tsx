import { permanentRedirect } from 'next/navigation';

export default function ExtensionPage() {
  permanentRedirect('/about#application-purpose');
}
