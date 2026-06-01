import { browser } from '$app/environment';
import { getLocale, getLocaleForUrl } from '$paraglide/runtime';
import type { SupportedLocale } from './locales';

export function getPageLocale(url: URL): SupportedLocale {
	return (browser ? getLocaleForUrl(url) : getLocale()) as SupportedLocale;
}
