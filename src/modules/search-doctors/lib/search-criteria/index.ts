import { foldSearchText } from '$shared/lib/text';
import type { CriteriaMessageKey } from '$modules/search-doctors/lib/criteria-messages';
import {
	buildSearchDoctorsFilterParams,
	type SearchDoctorsFilters
} from '$modules/search-doctors/lib/search-filters';

/**
 * The search criteria as the application models them (`application/src/modules/search-doctors/lib/search-criteria`,
 * S-01.6: the same logic on the web): the three fields «Τι / Πού / Πότε», their static options, the structured
 * selections and their URL projection with the application's parameter names, both ways.
 */

export type SearchCriteriaField = 'what' | 'where' | 'availability';

export type SearchCriteriaOptionKind =
	| 'specialty'
	| 'service'
	| 'doctor'
	| 'area'
	| 'region'
	| 'current-location'
	| 'availability';

export type SearchCriteriaOption = {
	field: SearchCriteriaField;
	id: string;
	kind: SearchCriteriaOptionKind;
	keywords: string[];
	label?: string;
	labelKey?: CriteriaMessageKey;
	supportingLabel?: string;
	supportingLabelKey?: CriteriaMessageKey;
	value: string;
};

/** `professional` carries a `professionalId`, `service` a slug, `text` is free words with no entity. */
export type WhatSelectionKind = 'professional' | 'service' | 'text';

export type WhatSelection = {
	kind: WhatSelectionKind;
	label: string;
	id?: string;
	slug?: string;
};

/** `location` carries a location slug, `current-location` a device fix, `text` free words. */
export type WhereSelectionKind = 'location' | 'current-location' | 'text';

export type WhereSelection = {
	kind: WhereSelectionKind;
	label: string;
	slug?: string;
	locationType?: string;
	latitude?: number;
	longitude?: number;
};

export type SearchDoctorsCriteria = {
	availability: string;
	what: string;
	where: string;
	/** Structured «Τι;» selection; `null` while the field is empty or holds only free text. */
	whatSelection: WhatSelection | null;
	/** Structured «Πού;» selection; `null` while the field is empty or holds only free text. */
	whereSelection: WhereSelection | null;
};

/** The URL projection of the criteria: every value a string, only the keys a selection uses. */
export type SearchDoctorsCriteriaParams = {
	availability?: string;
	what?: string;
	where?: string;
	whatKind?: string;
	whatId?: string;
	whatSlug?: string;
	whatLabel?: string;
	whereKind?: string;
	whereSlug?: string;
	whereLabel?: string;
	whereLat?: string;
	whereLng?: string;
};

export type SearchDoctorsCriteriaSummaryItem = {
	field: SearchCriteriaField;
	labelKey: CriteriaMessageKey;
	value: string;
};

type Translate = (key: CriteriaMessageKey) => string;

export const defaultSearchDoctorsCriteria: SearchDoctorsCriteria = {
	availability: '',
	what: '',
	where: '',
	whatSelection: null,
	whereSelection: null
};

/**
 * The static «Τι;» options the web shows: the application's fallback «Προτεινόμενες ειδικότητες» (its
 * `defaultSuggestionValues.what`), when the popular specialties cannot be read. The application's other mock
 * options (its other specialties, services, areas and two named doctors) are on no screen of either side.
 */
const whatOptions: SearchCriteriaOption[] = [
	{
		field: 'what',
		id: 'what-internal-medicine',
		kind: 'specialty',
		keywords: ['internist', 'internal', 'medicine', 'pathologos', 'παθολόγος', 'παθολογος', 'παθ'],
		labelKey: 'criteria_option_internal_medicine',
		supportingLabelKey: 'criteria_option_specialty_supporting',
		value: 'internal-medicine'
	},
	{
		field: 'what',
		id: 'what-pediatrics',
		kind: 'specialty',
		keywords: ['pediatrician', 'pediatrics', 'paidiatros', 'παιδίατρος', 'παιδιατρος'],
		labelKey: 'criteria_option_pediatrics',
		supportingLabelKey: 'criteria_option_specialty_supporting',
		value: 'pediatrics'
	},
	{
		field: 'what',
		id: 'what-dentistry',
		kind: 'specialty',
		keywords: ['dentistry', 'dentist', 'odontiatros', 'οδοντίατρος', 'οδοντιατρος', 'οδον'],
		labelKey: 'criteria_option_dentistry',
		supportingLabelKey: 'criteria_option_specialty_supporting',
		value: 'dentistry'
	}
];

