import type { SupportedLocale } from '$shared/preferences/i18n/locales';

export type SecurityPageProps = {
	locale: SupportedLocale;
	/** The browser says there is no network: a read with no answer says so at once. */
	offline?: boolean;
};
