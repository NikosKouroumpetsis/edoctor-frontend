import type { SupportedLocale } from '$shared/preferences/i18n/locales';

export type HomeLandingProps = Record<string, never>;

export interface HomeLandingMessageOptions {
	locale: SupportedLocale;
}

export type LocalizedHref = (path: string) => string;
