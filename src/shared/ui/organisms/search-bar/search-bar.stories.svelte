<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { foldSearchText } from '$shared/lib/text';
	import type { IoniconName } from '$shared/ui/icons/ionicon';
	import { OptionRow } from '$shared/ui/molecules/option-row';
	import { SearchTrigger } from '$shared/ui/molecules/search-trigger';
	import { SegmentedControl } from '$shared/ui/molecules/segmented-control';
	import { SuggestionGroupHeader } from '$shared/ui/molecules/suggestion-group-header';
	import {
		SearchBar,
		type SearchBarPanelContext,
		type SearchBarSegment
	} from '$shared/ui/organisms/search-bar';

	const noop = () => {};
	const specialties = [
		{
			id: 'story-what-cardiology',
			label: 'Καρδιολόγος',
			supporting: 'Ειδικότητα',
			icon: 'medkit-outline'
		},
		{
			id: 'story-what-cardiac-surgery',
			label: 'Καρδιοχειρουργός',
			supporting: 'Ειδικότητα',
			icon: 'medkit-outline'
		},
		{
			id: 'story-what-doctor',
			label: 'Μαρία Παπαδοπούλου',
			supporting: 'Παθολόγος · Αθήνα',
			icon: 'person-outline'
		}
	] as const;
	const places = [
		{
			id: 'story-where-near',
			label: 'Κοντά μου',
			supporting: 'Με την τοποθεσία της συσκευής',
			icon: 'navigate-outline'
		},
		{
			id: 'story-where-attica',
			label: 'Αττική',
			supporting: 'Περιφέρεια',
			icon: 'location-outline'
		},
		{
			id: 'story-where-piraeus',
			label: 'Πειραιάς',
			supporting: 'Περιφερειακή ενότητα',
			icon: 'location-outline'
		}
	] as const;
	const matching = <T extends { label: string }>(items: readonly T[], query: string) =>
		items.filter((item) => foldSearchText(item.label).includes(foldSearchText(query)));
	const whenOptions = [
		{ label: 'Οποτεδήποτε', value: 'any' },
		{ label: 'Σήμερα', value: 'today' },
		{ label: 'Επόμενες 3 ημέρες', value: 'next-3' }
	];

	const { Story } = defineMeta({
		title: 'Organisms/SearchBar',
		component: SearchBar,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 640 } } }
	});
</script>

<script lang="ts">
	let active = $state<string | null>(null);
	let whatQuery = $state('');
	let what = $state<string | undefined>();
	let whereQuery = $state('');
	let where = $state<string | undefined>();
	let when = $state<string | undefined>('any');
	let opened = $state<string | null>('where');
	let openedWhat = $state<string | null>('what');
	let openedWhen = $state<string | null>('when');

	const whatOptions = $derived(matching(specialties, whatQuery));
	const whereOptions = $derived(matching(places, whereQuery));

	// Every story moves its own `active`; choosing moves on to the next step by itself (S-28.2).
	type Move = (next: string | null) => void;
	function chooseWhat(id: string, move: Move) {
		what = id;
		whatQuery = specialties.find((item) => item.id === id)?.label ?? '';
		move('where');
	}
	function chooseWhere(id: string, move: Move) {
		where = id;
		whereQuery = places.find((place) => place.id === id)?.label ?? '';
		move('when');
	}

	const segmentsOf = (move: Move): SearchBarSegment[] => [
		{
			id: 'what',
			label: 'Τι',
			placeholder: 'Ειδικότητα, γιατρός ή υπηρεσία',
			value: specialties.find((item) => item.id === what)?.label,
			search: {
				query: whatQuery,
				onQueryChange: (query) => (whatQuery = query),
				optionIds: whatOptions.map((item) => item.id),
				onCommit: (id) => chooseWhat(id, move),
				clearLabel: 'Καθαρισμός αναζήτησης'
			}
		},
		{
			id: 'where',
			label: 'Πού',
			placeholder: 'Περιοχή',
			value: places.find((place) => place.id === where)?.label,
			search: {
				query: whereQuery,
				onQueryChange: (query) => (whereQuery = query),
				optionIds: whereOptions.map((item) => item.id),
				onCommit: (id) => chooseWhere(id, move),
				clearLabel: 'Καθαρισμός αναζήτησης'
			}
		},
		{
			id: 'when',
			label: 'Πότε',
			placeholder: 'Οποτεδήποτε',
			value: whenOptions.find((option) => option.value === when)?.label
		}
	];
</script>

