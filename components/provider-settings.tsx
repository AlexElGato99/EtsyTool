'use client';

import { PiArrowRightBold, PiShieldCheckBold } from 'react-icons/pi';

// Kept as a safe compatibility surface for older admin imports. Provider setup
// and message delivery are outside the revised seller-listing application.
export default function ProviderSettings({ onEtsySettings }: { onEtsySettings: () => void }) {
  return <section className="ad-card"><div className="ad-panel-heading"><span className="ad-section-icon"><PiShieldCheckBold /></span><div><h2>Seller listing access</h2><p>The current application supports only the approved own-listing purpose.</p></div></div><p>Pinterest publishing and email delivery are unavailable. Manage obsolete remote grants and any previously scheduled activity in the provider’s own account.</p><button className="ad-button ad-secondary" type="button" onClick={onEtsySettings}>Manage Etsy credentials<PiArrowRightBold /></button></section>;
}
