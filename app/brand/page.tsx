import { permanentRedirect } from 'next/navigation';

export default function BrandPage() {
  permanentRedirect('/about');
}
