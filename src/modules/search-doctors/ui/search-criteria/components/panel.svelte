<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SearchCriteriaField } from '$modules/search-doctors/lib/search-criteria';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import type { SearchBarPanelContext } from '$shared/ui/organisms/search-bar';
	import type { CriteriaBar } from '../hooks/use-bar.svelte';
	import type { CriteriaLists } from '../hooks/use-lists.svelte';
	import CriteriaList from './option-list.svelte';

	let {
		field,
		context,
		bar,
		lists,
		locale
	}: {
		/** The bar's open segment. */
		field: string;
		context: SearchBarPanelContext;
		bar: CriteriaBar;
		lists: CriteriaLists;
		locale: SupportedLocale;
	} = $props();

	const options = $derived({ locale });
	const shown = $derived<SearchCriteriaField>(
		field === 'where' || field === 'availability' ? field : 'what'
	);
	const labels = $derived<Record<SearchCriteriaField, string>>({
		what: m.search_what_label({}, options),
		where: m.search_where_label({}, options),
		availability: m.search_when_label({}, options)
	});
</script>

<!-- From 744 (U-23.2, §6.4): the panel of the bar's open segment — «Τι» / «Πού» the rows of the field typed in the
     bar (its listbox), «Πότε» its line and four rows; the rows of §6.2 / §6.3. -->
<div data-slot="criteria-panel" data-field={shown} class="px-2 pt-1">
	<CriteriaList
		view={lists.viewOf(shown)}
		listbox={shown === 'availability' ? undefined : { id: context.listboxId, label: labels[shown] }}
		activeId={context.activeId}
		idPrefix={bar.optionIdPrefix(shown)}
	/>
</div>
