import type { ResolvedPathname } from '$app/types';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** One row of the «Νομικά» page: a legal text or the account's deletion. */
export type LegalDirectoryRow = { key: string; label: string; href: ResolvedPathname };

/** What the «Νομικά» page (U-59.3 Ε2) needs from its screen. */
export type LegalDirectoryProps = {
	rows: LegalDirectoryRow[];
	locale: SupportedLocale;
	/** Below 744, the bar's «‹» (the home). */
	backHref: string;
	canonicalUrl: string;
	alternateUrls: Record<SupportedLocale, string>;
};