<!-- The panel of each segment (U-05.6): «Τι» and «Πού» are typed in the bar, their panels the field's listbox of
     suggestions (the typed part in bold); «Πότε» its choices. Choosing moves on by itself (Airbnb, S-28.2). -->
{#snippet suggestions(
	heading: string,
	items: readonly { id: string; label: string; supporting: string; icon: IoniconName }[],
	context: SearchBarPanelContext,
	query: string,
	selected: string | undefined,
	choose: (id: string) => void
)}
	<SuggestionGroupHeader label={heading} class="px-2 pb-1" />
	<!-- Only options inside the listbox (ARIA): the group's header stays above it and names it. -->
	<div id={context.listboxId} role="listbox" aria-label={heading} class="flex flex-col gap-1">
		{#each items as item (item.id)}
			<OptionRow
				accessibilityRole="option"
				id={item.id}
				label={item.label}
				supportingLabel={item.supporting}
				icon={item.icon}
				labelClass="font-medium"
				{query}
				active={context.activeId === item.id}
				isSelected={selected === item.id}
				onclick={() => choose(item.id)}
			/>
		{/each}
	</div>
{/snippet}

{#snippet panels(id: string, context: SearchBarPanelContext, move: Move)}
	{#if id === 'what'}
		{@render suggestions('Προτάσεις', whatOptions, context, whatQuery, what, (option) =>
			chooseWhat(option, move)
		)}
	{:else if id === 'where'}
		{@render suggestions(
			'Προτεινόμενες περιοχές',
			whereOptions,
			context,
			whereQuery,
			where,
			(option) => chooseWhere(option, move)
		)}
	{:else}
		<div class="px-2">
			<SegmentedControl segments={whenOptions} bind:value={when} aria-label="Πότε" />
		</div>
	{/if}
{/snippet}

{#snippet live(id: string, context: SearchBarPanelContext)}
	{@render panels(id, context, (next) => (active = next))}
{/snippet}
{#snippet openWhat(id: string, context: SearchBarPanelContext)}
	{@render panels(id, context, (next) => (openedWhat = next))}
{/snippet}
{#snippet openWhere(id: string, context: SearchBarPanelContext)}
	{@render panels(id, context, (next) => (opened = next))}
{/snippet}
{#snippet openWhen(id: string, context: SearchBarPanelContext)}
	{@render panels(id, context, (next) => (openedWhen = next))}
{/snippet}

<Story name="Closed" globals={{ viewport: { value: 'z744', isRotated: false } }}>
	{#snippet template()}
		<div class="container-page py-section">
			<SearchBar
				segments={segmentsOf((next) => (active = next))}
				bind:active
				submitLabel="Αναζήτηση"
				onSubmit={noop}
				panelTitle="Αναζήτηση"
				closeLabel="Κλείσιμο"
				panel={live}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Where Open" globals={{ viewport: { value: 'z1128', isRotated: false } }}>
	{#snippet template()}
		<div class="container-page py-section">
			<SearchBar
				segments={segmentsOf((next) => (opened = next))}
				bind:active={opened}
				submitLabel="Αναζήτηση"
				onSubmit={noop}
				panelTitle="Πού"
				closeLabel="Κλείσιμο"
				panel={openWhere}
				panelClass="tablet:w-text"
			/>
		</div>
	{/snippet}
</Story>

<!-- U-05.6: «Τι» typed in the bar — the field in the island, its listbox of suggestions under the bar. -->
<Story name="What Typed" globals={{ viewport: { value: 'z1128', isRotated: false } }}>
	{#snippet template()}
		<div class="container-page py-section">
			<SearchBar
				segments={segmentsOf((next) => (openedWhat = next))}
				bind:active={openedWhat}
				submitLabel="Αναζήτηση"
				onSubmit={noop}
				panelTitle="Τι"
				closeLabel="Κλείσιμο"
				panel={openWhat}
				panelClass="tablet:w-text"
			/>
		</div>
	{/snippet}
</Story>

<Story name="When Open" globals={{ viewport: { value: 'z1920', isRotated: false } }}>
	{#snippet template()}
		<div class="container-page py-section">
			<SearchBar
				segments={segmentsOf((next) => (openedWhen = next))}
				bind:active={openedWhen}
				submitLabel="Αναζήτηση"
				onSubmit={noop}
				panelTitle="Πότε"
				closeLabel="Κλείσιμο"
				panel={openWhen}
			/>
		</div>
	{/snippet}
</Story>

<!-- The web pair: below 744 the pill, from 744 the bar; at z375 only the pill shows. -->
<Story name="Pill Below Tablet" globals={{ viewport: { value: 'z375', isRotated: false } }}>
	{#snippet template()}
		<div class="container-page flex flex-col gap-section py-section">
			<SearchTrigger placeholder="Αναζήτηση γιατρού ή ειδικότητας" onclick={noop} />
			<SearchBar
				segments={segmentsOf((next) => (active = next))}
				bind:active
				submitLabel="Αναζήτηση"
				onSubmit={noop}
				panelTitle="Αναζήτηση"
				closeLabel="Κλείσιμο"
				panel={live}
			/>
		</div>
	{/snippet}
</Story>
