<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { FullscreenModalTemplate } from '$shared/ui/templates/fullscreen-modal';

	const { Story } = defineMeta({
		title: 'Showcases/Filters dialog',
		component: FullscreenModalTemplate,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 900 } } }
	});
</script>

<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { CheckboxRow } from '$shared/ui/molecules/checkbox-row';
	import { ChipGroup } from '$shared/ui/molecules/chip-group';
	import { OptionRow } from '$shared/ui/molecules/option-row';
	import { RangeHistogram } from '$shared/ui/molecules/range-histogram';
	import { Section } from '$shared/ui/molecules/section';
	import { SegmentedControl } from '$shared/ui/molecules/segmented-control';
	import {
		SelectableCards,
		type SelectableCardsValue
	} from '$shared/ui/molecules/selectable-cards';
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$shared/ui/primitives/accordion';
	import { Chip } from '$shared/ui/primitives/chip';

	/**
	 * 🔴 U-05.1 (K4.7): no `FiltersDialog` unit — the filters are a composition the page owns: the full-screen modal
	 * (the Airbnb dialog 568 from 744), `Section variant="divided"` per group and `ActionBar preset="filters"`, with
	 * the units of dyad 4. The application's `search-filter-modal/page`, group for group.
	 */
	const noop = () => {};
	const payments = [
		{ value: 'card', label: 'Κάρτα', icon: 'card-outline', count: '18' },
		{ value: 'cash', label: 'Μετρητά', icon: 'cash-outline', count: '22' }
	] as const;
	const languages = [
		{ value: 'en', label: 'Αγγλικά', count: '42' },
		{ value: 'fr', label: 'Γαλλικά', count: '7' }
	];
	const services = [
		{ value: 'ecg', label: 'Ηλεκτροκαρδιογράφημα', count: '12' },
		{ value: 'echo', label: 'Υπερηχογράφημα καρδιάς', count: '8' }
	];
	const distribution = [0.2, 0.5, 1, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1, 0.1];
	const euros = (value: number, atCeiling: boolean) => `${value}${atCeiling ? '+' : ''} €`;

	let phone = $state(true);
	let tablet = $state(true);
	let sort = $state<SelectableCardsValue>('recommended');
	let gender = $state('any');
	let paid = $state<Record<string, boolean>>({ card: true, cash: false });
	let language = $state('en');
	let picked = $state<Record<string, boolean>>({ ecg: true, echo: false });
	let price = $state<[number, number]>([30, 120]);
	const selectedCount = $derived(
		Object.values(paid).filter(Boolean).length + Object.values(picked).filter(Boolean).length
	);
</script>

{#snippet sortIcon(name: 'sparkles-outline' | 'star-outline' | 'navigate-outline')}
	<Ionicon {name} class="icon-lg text-foreground" />
{/snippet}
{#snippet sparkles()}{@render sortIcon('sparkles-outline')}{/snippet}
{#snippet star()}{@render sortIcon('star-outline')}{/snippet}
{#snippet navigate()}{@render sortIcon('navigate-outline')}{/snippet}

{#snippet groups()}
	<Section variant="divided" title="Επιλεγμένα" showRule={false}>
		<ChipGroup>
			<Chip label="Κάρτα" removable variant="tinted" onRemove={() => (paid.card = false)} />
			<Chip
				label="Ηλεκτροκαρδιογράφημα"
				removable
				variant="tinted"
				onRemove={() => (picked.ecg = false)}
			/>
		</ChipGroup>
	</Section>
	<Section variant="divided" title="Ταξινόμηση">
		<SelectableCards
			iconPlacement="leading"
			bind:value={sort}
			options={[
				{
					value: 'recommended',
					title: 'Προτεινόμενα',
					description: 'Η δική μας σειρά.',
					icon: sparkles
				},
				{ value: 'rating', title: 'Αξιολόγηση', icon: star },
				{ value: 'distance', title: 'Απόσταση', icon: navigate }
			]}
		/>
	</Section>
	<Section variant="divided" title="Φύλο">
		<SegmentedControl
			segments={[
				{ label: 'Όλοι', value: 'any' },
				{ label: 'Γυναίκα', value: 'female' },
				{ label: 'Άνδρας', value: 'male' }
			]}
			bind:value={gender}
			aria-label="Φύλο"
		/>
	</Section>
	<Section variant="divided" title="Τρόπος πληρωμής">
		<ChipGroup>
			{#each payments as option (option.value)}
				<Chip
					label={option.label}
					icon={option.icon}
					count={option.count}
					variant="tinted"
					selected={paid[option.value]}
					onclick={() => (paid[option.value] = !paid[option.value])}
				/>
			{/each}
		</ChipGroup>
	</Section>
	<Section variant="divided" title="Γλώσσα επικοινωνίας">
		<div class="flex flex-col gap-2">
			{#each languages as option (option.value)}
				<OptionRow
					accessibilityRole="radio"
					size="lg"
					bordered
					leading={null}
					labelClass="font-medium"
					label={option.label}
					count={option.count}
					isSelected={language === option.value}
					onclick={() => (language = option.value)}
				/>
			{/each}
		</div>
	</Section>
	<Section variant="divided">
		<Accordion type="single" collapsible>
			<AccordionItem value="services" class="border-b-0">
				<AccordionTrigger showChevron class="py-0">
					<span class="text-title-xs font-semibold text-foreground">Υπηρεσίες</span>
				</AccordionTrigger>
				<AccordionContent contentClass="gap-0.5 pt-2">
					{#each services as service (service.value)}
						<CheckboxRow
							label={service.label}
							count={service.count}
							bind:checked={picked[service.value]}
						/>
					{/each}
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	</Section>
	<Section variant="divided" title="Τιμή" subtitle="Η τιμή της πρώτης επίσκεψης">
		<RangeHistogram
			minLabel="Ελάχιστη"
			maxLabel="Μέγιστη"
			formatValue={euros}
			data={distribution}
			min={20}
			max={200}
			bind:value={price}
		/>
	</Section>
{/snippet}

{#snippet footer()}
	<ActionBar
		preset="filters"
		primaryLabel="Εμφάνιση 24 γιατρών"
		secondaryLabel="Εκκαθάριση όλων"
		secondaryDisabled={selectedCount === 0}
		contentWidthClass="tablet:max-w-form"
		onPrimaryClick={noop}
		onSecondaryClick={() => {
			paid = { card: false, cash: false };
			picked = { ecg: false, echo: false };
		}}
	/>
{/snippet}

<Story name="Filters On Phone" globals={{ viewport: { value: 'z375', isRotated: false } }}>
	{#snippet template()}
		<FullscreenModalTemplate
			bind:open={phone}
			title="Φίλτρα"
			closeLabel="Κλείσιμο"
			contentGap="loose"
			onClose={noop}
			{footer}
		>
			{@render groups()}
		</FullscreenModalTemplate>
	{/snippet}
</Story>

<Story
	name="Filters Dialog From Tablet"
	globals={{ viewport: { value: 'z744', isRotated: false } }}
>
	{#snippet template()}
		<FullscreenModalTemplate
			bind:open={tablet}
			title="Φίλτρα"
			closeLabel="Κλείσιμο"
			contentGap="loose"
			onClose={noop}
			{footer}
		>
			{@render groups()}
		</FullscreenModalTemplate>
	{/snippet}
</Story>
