const normalizeBaseUrl = (baseUrl: string): string => {
  let value = baseUrl || '/';
  if (!value.startsWith('/')) value = `/${value}`;
  if (!value.endsWith('/')) value = `${value}/`;
  return value;
};

const BASE_URL = normalizeBaseUrl(import.meta.env.BASE_URL ?? '/');
const BASE_URL_NO_TRAILING = BASE_URL === '/' ? '/' : BASE_URL.slice(0, -1);

const hasScheme = (value: string) => /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);

/**
 * Prefixes a URL/path with Astro/Vite BASE_URL (e.g. '/Portfolio/').
 * Leaves absolute URLs (https:, mailto:, etc.) and hash links untouched.
 */
export function withBase(value: string): string {
  if (!value) return value;
  if (hasScheme(value) || value.startsWith('#')) return value;
  if (value.startsWith(BASE_URL)) return value;
  if (BASE_URL !== '/' && (value === BASE_URL_NO_TRAILING || value.startsWith(`${BASE_URL_NO_TRAILING}/`))) {
    return value;
  }

  if (value.startsWith('/')) return `${BASE_URL}${value.slice(1)}`;
  return `${BASE_URL}${value}`;
}

export function getBaseUrl(): string {
  return BASE_URL;
}
