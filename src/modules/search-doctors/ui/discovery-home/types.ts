import type { Snippet } from 'svelte';
import type { HomePageData } from '$modules/search-doctors/types';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** The home's doctors part (the screen passes the route's streamed data and what follows the rows). */
export type DiscoveryHomeProps = {
	data: HomePageData;
	/** What follows the rows once they show (the home's articles), never under their skeleton or error. */
	after?: Snippet;
};

/** The locale options every private unit of the home reads its words with. */
export type HomeMessageOptions = { locale: SupportedLocale };
