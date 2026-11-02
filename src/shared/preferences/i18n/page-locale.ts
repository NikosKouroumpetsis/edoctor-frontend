import { browser } from '$app/environment';
import { baseLocale, extractLocaleFromUrl, getLocale, getLocaleForUrl } from '$paraglide/runtime';
import type { SupportedLocale } from './locales';

export function getPageLocale(url: URL): SupportedLocale {
	return (browser ? getLocaleForUrl(url) : getLocale()) as SupportedLocale;
}

/**
 * The page's language from its address's PATH alone (`/en/…` English, else Greek), the same on the server and in
 * the browser: a load that reads it depends on the path — a change of language reads again (MAJOR-1 of r1) — and
 * never on the query (a window's `?office=` asks nothing).
 */
export function getPathnameLocale(url: Pick<URL, 'pathname'>): SupportedLocale {
	const located = extractLocaleFromUrl(new URL(url.pathname, 'http://localhost'));
	return (located ?? baseLocale) as SupportedLocale;
}
