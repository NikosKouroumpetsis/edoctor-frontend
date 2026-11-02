import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { CategoryId, CategorySeed } from '$modules/search-doctors/types';

/**
 * The home's header (U-32.6, the application's `discovery-header`): the search pill and the categories' rail. The
 * state is the home's (the chosen category, the search's window); the header draws it and reports the presses.
 */
export type DiscoveryHeaderProps = {
	/** The rail's categories, in the route's order (their words are the header's). */
	categories: CategorySeed[];
	/** The chosen category (the application's `selectedCategoryId`). */
	selectedCategoryId: CategoryId;
	onSelectCategory: (categoryId: CategoryId) => void;
	/** The phone's window of the search is open (the pill's `aria-expanded`). */
	searchOpen: boolean;
	/** The pill's press: the window grows out of the pressed pill. */
	onOpenSearch: (event: MouseEvent) => void;
	locale: SupportedLocale;
};
