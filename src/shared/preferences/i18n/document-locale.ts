import { getTextDirection } from '$paraglide/runtime';
import type { SupportedLocale } from './locales';

/**
 * 🔴 D-W45-57 β (wave 4.5, screen 61; accessibility): `<html lang dir>` is written by the server for the address it
 * drew (`hooks.server.ts`), and a change of language is a navigation of the browser (`/…` ⇔ `/en/…`) that draws no
 * new document — so the page's root follows the page's language here, the ONE place (the frame calls it, no page does).
 */
export function followPageLocale(locale: SupportedLocale, root: HTMLElement | null = null): void {
	const target = root ?? (typeof document === 'undefined' ? null : document.documentElement);
	if (!target) return;
	const direction = getTextDirection(locale);
	if (target.lang !== locale) target.lang = locale;
	if (target.dir !== direction) target.dir = direction;
}
