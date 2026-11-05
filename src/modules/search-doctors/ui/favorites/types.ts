import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** What the favourites' page (wave 2, screen 20) needs from its route and screen. */
export type FavoritesPageProps = {
	locale: SupportedLocale;
	/** A doctor's profile by its slug, already localized and resolved. */
	profileHref: (doctorSlug: string) => string;
	/** «Αναζήτηση γιατρών» of the empty page: the home. */
	searchHref: string;
};
