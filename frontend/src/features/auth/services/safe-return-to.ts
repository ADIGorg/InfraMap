/** Evita open redirects: permite apenas caminhos locais sob /admin. */
export function safeAdminReturnTo(value: string | null | undefined): string | null {
  if (!value || value.length > 1024 || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null;
  }
  try {
    const url = new URL(value, 'https://inframap.invalid');
    if (url.origin !== 'https://inframap.invalid') return null;
    if (!/^\/admin(?:\/|$)/.test(url.pathname)) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