/** The static «Πού;» options the web shows: «Κοντά μου» and «Αττική», the first two ready rows (S-18.8). */
const whereOptions: SearchCriteriaOption[] = [
	{
		field: 'where',
		id: 'where-current-location',
		kind: 'current-location',
		keywords: ['current', 'location', 'τοποθεσία', 'τοποθεσια', 'κοντά μου', 'κοντα'],
		labelKey: 'criteria_option_current_location',
		supportingLabelKey: 'criteria_option_current_location_supporting',
		value: 'current-location'
	},
	{
		field: 'where',
		id: 'where-attiki',
		kind: 'region',
		keywords: ['attica', 'attiki', 'αττική', 'αττικη'],
		labelKey: 'criteria_option_attiki',
		supportingLabelKey: 'criteria_option_region_supporting',
		value: 'attiki'
	}
];

/**
 * The «Πότε;» values are the CANONICAL backend `availability` tokens (`DoctorPublicMarketplaceAvailability`:
 * `today | next3Days | next7Days | all`); the search sends them as they are.
 */
export const searchDoctorsAvailabilityValues = ['today', 'next3Days', 'next7Days', 'all'] as const;

export type SearchDoctorsAvailabilityValue = (typeof searchDoctorsAvailabilityValues)[number];

type AvailabilityOption = SearchCriteriaOption & { value: SearchDoctorsAvailabilityValue };

// The picklist order: today -> next3Days -> next7Days -> all.
const availabilityOptions: AvailabilityOption[] = [
	{
		field: 'availability',
		id: 'availability-today',
		kind: 'availability',
		keywords: ['today', 'σήμερα', 'σημερα'],
		labelKey: 'criteria_option_availability_today',
		value: 'today'
	},
	{
		field: 'availability',
		id: 'availability-next-3-days',
		kind: 'availability',
		keywords: [
			'next',
			'3',
			'three',
			'days',
			'3days',
			'τριημερο',
			'τριήμερο',
			'επόμενες',
			'επομενες',
			'ημέρες',
			'ημερες'
		],
		labelKey: 'criteria_option_availability_next3_days',
		value: 'next3Days'
	},
	{
		field: 'availability',
		id: 'availability-next-7-days',
		kind: 'availability',
		keywords: [
			'next',
			'7',
			'seven',
			'days',
			'7days',
			'week',
			'εβδομάδα',
			'εβδομαδα',
			'επόμενες',
			'επομενες',
			'ημέρες',
			'ημερες'
		],
		labelKey: 'criteria_option_availability_next7_days',
		value: 'next7Days'
	},
	{
		field: 'availability',
		id: 'availability-anytime',
		kind: 'availability',
		keywords: [
			'all',
			'any',
			'anytime',
			'whenever',
			'οποτεδήποτε',
			'οποτεδηποτε',
			'οποτε',
			'οποιαδήποτε',
			'οποιαδηποτε'
		],
		labelKey: 'criteria_option_availability_anytime',
		value: 'all'
	}
];

const optionsByField: Record<SearchCriteriaField, SearchCriteriaOption[]> = {
	availability: availabilityOptions,
	what: whatOptions,
	where: whereOptions
};

function normalizeQuery(value: string) {
	return foldSearchText(value.trim());
}

function getOptionLabel(option: SearchCriteriaOption, translate: Translate) {
	return option.label ?? (option.labelKey ? translate(option.labelKey) : option.value);
}

/** A field's static options, those whose value, label or keywords hold the folded query (all for none). */
export function getSearchCriteriaOptions(field: SearchCriteriaField, query: string) {
	const normalizedQuery = normalizeQuery(query);
	const options = optionsByField[field];

	if (!normalizedQuery) return options;

	return options.filter((option) => {
		const values = [option.value, option.label, ...option.keywords].filter(Boolean);
		return values.some((value) => value && foldSearchText(value).includes(normalizedQuery));
	});
}

