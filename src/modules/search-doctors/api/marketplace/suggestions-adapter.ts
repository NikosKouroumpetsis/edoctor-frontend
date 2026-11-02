import type {
	MarketplaceFacetEntry,
	MarketplaceFacetsData,
	MarketplaceSuggestionsData,
	MarketplaceSuggestionType
} from './types';

/**
 * One «Τι;» suggestion reduced to backend FACTS, no copy and no glyph (the application's
 * `SearchDoctorsSuggestionFact`): `kind` the category (`professional` = a specialty), `id` the backend identity a
 * search sends, `slug` what a doctor's row opens (absent for a popular specialty of the facets, which carries only
 * its `professionalId`). The rows (glyph, groups, bold match) are built in `lib/`.
 */
export type SearchDoctorsSuggestionFact = {
	kind: MarketplaceSuggestionType;
	id: string;
	slug?: string;
	label: string;
	supportingLabel?: string;
};

/** The wire item seen structurally, so the mapper narrows `type` whatever the generated union says. */
type RawSuggestionItem = {
	type: string;
	id: string;
	label: string;
	slug: string;
	supportingLabel?: string;
};

/** The «Τι;» kinds, in the groups' order (specialties, services, doctors): the ONE list (NIT-2, U-29). */
export const SUGGESTION_KINDS: readonly MarketplaceSuggestionType[] = [
	'professional',
	'service',
	'doctor'
];

function toKind(type: string): MarketplaceSuggestionType | null {
	return (SUGGESTION_KINDS as readonly string[]).includes(type)
		? (type as MarketplaceSuggestionType)
		: null;
}

/** The suggestions' `data` as facts, in the server's order; an item of an unknown kind is dropped. */
export function mapSuggestionsToFacts(
	data: MarketplaceSuggestionsData
): SearchDoctorsSuggestionFact[] {
	return data.items.flatMap((item) => {
		const raw = item as RawSuggestionItem;
		const kind = toKind(raw.type);
		if (!kind) return [];

		const fact: SearchDoctorsSuggestionFact = {
			kind,
			id: raw.id,
			label: raw.label,
			...(raw.slug ? { slug: raw.slug } : {})
		};
		if (raw.supportingLabel) fact.supportingLabel = raw.supportingLabel;
		return [fact];
	});
}

/**
 * The top `limit` buckets of the facets' `specialties` (count first, upstream) as popular specialties. Absent-safe:
 * a server without the bucket gives none, and the «Τι;» list falls back to its static defaults.
 */
export function mapFacetsToPopularSpecialties(
	data: MarketplaceFacetsData,
	limit: number
): SearchDoctorsSuggestionFact[] {
	const bucket = (data.facets as { specialties?: MarketplaceFacetEntry[] }).specialties ?? [];

	return bucket.slice(0, limit).map((entry) => {
		// The bucket's slug is newer and optional (the requested language's); read through a narrowed view.
		const slug = (entry as { slug?: string }).slug;
		return {
			kind: 'professional' as const,
			id: entry.value,
			label: entry.label,
			...(slug ? { slug } : {})
		};
	});
}
