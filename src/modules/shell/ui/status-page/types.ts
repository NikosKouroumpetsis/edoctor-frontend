import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** The site's 404 or error page (U-61.1): the route's status, the page's language and how a path is linked. */
export type SiteStatusPageProps = {
	status: number;
	locale: SupportedLocale;
	/** A path of the site in the page's language (`/articles` ⇒ `/en/articles`). */
	href: (path: string) => string;
	/** A failure's «Δοκιμάστε ξανά»: the page's loads again by default. */
	onRetry?: () => void;
};
