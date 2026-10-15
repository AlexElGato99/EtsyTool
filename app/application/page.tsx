import { permanentRedirect } from 'next/navigation';

export default function ApplicationPage() {
  permanentRedirect('/about#application-purpose');
}
