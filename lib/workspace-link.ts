const workspaceEnums: Record<string, readonly string[]> = {
  section: ['drafts', 'connections', 'tools'],
  connection: ['etsy'],
  result: ['connected', 'cancelled', 'failed'],
};
const workspaceKeys = ['section', 'connection', 'result'];

// Authentication can return only to the workspace. Parse into fresh parameters
// rather than reflecting a caller-provided URL or accepting nested return paths.
export function safeWorkspaceDestination(value: unknown): string {
  if (typeof value !== 'string' || value.length > 100_000 || !/^\/workspace(?:\?|$)/.test(value) || /[\u0000-\u001f\u007f\\#]/.test(value)) return '/workspace';
  const query = value.indexOf('?');
  if (query < 0) return '/workspace';
  const params = new URLSearchParams(value.slice(query + 1));
  const safe = new URLSearchParams();
  for (const key of params.keys()) {
    if (!workspaceKeys.includes(key) || params.getAll(key).length !== 1) return '/workspace';
  }
  for (const key of workspaceKeys) {
    const item = params.get(key);
    if (item === null) continue;
    if (!workspaceEnums[key].includes(item)) return '/workspace';
    safe.set(key, item);
  }
  const serialized = safe.toString();
  return serialized ? '/workspace?' + serialized : '/workspace';
}

export function workspaceAuthHref(mode: 'login' | 'signup', destination: unknown): string {
  const safe = safeWorkspaceDestination(destination);
  return `/${mode}` + (safe === '/workspace' ? '' : '?next=' + encodeURIComponent(safe));
}

export function workspaceRefreshHref(destination: unknown): string {
  const safe = safeWorkspaceDestination(destination);
  return '/workspace/session-refresh' + (safe === '/workspace' ? '' : '?next=' + encodeURIComponent(safe));
}

export function workspaceDestinationFromParams(params: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (typeof value === 'string') query.set(key, value);
  }
  return safeWorkspaceDestination('/workspace?' + query.toString());
}
