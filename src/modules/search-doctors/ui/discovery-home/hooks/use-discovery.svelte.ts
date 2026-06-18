import type { CategoryId } from '$modules/search-doctors/types';

/** Local UI state for the discovery home: active category filter + saved doctors. */
export class DiscoveryState {
	activeCategory = $state<CategoryId>('all');
	favoriteSlugs = $state<string[]>([]);

	isFavorite = (slug: string): boolean => this.favoriteSlugs.includes(slug);

	selectCategory = (categoryId: CategoryId): void => {
		this.activeCategory = categoryId;
	};

	toggleFavorite = (slug: string): void => {
		this.favoriteSlugs = this.isFavorite(slug)
			? this.favoriteSlugs.filter((entry) => entry !== slug)
			: [...this.favoriteSlugs, slug];
	};
}
