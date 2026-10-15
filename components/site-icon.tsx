import {
  PiCompassBold, PiArrowRightBold, PiMagnifyingGlassBold, PiTagBold,
  PiBookmarkSimpleBold, PiCheckBold, PiFileBold, PiLockKeyBold,
  PiClockCounterClockwiseBold, PiInfoBold, PiCaretDownBold,
  PiEnvelopeSimpleBold, PiHeartBold, PiStorefrontBold, PiChartBarBold,
  PiCalculatorBold, PiBrowserBold, PiPinterestLogoBold, PiBookOpenBold,
  PiMegaphoneBold, PiFlaskBold, PiChatCircleTextBold, PiSquaresFourBold,
} from 'react-icons/pi';
import { projectName } from '../lib/brand';

const icons = {
  compass: PiCompassBold, arrow: PiArrowRightBold, search: PiMagnifyingGlassBold,
  keywords: PiTagBold, bookmark: PiBookmarkSimpleBold, check: PiCheckBold,
  file: PiFileBold, lock: PiLockKeyBold, history: PiClockCounterClockwiseBold,
  info: PiInfoBold, chevron: PiCaretDownBold, email: PiEnvelopeSimpleBold,
  heart: PiHeartBold,
  shop: PiStorefrontBold, chart: PiChartBarBold, calculator: PiCalculatorBold,
  browser: PiBrowserBold, pinterest: PiPinterestLogoBold, book: PiBookOpenBold,
  marketing: PiMegaphoneBold, experiment: PiFlaskBold, chat: PiChatCircleTextBold,
  grid: PiSquaresFourBold,
};
export function SiteIcon({ name, className = 'icon' }: { name: keyof typeof icons; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className} aria-hidden="true" focusable="false" />;
}
export function BrandMark() {
  return <><span className="brand-symbol"><SiteIcon name="compass" /></span><span>{projectName}<span className="brand-period">.</span></span></>;
}
