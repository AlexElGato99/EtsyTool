import {
  PiCompassBold, PiArrowRightBold, PiMagnifyingGlassBold, PiTagBold,
  PiBookmarkSimpleBold, PiCheckBold, PiFileBold, PiLockKeyBold,
  PiClockCounterClockwiseBold, PiInfoBold, PiCaretDownBold,
  PiEnvelopeSimpleBold, PiHeartBold,
} from 'react-icons/pi';

const icons = {
  compass: PiCompassBold, arrow: PiArrowRightBold, search: PiMagnifyingGlassBold,
  keywords: PiTagBold, bookmark: PiBookmarkSimpleBold, check: PiCheckBold,
  file: PiFileBold, lock: PiLockKeyBold, history: PiClockCounterClockwiseBold,
  info: PiInfoBold, chevron: PiCaretDownBold, email: PiEnvelopeSimpleBold,
  heart: PiHeartBold,
};
export function SiteIcon({ name, className = 'icon' }: { name: keyof typeof icons; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className} aria-hidden="true" focusable="false" />;
}
export function BrandMark() {
  return <><span className="brand-symbol"><SiteIcon name="compass" /></span><span>PNG Scout<span className="brand-period">.</span></span></>;
}
