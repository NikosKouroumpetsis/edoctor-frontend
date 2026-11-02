import { m } from '$paraglide/messages.js';
import { criteriaTranslator } from '$modules/search-doctors/lib/criteria-messages';
import type { SearchCriteriaField } from '$modules/search-doctors/lib/search-criteria';
import { useId } from '$shared/lib/headless';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { SearchBarSegment, SearchBarSegmentSearch } from '$shared/ui/organisms/search-bar';
import { criteriaFields, getFieldValueLabel } from '../lib/fields';
import type { CriteriaLists } from './use-lists.svelte';
import type { CriteriaState } from './use-state.svelte';

export type CriteriaBar = {
	/** The bar's three segments («Τι», «Πού» typed in the bar, U-05.6; «Πότε» a button). */
	readonly segments: SearchBarSegment[];
	/** The open segment while the bar's panel shows, else `null`. */
	readonly active: SearchCriteriaField | null;
	/** A segment opened (the bar opens on it, or moves to it) or the bar closed (`null`). */
	setActive: (id: string | null) => void;
	/** The id of a row of a field's panel (`option` of the field's listbox). */
	optionIdPrefix: (field: SearchCriteriaField) => string;
};

const isField = (id: string): id is SearchCriteriaField =>
	(criteriaFields as string[]).includes(id);

/**
 * The kit's `SearchBar` from 744 on the search's ONE state (U-23.2): the segments say the choice or the bar's
 * placeholders («Προσθήκη διαθεσιμότητας»), the open «Τι» / «Πού» field shows what was typed (or the choice, as
 * Airbnb's), its panel's rows are its listbox — the arrows walk them, Enter picks.
 */
export function useCriteriaBar(
	state: CriteriaState,
	lists: CriteriaLists,
	locale: () => SupportedLocale
): CriteriaBar {
	const uid = useId(undefined, 'criteria-bar');
	const optionIdPrefix = (field: SearchCriteriaField) => `${uid}-${field}`;

	function searchOf(field: 'what' | 'where'): SearchBarSegmentSearch {
		const t = criteriaTranslator(locale());
		const rows = lists.rowsOf(field);
		const prefix = optionIdPrefix(field);
		return {
			query: state.queries[field] || (getFieldValueLabel(state.criteria, field, t) ?? ''),
			onQueryChange: (query) => state.updateQuery(field, query),
			optionIds: rows.map((row) => `${prefix}-${row.key}`),
			onCommit: (id) => rows.find((row) => `${prefix}-${row.key}` === id)?.select(),
			clearLabel: m.criteria_clear_field({}, { locale: locale() })
		};
	}

	const segments = $derived.by((): SearchBarSegment[] => {
		const options = { locale: locale() };
		const t = criteriaTranslator(options.locale);
		return [
			{
				id: 'what',
				label: m.search_what_label({}, options),
				placeholder: m.search_what_placeholder({}, options),
				value: getFieldValueLabel(state.criteria, 'what', t),
				search: searchOf('what')
			},
			{
				id: 'where',
				label: m.search_where_label({}, options),
				placeholder: m.search_where_placeholder({}, options),
				value: getFieldValueLabel(state.criteria, 'where', t),
				search: searchOf('where')
			},
			{
				id: 'availability',
				label: m.search_when_label({}, options),
				placeholder: m.search_when_placeholder({}, options),
				value: getFieldValueLabel(state.criteria, 'availability', t)
			}
		];
	});

	return {
		get segments() {
			return segments;
		},
		get active() {
			return state.surface === 'bar' ? state.expandedField : null;
		},
		setActive(id) {
			if (id === null || !isField(id)) {
				if (state.surface === 'bar') state.close();
				return;
			}
			if (state.surface === 'bar') state.updateExpandedField(id);
			else state.open('bar', id);
		},
		optionIdPrefix
	};
}
