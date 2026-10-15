export const projectName = 'podadd';

// Existing settings can retain the former default after a branding update.
export function currentProjectName(value: string): string {
  return value === 'PNG Scout' ? projectName : value;
}
