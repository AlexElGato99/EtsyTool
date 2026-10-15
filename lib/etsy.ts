// Shared error and text helpers remain independent from Etsy network access.
export class ApiError extends Error {
  constructor(public status: number, message: string, public source?: 'etsy') { super(message); }
}
export function retiredEtsyFeature(): never { throw new ApiError(410, 'This research feature has been retired. Use the manual listing-preparation workspace.'); }
export async function etsy(..._args: unknown[]): Promise<Record<string, any>> { return retiredEtsyFeature(); }
export async function cachedProducts(..._args: unknown[]): Promise<any> { return retiredEtsyFeature(); }
export async function cachedSearch(..._args: unknown[]): Promise<any> { return retiredEtsyFeature(); }
export async function cachedTaxonomy(..._args: unknown[]): Promise<any> { return retiredEtsyFeature(); }
export async function snapshot(..._args: unknown[]): Promise<any> { return retiredEtsyFeature(); }
export function decodeEtsyText(value: string): string {
  const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0' };
  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|(amp|quot|apos|lt|gt|nbsp));/gi, (token, decimal, hex, name) => {
    if (name) return named[String(name).toLowerCase()];
    const codePoint = Number.parseInt(decimal || hex, hex ? 16 : 10);
    if (!Number.isInteger(codePoint) || codePoint <= 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return token;
    return String.fromCodePoint(codePoint);
  });
}
