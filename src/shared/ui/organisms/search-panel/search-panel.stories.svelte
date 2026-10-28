<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { OptionRow } from '$shared/ui/molecules/option-row';
	import { SuggestionGroupHeader } from '$shared/ui/molecules/suggestion-group-header';
	import { SearchPanel } from '$shared/ui/organisms/search-panel';
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$shared/ui/primitives/accordion';

	const noop = () => {};
	const places = [
		{
			id: 'near',
			label: 'Κοντά μου',
			supporting: 'Με την τοποθεσία της συσκευής',
			icon: 'navigate-outline'
		},
		{ id: 'attica', label: 'Αττική', supporting: 'Περιφέρεια', icon: 'location-outline' },
		{
			id: 'piraeus',
			label: 'Πειραιάς',
			supporting: 'Περιφερειακή ενότητα',
			icon: 'location-outline'
		}
	] as const;
	const steps = [
		{ value: 'what', label: 'Τι', summary: 'Καρδιολόγος' },
		{ value: 'where', label: 'Πού', summary: 'Αττική' },
		{ value: 'when', label: 'Πότε', summary: 'Οποτεδήποτε' }
	];

	const { Story } = defineMeta({
		title: 'Organisms/SearchPanel',
		component: SearchPanel,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 760 } } }
	});
</script>

<script lang="ts">
	let dropdown = $state(true);
	let screen = $state(true);
	let step = $state<string | string[] | undefined>('where');
	let chosen = $state('attica');
</script>

{#snippet suggestions()}
	<div class="flex flex-col gap-1">
		<SuggestionGroupHeader label="Προτεινόμενες περιοχές" class="px-2 pb-1" />
		{#each places as place (place.id)}
			<OptionRow
				label={place.label}
				supportingLabel={place.supporting}
				icon={place.icon}
				labelClass="font-medium"
				isSelected={chosen === place.id}
				onclick={() => (chosen = place.id)}
			/>
		{/each}
	</div>
{/snippet}

<!-- From 744: the card under the bar, not modal (open at z744 … z1920). -->
<Story name="Dropdown Under Bar" globals={{ viewport: { value: 'z1128', isRotated: false } }}>
	{#snippet template()}
		<div class="container-page py-section">
			<div class="relative mx-auto w-full max-w-content">
				<div class="min-h-search-pill rounded-full border border-border bg-muted"></div>
				<SearchPanel bind:open={dropdown} title="Πού" closeLabel="Κλείσιμο" class="tablet:w-text">
					{@render suggestions()}
				</SearchPanel>
			</div>
		</div>
	{/snippet}
</Story>

<!-- Below 744: the whole screen — the header with «×», the steps as cards, the pinned footer (Airbnb's phone). -->
<Story name="Full Screen On Phone" globals={{ viewport: { value: 'z375', isRotated: false } }}>
	{#snippet template()}
		<div class="relative">
			<SearchPanel bind:open={screen} title="Αναζήτηση" closeLabel="Κλείσιμο" onClose={noop}>
				<Accordion type="single" collapsible bind:value={step} class="flex flex-col gap-3">
					{#each steps as item (item.value)}
						<AccordionItem value={item.value} variant="card">
							<AccordionTrigger>
								<span class="flex min-w-0 flex-1 flex-row items-center justify-between gap-3">
									<span class="text-body-md font-semibold text-muted-foreground">{item.label}</span>
									<span
										class="line-clamp-1 min-w-0 flex-1 text-right text-body-md font-semibold text-foreground"
										>{item.summary}</span
									>
								</span>
							</AccordionTrigger>
							<AccordionContent>
								{@render suggestions()}
							</AccordionContent>
						</AccordionItem>
					{/each}
				</Accordion>
				{#snippet footer()}
					<ActionBar
						primaryLabel="Αναζήτηση"
						primaryIcon="search"
						secondaryLabel="Εκκαθάριση όλων"
						onPrimaryClick={noop}
						onSecondaryClick={noop}
					/>
				{/snippet}
			</SearchPanel>
		</div>
	{/snippet}
</Story>
