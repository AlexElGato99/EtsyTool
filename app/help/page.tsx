import { permanentRedirect } from 'next/navigation';

export default function HelpPage() {
  permanentRedirect('/contact#support');
}
