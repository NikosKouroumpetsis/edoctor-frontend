import type { SectionId } from '../../types';
import type { MarketplaceAvailability, MarketplaceSortBy } from './types';

/** Page size for home section carousels. Lives ONLY here, never in the shared search call. */
export const HOME_SECTION_LIMIT = 8;

/**
 * One home section's fixed scope. `serviceValue`/`locationValue` are criteria vocabulary
 * values resolved to real slugs at runtime via `resolvers.ts`.
 */
export type HomeSectionConfig = {
	id: SectionId;
	sortBy: MarketplaceSortBy;
	availability: MarketplaceAvailability;
	/** Service criteria value to resolve to a `serviceSlug` (with `text` fallback). */
	serviceValue?: string;
	/** Free-text fallback when the service slug cannot be resolved from `/facets`. */
	serviceTextFallback?: string;
	/** Area criteria value to resolve to a `locationSlug`. */
	locationValue?: string;
};

export const homeSectionConfigs: HomeSectionConfig[] = [
	{
		id: 'popular-athens',
		sortBy: 'popularity',
		availability: 'all',
		locationValue: 'athens'
	},
	{
		id: 'online-this-week',
		sortBy: 'popularity',
		availability: 'next3Days',
		// No single "video/online" service slug spans specialties, so we scope by the text
		// term the backend matcher recognizes ("online") to curate online doctors broadly.
		serviceValue: 'video-consultation',
		serviceTextFallback: 'online'
	},
	{
		// No dedicated "preventive" service exists in the catalog, so this row curates the
		// top-rated doctors instead of scoping to a service that would return nothing.
		id: 'preventive-checkup',
		sortBy: 'rating',
		availability: 'all'
	}
];

/**
 * Maps an app-side availability criteria value to the backend availability filter.
 * `today` -> `today`; `tomorrow | this-week | 0-3-days` -> `next3Days`; empty -> `all`.
 */
export function mapAvailability(value: string | undefined): MarketplaceAvailability {
	switch (value) {
		case 'today':
			return 'today';
		case 'tomorrow':
		case 'this-week':
		case '0-3-days':
			return 'next3Days';
		default:
			return 'all';
	}
}
