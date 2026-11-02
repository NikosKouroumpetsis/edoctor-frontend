<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { CriteriaSuggestionOption } from '$modules/search-doctors/lib/criteria-suggestions';
	import type { SearchDoctorsCriteria } from '$modules/search-doctors/lib/search-criteria';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { SearchBar, type SearchBarPanelContext } from '$shared/ui/organisms/search-bar';
	import CriteriaPanel from '../components/panel.svelte';
	import { useCriteriaBar } from '../hooks/use-bar.svelte';
	import { CriteriaLists } from '../hooks/use-lists.svelte';
	import { CriteriaState } from '../hooks/use-state.svelte';
	import SearchCriteria from './index.svelte';

	/**
	 * Tests only (inside `QueryHarness`): the search as the home composes it — the phone's window and the bar from
	 * 744 on ONE state, the «now» of the «Πότε» dates fixed by the test.
	 */
	let {
		locale = 'el',
		now,
		onSubmit = () => {},
		onSelectDoctor = () => {},
		onReady
	}: {
		locale?: SupportedLocale;
		now?: () => number;
		onSubmit?: (criteria: SearchDoctorsCriteria) => void;
		onSelectDoctor?: (option: CriteriaSuggestionOption) => void;
		onReady?: (search: CriteriaState) => void;
	} = $props();

	const search = new CriteriaState({
		onSubmit: (criteria) => onSubmit(criteria),
		currentLocationLabel: () => m.criteria_option_current_location({}, { locale })
	});
	// svelte-ignore state_referenced_locally
	const lists = new CriteriaLists(search, {
		locale: () => locale,
		onSelectDoctor: (option) => onSelectDoctor(option),
		now
	});
	const bar = useCriteriaBar(search, lists, () => locale);
	// svelte-ignore state_referenced_locally
	onReady?.(search);
</script>

{#snippet panel(field: string, context: SearchBarPanelContext)}
	<CriteriaPanel {field} {context} {bar} {lists} {locale} />
{/snippet}

<SearchCriteria {search} {lists} {locale} />
<SearchBar
	segments={bar.segments}
	bind:active={() => bar.active, (id) => bar.setActive(id)}
	submitLabel={m.search_submit({}, { locale })}
	onSubmit={() => search.submitCriteria()}
	panelTitle={m.search_title({}, { locale })}
	closeLabel={m.search_close({}, { locale })}
	{panel}
	testId="criteria-bar"
/>
