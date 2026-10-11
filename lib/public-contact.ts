import 'server-only';
import { readSetting } from './settings';

export type PublicContact = { email: string; operatorName: string };

export const defaultPublicContact: PublicContact = {
  email: 'ayoub-k10@hotmail.com',
  operatorName: 'PNG Scout',
};

// Keep the address safe to place directly in a mailto link. No URL parameters,
// encoded characters, or control characters are accepted from stored settings.
export function validatePublicContact(value: unknown): PublicContact | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const contact = value as Record<string, unknown>;
  if (typeof contact.email !== 'string' || typeof contact.operatorName !== 'string') return null;
  if (/[\u0000-\u001f\u007f]/.test(contact.email + contact.operatorName)) return null;
  const email = contact.email.trim();
  const operatorName = contact.operatorName.trim();
  if (email.length > 254 || email.split('@')[0].length > 64 || !operatorName || operatorName.length > 100) return null;
  if (!/^[A-Za-z0-9_+-]+(?:\.[A-Za-z0-9_+-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(email)) return null;
  return { email, operatorName };
}

export async function getPublicContact(): Promise<PublicContact> {
  try {
    return validatePublicContact(await readSetting('publicContact')) || { ...defaultPublicContact };
  } catch {
    // Public informational pages also work before the database is configured.
    return { ...defaultPublicContact };
  }
}
