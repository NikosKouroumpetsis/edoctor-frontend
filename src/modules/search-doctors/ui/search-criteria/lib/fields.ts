import type { CriteriaMessageKey } from '$modules/search-doctors/lib/criteria-messages';
import type {
	CriteriaSuggestionKind,
	CriteriaSuggestionOption
} from '$modules/search-doctors/lib/criteria-suggestions';
import {
	defaultSearchDoctorsCriteria,
	getSearchCriteriaOptionLabel,
	getSearchCriteriaOptions,
	type SearchCriteriaField,
	type SearchCriteriaOption,
	type SearchDoctorsCriteria,
	type WhatSelection,
	type WhereSelection
} from '$modules/search-doctors/lib/search-criteria';
import type { CriteriaQueryState, SearchPanelField } from '../types';

/**
 * The application's `search-criteria-modal/lib/criteria-modal` (S-01.6, the same rules on the web): the fields, the
 * static defaults, the normalized criteria a search sends and a field's closed-card words.
 */

type Translate = (key: CriteriaMessageKey) => string;

export const criteriaFields: SearchCriteriaField[] = ['what', 'where', 'availability'];

/**
 * The single `where` value whose selection reads the device's position instead of committing at once («Κοντά μου»):
 * the state branches on it, the list marks its row busy while the position is read.
 */
export const currentLocationOptionValue = 'current-location';

const defaultSuggestionValues: Record<SearchPanelField, string[]> = {
	what: ['internal-medicine', 'pediatrics', 'dentistry'],
	where: ['current-location', 'attiki']
};

const fieldEmptySummaryKeys: Record<SearchCriteriaField, CriteriaMessageKey> = {
	availability: 'criteria_when_empty',
	what: 'criteria_what_empty',
	where: 'criteria_where_empty'
};

export const emptyQueries: CriteriaQueryState = {
	availability: '',
	what: '',
	where: ''
};

/**
 * U-23.2 (web; the application's D2 the same): a choice opens the next card — «Τι» ⇒ «Πού» ⇒ «Πότε», which stays
 * open on its ✓ (the prototype's `{ what: 'where', where: 'when', when: 'when' }`).
 */
export const nextCriteriaField: Record<SearchCriteriaField, SearchCriteriaField> = {
	what: 'where',
	where: 'availability',
	availability: 'availability'
};

export function getCriteriaValue(criteria: SearchDoctorsCriteria, field: SearchCriteriaField) {
	return criteria[field];
}

export function getCriteriaValueWithDefault(
	criteria: SearchDoctorsCriteria,
	field: SearchCriteriaField
) {
	const value = getCriteriaValue(criteria, field).trim();
	return value || defaultSearchDoctorsCriteria[field];
}

/**
 * What a search sends: the words trimmed; a committed structured selection wins, free words become a `text`
 * selection (searched by name), an empty field carries none.
 */
export function normalizeCriteria(criteria: SearchDoctorsCriteria): SearchDoctorsCriteria {
	const what = criteria.what.trim();
	const where = criteria.where.trim();
	const whatSelection: WhatSelection | null =
		criteria.whatSelection ?? (what ? { kind: 'text', label: what } : null);
	const whereSelection: WhereSelection | null =
		criteria.whereSelection ?? (where ? { kind: 'text', label: where } : null);

	return {
		availability: criteria.availability.trim(),
		what,
		where,
		whatSelection,
		whereSelection
	};
}

export function setCriteriaValue(
	criteria: SearchDoctorsCriteria,
	field: SearchCriteriaField,
	value: string
): SearchDoctorsCriteria {
	return { ...criteria, [field]: value };
}

export function getOptionLabel(option: SearchCriteriaOption, t: Translate) {
	return option.label ?? (option.labelKey ? t(option.labelKey) : option.value);
}

export function getOptionSupportingLabel(option: SearchCriteriaOption, t: Translate) {
	return (
		option.supportingLabel ?? (option.supportingLabelKey ? t(option.supportingLabelKey) : undefined)
	);
}

/** A field's words on its closed card: the choice, or «Προσθέστε …» while it is empty. */
export function getFieldSummary(
	criteria: SearchDoctorsCriteria,
	field: SearchCriteriaField,
	t: Translate
) {
	const value = getCriteriaValue(criteria, field).trim();
	if (!value) return t(fieldEmptySummaryKeys[field]);
	return getSearchCriteriaOptionLabel(field, value, t) || value;
}

/** A field's choice in words, or `undefined` while it is empty (the bar's segment shows its placeholder). */
export function getFieldValueLabel(
	criteria: SearchDoctorsCriteria,
	field: SearchCriteriaField,
	t: Translate
): string | undefined {
	const value = getCriteriaValue(criteria, field).trim();
	if (!value) return undefined;
	return getSearchCriteriaOptionLabel(field, value, t) || value;
}

export function getDefaultSuggestionOptions(field: SearchPanelField) {
	const fieldOptions = getSearchCriteriaOptions(field, '');
	return defaultSuggestionValues[field]
		.map((value) => fieldOptions.find((option) => option.value === value))
		.filter((option): option is SearchCriteriaOption => Boolean(option));
}

/**
 * The static «Τι;» defaults as suggestion rows, the empty list's fallback when the popular specialties cannot be read
 * (an older backend, a failed read). They carry no `professionalId`, so a tap commits free `text` (search by name).
 */
export function getWhatFallbackSuggestionOptions(t: Translate): CriteriaSuggestionOption[] {
	return getDefaultSuggestionOptions('what').map((option) => {
		const kind: CriteriaSuggestionKind =
			option.kind === 'service' ? 'service' : option.kind === 'doctor' ? 'doctor' : 'professional';
		return { kind, value: option.value, slug: option.value, label: getOptionLabel(option, t) };
	});
}
