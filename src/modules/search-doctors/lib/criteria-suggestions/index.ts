import {
	SUGGESTION_KINDS,
	type SearchDoctorsSuggestionFact
} from '$modules/search-doctors/api/marketplace/suggestions-adapter';
import type { CriteriaMessageKey } from '$modules/search-doctors/lib/criteria-messages';
import type { WhatSelection } from '$modules/search-doctors/lib/search-criteria';

/**
 * The «Τι;» rows, the application's `lib/criteria-suggestions` (S-01.6, the same rules): facts become options,
 * grouped specialties ⇒ services ⇒ doctors, capped per group; a tapped option becomes the structured selection.
 * The glyph of a row is the module's ONE icon config (`config/criteria-icons`, U-21/U-23).
 */

/** The category of a «Τι;» suggestion; the api fact's kind. */
export type CriteriaSuggestionKind = SearchDoctorsSuggestionFact['kind'];

/**
 * One drawn row: `value` its stable identity (the `professionalId` of a specialty, the `slug` of a service or a
 * doctor), `id`/`slug` the structured identity a commit or an opening needs.
 */
export type CriteriaSuggestionOption = {
	kind: CriteriaSuggestionKind;
	value: string;
	label: string;
	id?: string;
	slug?: string;
	supportingLabel?: string;
};

/** A drawn category: its header and its (already capped) rows. */
export type CriteriaSuggestionGroup = {
	kind: CriteriaSuggestionKind;
	headerKey: CriteriaMessageKey;
	options: CriteriaSuggestionOption[];
};

/** The order of the groups: specialties, then services, then doctors. */
export const criteriaSuggestionKindOrder: CriteriaSuggestionKind[] = [...SUGGESTION_KINDS];

const criteriaSuggestionKindHeaderKeys: Record<CriteriaSuggestionKind, CriteriaMessageKey> = {
	professional: 'criteria_group_specialties',
	service: 'criteria_group_services',
	doctor: 'criteria_group_doctors'
};

function stableValue(fact: SearchDoctorsSuggestionFact): string {
	return fact.kind === 'professional'
		? (fact.id ?? fact.slug ?? fact.label)
		: (fact.slug ?? fact.id ?? fact.label);
}

/** A fact as a row, keeping only the identity it has. */
export function toCriteriaSuggestionOption(
	fact: SearchDoctorsSuggestionFact
): CriteriaSuggestionOption {
	const option: CriteriaSuggestionOption = {
		kind: fact.kind,
		value: stableValue(fact),
		label: fact.label
	};
	if (fact.id) option.id = fact.id;
	if (fact.slug) option.slug = fact.slug;
	if (fact.supportingLabel) option.supportingLabel = fact.supportingLabel;
	return option;
}

/**
 * The facts in ordered, non-empty groups. `limitPerType` repeats the server's cap as a second bound; a group with no
 * row is left out, so its header never shows.
 */
export function buildCriteriaSuggestionGroups(
	facts: SearchDoctorsSuggestionFact[],
	options: { limitPerType?: number } = {}
): CriteriaSuggestionGroup[] {
	const { limitPerType } = options;
	return criteriaSuggestionKindOrder.flatMap((kind) => {
		const kindFacts = facts.filter((fact) => fact.kind === kind);
		const capped = typeof limitPerType === 'number' ? kindFacts.slice(0, limitPerType) : kindFacts;
		if (capped.length === 0) return [];
		return [
			{
				kind,
				headerKey: criteriaSuggestionKindHeaderKeys[kind],
				options: capped.map(toCriteriaSuggestionOption)
			}
		];
	});
}

/** The popular specialties as the rows of the empty «Τι;» list. */
export function buildPopularSpecialtyOptions(
	facts: SearchDoctorsSuggestionFact[]
): CriteriaSuggestionOption[] {
	return facts.map(toCriteriaSuggestionOption);
}

/**
 * A tapped specialty or service as the structured «Τι;»: a specialty with a real `professionalId` is `professional`
 * (with its slug when it has one), a service with a slug is `service`, anything else (a static fallback with no
 * backend id) is free `text`, searched by name. A doctor never reaches here: it opens the doctor's page.
 */
export function toWhatSelection(option: CriteriaSuggestionOption): WhatSelection {
	if (option.kind === 'professional' && option.id) {
		return {
			kind: 'professional',
			label: option.label,
			id: option.id,
			...(option.slug ? { slug: option.slug } : {})
		};
	}
	if (option.kind === 'service' && option.slug) {
		return { kind: 'service', label: option.label, slug: option.slug };
	}
	return { kind: 'text', label: option.label };
}
