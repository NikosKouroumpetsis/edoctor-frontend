<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { ChipGroup } from '$shared/ui/molecules/chip-group';
	import { CheckboxRow } from '$shared/ui/molecules/checkbox-row';
	import { RangeHistogram } from '$shared/ui/molecules/range-histogram';
	import { Section } from '$shared/ui/molecules/section';
	import { SegmentedControl } from '$shared/ui/molecules/segmented-control';
	import { SelectableCards } from '$shared/ui/molecules/selectable-cards';
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$shared/ui/primitives/accordion';
	import { Chip } from '$shared/ui/primitives/chip';
	import { FullscreenModalTemplate } from '$shared/ui/templates/fullscreen-modal';
	import LanguageRow from '../components/language-row.svelte';
	import {
		buildAmenityOptions,
		buildFilterCountButton,
		buildGenderSegments,
		buildLanguageOptions,
		buildPaymentOptions,
		buildServiceOptions,
		buildSortCards,
		formatPriceFilterValue
	} from '../lib/options';
	import type { SearchFiltersProps } from '../types';

	let { filters, locale, sourceLayout }: SearchFiltersProps = $props();

	const options = $derived({ locale });
	const draft = $derived(filters.draft);
	const facets = $derived(filters.facets);
	const sortCards = $derived(buildSortCards(locale, filters.hasGeoLocation));
	const genderSegments = $derived(buildGenderSegments(locale));
	const paymentOptions = $derived(buildPaymentOptions(facets, draft.paymentOptions, locale));
	const languageOptions = $derived(buildLanguageOptions(facets, draft.speakLanguageCode, locale));
	const serviceOptions = $derived(buildServiceOptions(facets, draft.serviceSlugs, locale));
	const amenityOptions = $derived(buildAmenityOptions(facets, draft, locale));
	const countButton = $derived(
		buildFilterCountButton(filters.total, filters.isCountLoading, locale, filters.totalIsLowerBound)
	);
	const priceRange = $derived(filters.pricingVisible ? filters.priceRange : null);
	// MINOR-3 (r1): «Ταξινόμηση» is the section's ONE heading; the cards' group is named by it.
	const sortTitleId = useId(undefined, 'search-filter-sort-title');
</script>

