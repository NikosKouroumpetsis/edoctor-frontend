import type {
	SearchDoctorsLocationFact,
	SearchDoctorsLocationType
} from '$modules/search-doctors/api/marketplace/location-suggestions-adapter';
import type { ReadyLocationLookup } from '$modules/search-doctors/api/marketplace/suggestions';
import { foldSearchText } from '$shared/lib/text';
import {
	translateCriteria,
	type CriteriaMessageKey
} from '$modules/search-doctors/lib/criteria-messages';
import type { WhereSelection } from '$modules/search-doctors/lib/search-criteria';

/**
 * The «Πού;» rows, the application's `lib/criteria-locations` (S-01.6, the same rules: S-03.2 / S-17 / S-19.1 /
 * S-20.1 / S-28): the big words are the server's name, the grey line its parents, the slug what a search sends.
 */

type Translate = (key: CriteriaMessageKey) => string;

export type CriteriaLocationOption = {
	slug: string;
	type: SearchDoctorsLocationType;
	label: string;
	supportingLabel?: string;
	latitude: number;
	longitude: number;
};

export type ReadyLocationRow = {
	labelKey: CriteriaMessageKey;
	supportingLabelKey: CriteriaMessageKey;
	type: SearchDoctorsLocationType;
};

/** The ready regional-unit rows of an empty «Πού;», after «Κοντά μου» and «Αττική» (owner S-18.8). */
export const readyRegionalUnitRows: ReadyLocationRow[] = [
	{
		labelKey: 'criteria_option_piraeus_regional_unit',
		supportingLabelKey: 'criteria_option_attiki',
		type: 'REGIONAL_UNIT'
	},
	{
		labelKey: 'criteria_option_central_athens_regional_unit',
		supportingLabelKey: 'criteria_option_attiki',
		type: 'REGIONAL_UNIT'
	}
];

/**
 * The grey line under a location row: its parents, specific to broad (municipality, regional unit, region), without
 * a level equal to the row's own `displayName` or a repeat — «Περιφερειακή Ενότητα Πειραιά, Αττική»; else the
 * server's `context`; else nothing.
 */
export function buildLocationBreadcrumb(fact: SearchDoctorsLocationFact): string | undefined {
	const foldedName = foldSearchText(fact.displayName);
	const parts = [fact.hierarchy.municipality, fact.hierarchy.regionalUnit, fact.hierarchy.region]
		.filter((value): value is string => Boolean(value))
		.filter((value) => foldSearchText(value) !== foldedName);
	const unique = [...new Set(parts)];
	if (unique.length > 0) return unique.join(', ');
	return fact.context ?? undefined;
}

/**
 * A server row as a drawn option: the big words are the server's own name (`label`, owner S-20.1), never the hidden
 * full name; the grey line the breadcrumb; the `slug` the identity a search sends (S-17).
 */
export function toCriteriaLocationOption(fact: SearchDoctorsLocationFact): CriteriaLocationOption {
	const breadcrumb = buildLocationBreadcrumb(fact);
	const option: CriteriaLocationOption = {
		slug: fact.slug,
		type: fact.type,
		label: fact.label,
		latitude: fact.latitude,
		longitude: fact.longitude
	};
	if (breadcrumb) option.supportingLabel = breadcrumb;
	return option;
}

/** The server's rows in its relevance order, as ONE flat list (no per-level headers, unlike «Τι;»). */
export function buildCriteriaLocationOptions(
	facts: SearchDoctorsLocationFact[]
): CriteriaLocationOption[] {
	return facts.map(toCriteriaLocationOption);
}

/** A tapped location row as the structured «Πού;». */
export function toWhereSelection(option: CriteriaLocationOption): WhereSelection {
	return { kind: 'location', label: option.label, slug: option.slug, locationType: option.type };
}

/**
 * The server lookup of a ready row: its GREEK words, exactly the catalogue's name, and its level. The words and the
 * name are one string, so the row can never search under a name it does not show.
 */
export function toReadyLocationLookup(row: ReadyLocationRow): ReadyLocationLookup {
	return { name: translateCriteria(row.labelKey, 'el'), type: row.type };
}

/**
 * The ready rows the server found: the words and the grey line from the catalog, the `slug` and coordinates from the
 * server row. `facts` follows `rows`; a row whose fact is `null` (not found, failed, waiting) is left out, never
 * replaced.
 */
export function buildReadyLocationOptions(
	rows: ReadyLocationRow[],
	facts: (SearchDoctorsLocationFact | null)[],
	t: Translate
): CriteriaLocationOption[] {
	return rows.flatMap((row, index) => {
		const fact = facts[index];
		if (!fact) return [];
		return [
			{
				slug: fact.slug,
				type: fact.type,
				label: t(row.labelKey),
				supportingLabel: t(row.supportingLabelKey),
				latitude: fact.latitude,
				longitude: fact.longitude
			}
		];
	});
}