/** The words of a stored value: a static option's label, else the value itself (a typed or chosen label). */
export function getSearchCriteriaOptionLabel(
	field: SearchCriteriaField,
	value: string,
	translate: Translate
) {
	if (!value) return '';

	const option = optionsByField[field].find((candidate) => candidate.value === value);
	return option ? getOptionLabel(option, translate) : value;
}

const whatSelectionKinds: WhatSelectionKind[] = ['professional', 'service', 'text'];
const whereSelectionKinds: WhereSelectionKind[] = ['location', 'current-location', 'text'];

function toWhatSelectionKind(value: string | undefined): WhatSelectionKind | undefined {
	return whatSelectionKinds.find((kind) => kind === value);
}

function toWhereSelectionKind(value: string | undefined): WhereSelectionKind | undefined {
	return whereSelectionKinds.find((kind) => kind === value);
}

/** A `professional` carries its id and a `service` its slug; anything else is a `text` selection (search by name). */
function resolveWhatSelectionFromParams(params: SearchDoctorsCriteriaParams): WhatSelection | null {
	const displayWhat = params.what?.trim() ?? '';
	const label = params.whatLabel?.trim() || displayWhat;
	const kind = toWhatSelectionKind(params.whatKind);

	if (!label) return null;

	if (kind === 'professional' && params.whatId?.trim()) {
		const slug = params.whatSlug?.trim();
		return { kind, label, id: params.whatId.trim(), ...(slug ? { slug } : {}) };
	}

	if (kind === 'service' && params.whatSlug?.trim()) {
		return { kind, label, slug: params.whatSlug.trim() };
	}

	return { kind: 'text', label };
}

/** A `location` carries its slug, a `current-location` its parsed coordinates; anything else is `text`. */
function resolveWhereSelectionFromParams(
	params: SearchDoctorsCriteriaParams
): WhereSelection | null {
	const displayWhere = params.where?.trim() ?? '';
	const label = params.whereLabel?.trim() || displayWhere;
	const kind = toWhereSelectionKind(params.whereKind);

	if (kind === 'location' && params.whereSlug?.trim()) {
		return { kind, label, slug: params.whereSlug.trim() };
	}

	if (kind === 'current-location') {
		const latitude = Number(params.whereLat);
		const longitude = Number(params.whereLng);
		if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
			return { kind, label, latitude, longitude };
		}
	}

	return label ? { kind: 'text', label } : null;
}

/**
 * 🔴 The application's `resolveSearchDoctorsCriteria`: the criteria back from their URL parameters, the structured
 * selections intact (a location by its slug, a device fix by its coordinates), the words defaulting to the label.
 */
export function resolveSearchDoctorsCriteria(
	params: SearchDoctorsCriteriaParams
): SearchDoctorsCriteria {
	const whatSelection = resolveWhatSelectionFromParams(params);
	const whereSelection = resolveWhereSelectionFromParams(params);
	const what = params.what?.trim() || whatSelection?.label || defaultSearchDoctorsCriteria.what;
	const where = params.where?.trim() || whereSelection?.label || defaultSearchDoctorsCriteria.where;

	return {
		availability: params.availability?.trim() ?? defaultSearchDoctorsCriteria.availability,
		what,
		where,
		whatSelection,
		whereSelection
	};
}

