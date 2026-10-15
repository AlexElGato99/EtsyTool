import 'server-only';
import { readSetting, writeSetting } from './settings';
import { ApiError } from './etsy';
import { APPLICATION_TERMS_VERSION } from './terms-version';

export async function termsAcceptanceStatus(userId: string) {
  const receipt = await readSetting(`application-terms:${userId}`);
  const validDate = typeof receipt?.acceptedAt === 'string' && Number.isFinite(Date.parse(receipt.acceptedAt)) && Date.parse(receipt.acceptedAt) <= Date.now();
  return { accepted: receipt?.version === APPLICATION_TERMS_VERSION && validDate, version: APPLICATION_TERMS_VERSION, acceptedAt: validDate ? receipt.acceptedAt as string : null };
}

export async function recordTermsAcceptance(userId: string, mechanism: 'signup' | 'workspace') {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId)) throw new ApiError(400, 'A verified account is required.');
  const receipt = { version: APPLICATION_TERMS_VERSION, acceptedAt: new Date().toISOString(), mechanism, termsPath: '/terms', privacyPath: '/privacy' };
  await writeSetting(`application-terms:${userId}`, receipt);
  return { accepted: true, version: receipt.version, acceptedAt: receipt.acceptedAt };
}

export async function requireCurrentTerms(userId: string) {
  if (!(await termsAcceptanceStatus(userId)).accepted) throw new ApiError(428, 'Review and accept the current Terms of Use and Privacy Policy in your workspace before continuing.');
}
