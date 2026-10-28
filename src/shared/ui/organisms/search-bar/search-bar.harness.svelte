<script lang="ts">
	import { foldSearchText } from '$shared/lib/text';
	import { OptionRow } from '$shared/ui/molecules/option-row';
	import { SearchBar, type SearchBarPanelContext, type SearchBarSegment } from './index';

	let {
		active = $bindable(null),
		withPanel = true,
		onSubmit = () => {}
	}: { active?: string | null; withPanel?: boolean; onSubmit?: () => void } = $props();

	const specialties = [
		{ id: 'harness-what-cardiology', label: 'Καρδιολόγος' },
		{ id: 'harness-what-cardiac-surgery', label: 'Καρδιοχειρουργός' },
		{ id: 'harness-what-pathology', label: 'Παθολόγος' }
	];
	const places = [
		{ id: 'harness-where-attica', label: 'Αττική' },
		{ id: 'harness-where-piraeus', label: 'Πειραιάς' }
	];
	const matching = <T extends { label: string }>(items: T[], query: string) =>
		items.filter((item) => foldSearchText(item.label).includes(foldSearchText(query)));

	let whatQuery = $state('');
	let what = $state<string | undefined>('Καρδιολόγος');
	let whereQuery = $state('');
	let where = $state<string | undefined>();
	const whatOptions = $derived(matching(specialties, whatQuery));
	const whereOptions = $derived(matching(places, whereQuery));

	function chooseWhat(id: string) {
		what = specialties.find((item) => item.id === id)?.label;
		whatQuery = what ?? '';
	}
	// S-28.2 (Airbnb): choosing «Πού» moves on to «Πότε» by itself — the caller's step.
	function chooseWhere(id: string) {
		where = places.find((item) => item.id === id)?.label;
		whereQuery = where ?? '';
		active = 'when';
	}

	const segments: SearchBarSegment[] = $derived([
		{
			id: 'what',
			label: 'Τι',
			placeholder: 'Ειδικότητα ή γιατρός',
			value: what,
			search: {
				query: whatQuery,
				onQueryChange: (query) => (whatQuery = query),
				optionIds: whatOptions.map((item) => item.id),
				onCommit: chooseWhat,
				clearLabel: 'Καθαρισμός'
			}
		},
		{
			id: 'where',
			label: 'Πού',
			placeholder: 'Περιοχή',
			value: where,
			search: {
				query: whereQuery,
				onQueryChange: (query) => (whereQuery = query),
				optionIds: whereOptions.map((item) => item.id),
				onCommit: chooseWhere
			}
		},
		{ id: 'when', label: 'Πότε', placeholder: 'Οποτεδήποτε' }
	]);
</script>

{#snippet rows(
	items: { id: string; label: string }[],
	context: SearchBarPanelContext,
	choose: (id: string) => void,
	query: string
)}
	<div id={context.listboxId} role="listbox" aria-label="Προτάσεις">
		{#each items as item (item.id)}
			<OptionRow
				accessibilityRole="option"
				id={item.id}
				label={item.label}
				{query}
				active={context.activeId === item.id}
				isSelected={false}
				onclick={() => choose(item.id)}
			/>
		{/each}
	</div>
{/snippet}

{#snippet panel(id: string, context: SearchBarPanelContext)}
	{#if id === 'what'}
		{@render rows(whatOptions, context, chooseWhat, whatQuery)}
	{:else if id === 'where'}
		{@render rows(whereOptions, context, chooseWhere, whereQuery)}
	{:else}
		<p>Panel {id}</p>
		<button type="button" class="min-h-touch min-w-touch">Σήμερα</button>
	{/if}
{/snippet}

<SearchBar
	{segments}
	bind:active
	submitLabel="Αναζήτηση"
	{onSubmit}
	panelTitle="Αναζήτηση"
	closeLabel="Κλείσιμο"
	panel={withPanel ? panel : undefined}
	testId="search-bar"
/>
<button type="button" class="min-h-touch min-w-touch">Έξω</button>