<!-- U-28.3: the smaller sort cards (`sm`) take the 20 glyph. -->
{#snippet sortGlyph(name: IoniconName)}
	<Ionicon {name} class="icon-md text-foreground" />
{/snippet}
{#snippet recommendedGlyph()}
	{@render sortGlyph('sparkles-outline')}
{/snippet}
{#snippet ratingGlyph()}
	{@render sortGlyph('star-outline')}
{/snippet}
{#snippet distanceGlyph()}
	{@render sortGlyph('navigate-outline')}
{/snippet}

<!-- U-24.3 (§7.5 of the wave record): the application's sections, order and words (`search-filter-modal`) in Airbnb's
     frame — a sheet from the bottom below 744, the centred 568 / 32 window from 744 — with a hairline between the
     sections and the application's footer: «Εκκαθάριση όλων» left, the dark pill «Εμφάνιση N γιατρών» right, ONE
     line at every width. No «Επιλεγμένα» chips (U-25.1: «Ταξινόμηση» is the first section). -->
<FullscreenModalTemplate
	bind:open={filters.open}
	title={m.filters_title({}, options)}
	closeLabel={m.filters_close({}, options)}
	closeTestId="search-filter-close"
	onClose={filters.close}
	shape="sheet"
	contentGap="loose"
	{sourceLayout}
	data-testid="search-filter-modal"
>
	<Section
		variant="divided"
		showRule={false}
		title={m.filters_sort_title({}, options)}
		titleId={sortTitleId}
	>
		<SelectableCards
			type="single"
			size="sm"
			iconPlacement="leading"
			labelledBy={sortTitleId}
			value={draft.sortBy}
			onChange={(next) => {
				if (typeof next === 'string') filters.setSort(next);
			}}
			options={sortCards.map((card) => ({
				value: card.value,
				title: card.title,
				description: card.description,
				icon:
					card.icon === 'sparkles-outline'
						? recommendedGlyph
						: card.icon === 'star-outline'
							? ratingGlyph
							: distanceGlyph
			}))}
			testId="search-filter-sort"
		/>
	</Section>

	<Section variant="divided" title={m.filters_gender_title({}, options)}>
		<SegmentedControl
			segments={genderSegments}
			value={draft.gender}
			onChange={filters.setGender}
			aria-label={m.filters_gender_title({}, options)}
			testId="search-filter-gender"
		/>
	</Section>

	<Section variant="divided" title={m.filters_payment_title({}, options)}>
		<ChipGroup class="flex flex-row flex-wrap gap-x-2.5">
			{#each paymentOptions as option (option.value)}
				<Chip
					variant="outline"
					label={option.label}
					icon={option.icon}
					count={option.count}
					selected={option.selected}
					onclick={() => filters.togglePayment(option.value)}
					data-testid={`search-filter-payment-${option.value}`}
				/>
			{/each}
		</ChipGroup>
	</Section>

	{#if languageOptions.length > 0}
		<Section variant="divided" title={m.filters_language_title({}, options)}>
			<div class="flex flex-col gap-2">
				{#each languageOptions as option (option.value)}
					<LanguageRow
						label={option.label}
						count={option.count}
						selected={option.selected}
						onPress={() => filters.toggleLanguage(option.value)}
						testId={`search-filter-language-${option.value}`}
					/>
				{/each}
			</div>
		</Section>
	{/if}

	{#if filters.servicesAvailable}
		<Section variant="divided">
			<Accordion type="single" collapsible>
				<AccordionItem value="services" class="border-b-0" data-testid="search-filter-services">
					<AccordionTrigger showChevron class="py-0">
						<span class="text-title-xs font-semibold text-foreground">
							{m.filters_services_title({}, options)}
						</span>
					</AccordionTrigger>
					<AccordionContent contentClass="gap-0.5 pt-2">
						{#if serviceOptions.length > 0}
							{#each serviceOptions as option (option.value)}
								<CheckboxRow
									label={option.label}
									count={option.count}
									checked={option.selected}
									onToggle={() => filters.toggleService(option.value)}
									testId={`search-filter-service-${option.value}`}
								/>
							{/each}
						{:else}
							<p class="text-body-sm text-muted-foreground">
								{m.filters_services_empty({}, options)}
							</p>
						{/if}
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</Section>
	{/if}

	{#if priceRange}
		<Section
			variant="divided"
			title={m.filters_price_title({}, options)}
			subtitle={m.filters_price_note({}, options)}
			data-testid="search-filter-price"
		>
			<!-- S-31.6: no distribution in the facets today ⇒ no bars and no empty room, the slider and the two fields. -->
			<RangeHistogram
				min={priceRange.min}
				max={priceRange.max}
				value={[draft.priceMin ?? priceRange.min, draft.priceMax ?? priceRange.max]}
				onChange={filters.setPriceRange}
				minLabel={m.filters_price_min({}, options)}
				maxLabel={m.filters_price_max({}, options)}
				formatValue={(value, atCeiling) => formatPriceFilterValue(value, atCeiling, locale)}
				aria-label={m.filters_price_title({}, options)}
			/>
		</Section>
	{/if}

	<Section
		variant="divided"
		title={m.filters_office_access_title({}, options)}
		data-testid="search-filter-office-access"
	>
		<ChipGroup class="flex flex-row flex-wrap gap-x-2.5">
			{#each amenityOptions as option (option.value)}
				<Chip
					variant="outline"
					label={option.label}
					icon={option.icon}
					count={option.count}
					selected={option.selected}
					onclick={() =>
						option.value === 'PARKING' ? filters.toggleParking() : filters.toggleDisabilityAccess()}
					data-testid={`search-filter-amenity-${option.value}`}
				/>
			{/each}
		</ChipGroup>
	</Section>

	{#snippet footer()}
		<ActionBar
			preset="filters"
			singleLine
			primaryShape="pill"
			primaryTone="contrast"
			primaryLabel={countButton.title}
			primaryDisabled={countButton.disabled}
			primaryLoading={countButton.loading}
			onPrimaryClick={filters.apply}
			primaryTestId="search-filter-apply"
			secondaryLabel={m.filters_clear_all({}, options)}
			secondaryDisabled={!filters.hasActiveFilters}
			onSecondaryClick={filters.clearAll}
			secondaryTestId="search-filter-clear"
		/>
	{/snippet}
</FullscreenModalTemplate>
