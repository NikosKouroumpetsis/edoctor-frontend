import type { MarketplaceLocationSuggestionsData } from './types';

/** The administrative levels the backend sends; anything else is dropped at this boundary. */
export type SearchDoctorsLocationType = 'REGION' | 'REGIONAL_UNIT' | 'MUNICIPALITY' | 'SETTLEMENT';

/** One «Πού;» suggestion as backend FACTS (the application's `SearchDoctorsLocationFact`). */
export type SearchDoctorsLocationFact = {
	slug: string;
	type: SearchDoctorsLocationType;
	label: string;
	displayName: string;
	context: string | null;
	hierarchy: {
		region: string | null;
		regionalUnit: string | null;
		municipality: string | null;
	};
	latitude: number;
	longitude: number;
};

const LOCATION_TYPES: readonly SearchDoctorsLocationType[] = [
	'REGION',
	'REGIONAL_UNIT',
	'MUNICIPALITY',
	'SETTLEMENT'
];

function toLocationType(type: string): SearchDoctorsLocationType | null {
	return (LOCATION_TYPES as readonly string[]).includes(type)
		? (type as SearchDoctorsLocationType)
		: null;
}

/**
 * The location suggestions as facts in the server's order: `label` the row's own name, or the other name the user
 * searched (S-28.1), `displayName` the hidden full name, `hierarchy` its parents, `slug` what a search sends. An item
 * of an unknown level is dropped.
 */
export function mapLocationSuggestionsToFacts(
	data: MarketplaceLocationSuggestionsData
): SearchDoctorsLocationFact[] {
	return data.items.flatMap((item) => {
		const type = toLocationType(item.type);
		if (!type) return [];
		return [
			{
				slug: item.slug,
				type,
				label: item.label,
				displayName: item.displayName,
				context: item.context,
				hierarchy: {
					region: item.hierarchy.region,
					regionalUnit: item.hierarchy.regionalUnit,
					municipality: item.hierarchy.municipality
				},
				latitude: item.latitude,
				longitude: item.longitude
			}
		];
	});
}
