import type { CategoryId } from '$modules/search-doctors/types';

/**
 * Local UI state of the discovery home: the category asked for and the one the rows show. A category changes the
 * rows in place (U-20): the rows fade out (0.25 s, CSS), then the new category's rows come in and fade in — so
 * `activeCategory` (the rail, the queries) leads and `shownCategory` (the rows) follows once the fade-out ends.
 */
export class DiscoveryState {
	activeCategory = $state<CategoryId>('all');
	shownCategory = $state<CategoryId>('all');
	/** The rows are fading out before the swap. */
	leaving = $state(false);

	selectCategory = (categoryId: CategoryId): void => {
		if (categoryId === this.activeCategory) return;
		this.activeCategory = categoryId;
		this.leaving = true;
	};

	/** The fade-out ended (the rows' own `transitionend`, its clock, or nothing moved): the new rows come in. */
	swap = (): void => {
		if (!this.leaving) return;
		this.shownCategory = this.activeCategory;
		this.leaving = false;
	};
}