/** 🔴 The application's `buildSearchDoctorsQueryParams`, key for key (same names, same order, same omissions). */
export function buildSearchDoctorsQueryParams(
	criteria: SearchDoctorsCriteria
): SearchDoctorsCriteriaParams {
	const availability = criteria.availability.trim();
	const what = criteria.what.trim();
	const where = criteria.where.trim();

	const params: SearchDoctorsCriteriaParams = {
		...(availability ? { availability } : {}),
		...(what ? { what } : {}),
		...(where ? { where } : {})
	};

	const { whatSelection, whereSelection } = criteria;

	if (whatSelection) {
		params.whatKind = whatSelection.kind;
		params.whatLabel = whatSelection.label;
		if (whatSelection.id) params.whatId = whatSelection.id;
		if (whatSelection.slug) params.whatSlug = whatSelection.slug;
	}

	if (whereSelection) {
		params.whereKind = whereSelection.kind;
		params.whereLabel = whereSelection.label;
		if (whereSelection.slug) params.whereSlug = whereSelection.slug;
		if (typeof whereSelection.latitude === 'number') {
			params.whereLat = String(whereSelection.latitude);
		}
		if (typeof whereSelection.longitude === 'number') {
			params.whereLng = String(whereSelection.longitude);
		}
	}

	return params;
}

/** Every URL parameter a criteria projection can emit (the application's `searchDoctorsCriteriaParamKeys`). */
export const searchDoctorsCriteriaParamKeys = [
	'availability',
	'what',
	'where',
	'whatKind',
	'whatId',
	'whatSlug',
	'whatLabel',
	'whereKind',
	'whereSlug',
	'whereLabel',
	'whereLat',
	'whereLng'
] as const satisfies readonly (keyof SearchDoctorsCriteriaParams)[];

/**
 * 🔴 S-07.3 rule 11 on the web (a declared platform difference; the application's route params are no link): the
 * results ADDRESS never carries the device's coordinates. «Κοντά μου» rides as `whereKind=current-location` with its
 * label; the coordinates stay in the tab's memory (`lib/device-location`).
 */
const webOmittedParamKeys: readonly (keyof SearchDoctorsCriteriaParams)[] = [
	'whereLat',
	'whereLng'
];

/** The names a web results address carries: the application's twelve but the coordinates. */
export const searchResultsParamKeys = searchDoctorsCriteriaParamKeys.filter(
	(key) => !webOmittedParamKeys.includes(key)
);

/**
 * The criteria of a results address (`/doctors?…`), the application's route params read the same way: only its
 * names count, the first value of each, everything else ignored — and never coordinates (S-07.3 rule 11, web): an
 * old link with `whereLat`/`whereLng` is read without them, its «Κοντά μου» a `current-location` without a position,
 * which the results page fills from this visit's memory or asks the device for (the receiver's own position).
 */
export function readSearchDoctorsCriteria(searchParams: URLSearchParams): SearchDoctorsCriteria {
	const params: SearchDoctorsCriteriaParams = {};
	for (const key of searchResultsParamKeys) {
		const value = searchParams.get(key);
		if (value !== null) params[key] = value;
	}
	const criteria = resolveSearchDoctorsCriteria(params);
	if (params.whereKind !== 'current-location' || !criteria.where) return criteria;
	return {
		...criteria,
		whereSelection: {
			kind: 'current-location',
			label: params.whereLabel?.trim() || criteria.where
		}
	};
}

/** A free-words «Τι» or «Πού» (the application's `text` selection): the label is the words. */
export function textSelection(label: string): { kind: 'text'; label: string } {
	return { kind: 'text', label };
}

/**
 * The results page for these criteria: `resultsPath` (the localized `/doctors`) and the query string of
 * `buildSearchDoctorsQueryParams` without the coordinates (S-07.3 rule 11, web), then the applied filters by the
 * application's names (`buildSearchDoctorsFilterParams`, U-24.2: a filtered page is a link that shares and steps
 * back); no query at all for empty criteria and no filter.
 */
export function searchResultsHref(
	resultsPath: string,
	criteria: SearchDoctorsCriteria,
	filters?: SearchDoctorsFilters
): string {
	const entries = Object.entries(buildSearchDoctorsQueryParams(criteria)).filter(
		([key]) => !webOmittedParamKeys.includes(key as keyof SearchDoctorsCriteriaParams)
	) as [string, string][];
	if (filters) {
		entries.push(
			...(Object.entries(buildSearchDoctorsFilterParams(filters)) as [string, string][])
		);
	}
	const query = new URLSearchParams(entries).toString();
	return query ? `${resultsPath}?${query}` : resultsPath;
}
