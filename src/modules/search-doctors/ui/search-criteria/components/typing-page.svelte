<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { Presence, useId } from '$shared/lib/headless';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { SearchField } from '$shared/ui/molecules/search-field';
	import type { CriteriaLists } from '../hooks/use-lists.svelte';
	import type { CriteriaState } from '../hooks/use-state.svelte';
	import type { SearchPanelField } from '../types';
	import CriteriaList from './option-list.svelte';

	let {
		search,
		lists,
		locale
	}: { search: CriteriaState; lists: CriteriaLists; locale: SupportedLocale } = $props();

	const uid = useId(undefined, 'criteria-typing');
	const options = $derived({ locale });
	// It rises in and out in CSS (0.25 s on Airbnb's curve); while it leaves it keeps the field it showed.
	const presence = new Presence(() => search.activeSearchPanel !== null, { duration: 'standard' });
	let shownField = $state<SearchPanelField>('what');
	$effect.pre(() => {
		if (search.activeSearchPanel) shownField = search.activeSearchPanel;
	});

	let input = $state<HTMLInputElement | null>(null);
	let activeId = $state<string | undefined>();
	const listboxId = $derived(`${uid}-${shownField}-listbox`);
	const idPrefix = $derived(`${uid}-${shownField}`);
	const rows = $derived(lists.rowsOf(shownField));
	const optionIds = $derived(rows.map((row) => `${idPrefix}-${row.key}`));

	// The caret goes into the field the page opens on (Airbnb's), once it is in the DOM.
	$effect(() => {
		if (!search.activeSearchPanel) return;
		void tick().then(() => input?.focus({ preventScroll: true }));
	});

	const placeholder = $derived(
		shownField === 'what'
			? m.criteria_what_field({}, options)
			: m.search_where_placeholder({}, options)
	);
	const label = $derived(
		shownField === 'what' ? m.search_what_label({}, options) : m.search_where_label({}, options)
	);
</script>

<!-- U-23.2: pressing a card's field opens Airbnb's full typing page over the window (the application's
     `criteria-secondary-search-panel`): «‹», the field with its bold rim, «×»; the typed letters bold in the rows. -->
{#if presence.present}
	<div
		use:presence.track
		role="dialog"
		aria-label={label}
		data-slot="criteria-typing-page"
		data-state={presence.state}
		data-testid="search-criteria-typing-page"
		inert={presence.closing}
		class="absolute inset-x-0 top-2.5 bottom-0 flex flex-col rounded-t-xl bg-card shadow-overlay transition-[translate,opacity] duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:translate-y-3 data-[state=closed]:opacity-0 starting:translate-y-3 starting:opacity-0"
	>
		<SearchField
			variant="active"
			bind:ref={input}
			bind:activeId
			value={search.queries[shownField]}
			onChangeText={(value) => search.updateQuery(shownField, value)}
			{placeholder}
			aria-label={label}
			onBack={() => search.closeSearchPanel()}
			backLabel={m.criteria_back({}, options)}
			backTestId="search-criteria-panel-back"
			onClear={() => search.clearField(shownField)}
			clearLabel={m.criteria_clear_field({}, options)}
			clearTestId="search-criteria-panel-clear"
			testId={`search-criteria-${shownField}-input`}
			{listboxId}
			{optionIds}
			onCommit={(id) => rows.find((row) => `${idPrefix}-${row.key}` === id)?.select()}
			class="mx-5 mt-5 mb-2"
		/>
		<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pt-1 pb-6">
			<CriteriaList
				view={lists.viewOf(shownField)}
				listbox={{ id: listboxId, label }}
				{activeId}
				{idPrefix}
			/>
		</div>
	</div>
{/if}
