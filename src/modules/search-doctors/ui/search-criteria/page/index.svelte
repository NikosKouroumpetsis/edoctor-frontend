<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { criteriaTranslator } from '$modules/search-doctors/lib/criteria-messages';
	import type { SearchCriteriaField } from '$modules/search-doctors/lib/search-criteria';
	import { useId } from '$shared/lib/headless';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { SearchField } from '$shared/ui/molecules/search-field';
	import { StepCard } from '$shared/ui/molecules/step-card';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { ModalScreenSurface, type ModalOrigin } from '$shared/ui/templates/modal-screen';
	import CriteriaList from '../components/option-list.svelte';
	import CriteriaTypingPage from '../components/typing-page.svelte';
	import type { CriteriaLists } from '../hooks/use-lists.svelte';
	import type { CriteriaState } from '../hooks/use-state.svelte';
	import { criteriaFields, getFieldSummary, getFieldValueLabel } from '../lib/fields';

	let {
		search,
		lists,
		locale,
		sourceLayout
	}: {
		/** The search's ONE state (the phone's window and the bar from 744). */
		search: CriteriaState;
		lists: CriteriaLists;
		locale: SupportedLocale;
		/** The pressed pill's rect: the window grows out of it and back into it. */
		sourceLayout?: ModalOrigin;
	} = $props();

	const uid = useId(undefined, 'criteria-sheet');
	const options = $derived({ locale });
	const t = $derived(criteriaTranslator(locale));
	const typing = $derived(search.activeSearchPanel !== null);

	const cardLabels = $derived<Record<SearchCriteriaField, string>>({
		what: m.search_card_what({}, options),
		where: m.search_card_where({}, options),
		availability: m.search_card_when({}, options)
	});
	const cardTitles = $derived<Record<SearchCriteriaField, string>>({
		what: m.search_what_label({}, options),
		where: m.search_where_label({}, options),
		availability: m.search_when_label({}, options)
	});
	const fieldPlaceholders = $derived({
		what: m.criteria_what_field({}, options),
		where: m.search_where_placeholder({}, options)
	});

	// MAJOR-1 (r1): EVERY change of the open card — a closed card pressed (its button gives way to the card), a choice
	// that opens the next one, the way back from the typing page — keeps the focus in the window: when the node that
	// held it is gone (the focus fell to the page), it goes to the open card's field, or its first row («Πότε»). The
	// window's first card keeps the surface's own focus (U-09.7); a focus still on a live control is left alone.
	let cards = $state<HTMLElement | null>(null);
	// The `inert` property up the tree: browsers reflect the attribute into it; jsdom has none and Svelte writes
	// `inert="false"` there, which `closest('[inert]')` would wrongly match.
	const insideInert = (node: Element) => {
		for (let current: Element | null = node; current; current = current.parentElement) {
			if ((current as HTMLElement).inert === true) return true;
		}
		return false;
	};
	let lastField: SearchCriteriaField | null = null;
	let wasTyping = false;
	$effect(() => {
		const field = search.expandedField;
		if (search.surface !== 'sheet') {
			lastField = null;
			wasTyping = false;
			return;
		}
		if (typing) {
			wasTyping = true;
			return;
		}
		const moved = wasTyping || (lastField !== null && field !== lastField);
		lastField = field;
		wasTyping = false;
		if (!moved || !field) return;
		const node = cards;
		const card = `[data-criteria-card="${field}"]`;
		void tick().then(() => {
			const focused = document.activeElement;
			// Lost: on the page, gone with its node, or left in a layer on its way out (the typing page, `inert`).
			const lost =
				!focused || focused === document.body || !focused.isConnected || insideInert(focused);
			if (!lost) return;
			node
				?.querySelector<HTMLElement>(
					`${card} [data-slot="search-field-launcher"], ${card} [data-slot="option-row"]`
				)
				?.focus({ preventScroll: true });
		});
	});
</script>

<!-- 🔴 Web < 744 (U-21 / U-23.2, the wave record §6.1): Airbnb's search window, grown out of the pill (the kit's
     zoom, 220 ms) over the page, blurred. Only «×» on top; three cards — the open one with its big title and its list
     scrolling INSIDE the card (fading at its lower edge), so the others always show; «Διαγραφή όλων» and the pill
     «Αναζήτηση» at the bottom. A card's field opens the typing page; a choice opens the next card. -->
<ModalScreenSurface
	open={search.surface === 'sheet'}
	{sourceLayout}
	tone="background"
	onDismiss={() => search.closeOrCollapse()}
	aria-label={m.search_title({}, options)}
	data-testid="search-criteria-sheet"
	class="bg-background/94 backdrop-blur-search"
>
	<div
		data-slot="criteria-sheet-top"
		inert={typing}
		class="flex flex-row justify-end px-4 pt-3.5 pb-2.5"
	>
		<IconButton
			icon="close"
			appearance="outline"
			elevated
			aria-label={m.search_close({}, options)}
			data-testid="search-criteria-close"
			onclick={() => search.close()}
		/>
	</div>
	<div
		bind:this={cards}
		data-slot="criteria-sheet-cards"
		inert={typing}
		class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pb-3"
	>
		{#each criteriaFields as field (field)}
			{@const expanded = search.expandedField === field}
			<div data-criteria-card={field} class="contents">
				<StepCard
					label={cardLabels[field]}
					title={cardTitles[field]}
					value={getFieldValueLabel(search.criteria, field, t)}
					placeholder={getFieldSummary(search.criteria, field, t)}
					{expanded}
					onExpand={() => search.updateExpandedField(field)}
					testId={`search-criteria-card-${field}`}
				>
					{#if field === 'availability'}
						<div class="-mx-4 min-h-0 overflow-y-auto edge-fade-bottom pb-4">
							<CriteriaList view={lists.when} idPrefix={`${uid}-${field}`} />
						</div>
					{:else}
						<SearchField
							variant="launcher"
							value={getFieldValueLabel(search.criteria, field, t) ?? ''}
							placeholder={fieldPlaceholders[field]}
							aria-label={fieldPlaceholders[field]}
							testId={`search-criteria-${field}-field`}
							onclick={() => search.openSearchPanel(field)}
							class="shrink-0"
						/>
						<div class="-mx-4 min-h-0 overflow-y-auto edge-fade-bottom pt-3 pb-4">
							<CriteriaList view={lists.viewOf(field)} idPrefix={`${uid}-${field}`} />
						</div>
					{/if}
				</StepCard>
			</div>
		{/each}
	</div>
	<div data-slot="criteria-sheet-footer" inert={typing}>
		<ActionBar
			secondaryLabel={m.criteria_clear_all({}, options)}
			onSecondaryClick={() => search.resetCriteria()}
			secondaryTestId="search-criteria-clear-all"
			primaryLabel={m.search_submit({}, options)}
			primaryIcon="search"
			primaryShape="pill"
			primaryLoading={search.isSubmitPending}
			primaryTestId="search-criteria-submit"
			onPrimaryClick={() => search.submitCriteria()}
		/>
	</div>
	<CriteriaTypingPage {search} {lists} {locale} />
</ModalScreenSurface>
