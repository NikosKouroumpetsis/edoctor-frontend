<script lang="ts">
	import { page } from '$app/state';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { m } from '$paraglide/messages.js';
	import type { CategoryId } from '$modules/search-doctors/types';
	import { discoveryData, resolveSectionDoctors } from '$modules/search-doctors/lib';
	import { DiscoveryState } from '../hooks';
	import SearchHeader from '../components/search-header.svelte';
	import CategoryRail from '../components/category-rail.svelte';
	import DoctorsSection from '../components/doctors-section.svelte';
	import DiscoverySkeletons from '../components/discovery-skeletons.svelte';

	const discovery = new DiscoveryState();

	const messageOptions = $derived({ locale: getPageLocale(page.url) });

	// Static seed is ready synchronously; the skeleton path is wired for a future
	// async (TanStack Query) data source.
	const isLoading = false;

	const categoryLabels = $derived<Record<CategoryId, string>>({
		all: m.category_all({}, messageOptions),
		'internal-medicine': m.category_internal_medicine({}, messageOptions),
		pediatrics: m.category_pediatrics({}, messageOptions),
		cardiology: m.category_cardiology({}, messageOptions),
		dermatology: m.category_dermatology({}, messageOptions),
		online: m.category_online({}, messageOptions)
	});

	const categories = $derived(
		discoveryData.categories.map((category) => ({
			id: category.id,
			label: categoryLabels[category.id]
		}))
	);

	const sections = $derived(
		[
			{
				id: 'popular-athens' as const,
				title: m.section_popular_athens_title({}, messageOptions),
				subtitle: m.section_popular_athens_subtitle({}, messageOptions)
			},
			{
				id: 'online-this-week' as const,
				title: m.section_online_week_title({}, messageOptions),
				subtitle: m.section_online_week_subtitle({}, messageOptions)
			},
			{
				id: 'preventive-checkup' as const,
				title: m.section_preventive_title({}, messageOptions),
				subtitle: m.section_preventive_subtitle({}, messageOptions)
			}
		]
			.map((section) => ({
				...section,
				doctors: resolveSectionDoctors(section.id, discovery.activeCategory)
			}))
			.filter((section) => section.doctors.length > 0)
	);

	const hasResults = $derived(sections.length > 0);
</script>

<svelte:head>
	<title>{m.home_meta_title({}, messageOptions)}</title>
	<meta name="description" content={m.home_meta_description({}, messageOptions)} />
</svelte:head>

<main class="container-page">
	<div class="sticky top-16 z-30 bg-background pt-6 pb-4">
		<SearchHeader placeholder={m.search_discovery_placeholder({}, messageOptions)} />
	</div>

	{#if isLoading}
		<DiscoverySkeletons />
	{:else}
		<div class="flex flex-col gap-8 pb-12">
			<CategoryRail
				{categories}
				activeCategory={discovery.activeCategory}
				onSelect={discovery.selectCategory}
			/>

			{#if hasResults}
				{#each sections as section (section.id)}
					<DoctorsSection
						title={section.title}
						subtitle={section.subtitle}
						doctors={section.doctors}
						viewAllLabel={m.section_view_all({}, messageOptions)}
						favoriteLabel={m.favorite_toggle({}, messageOptions)}
						isFavorite={discovery.isFavorite}
						onToggleFavorite={discovery.toggleFavorite}
					/>
				{/each}
			{:else}
				<div class="rounded-panel border border-border/70 bg-card p-6 shadow-soft">
					<h2 class="text-heading-sm font-semibold text-foreground">
						{m.no_results_title({}, messageOptions)}
					</h2>
					<p class="mt-1 text-body-md text-muted-foreground">
						{m.no_results_body({}, messageOptions)}
					</p>
				</div>
			{/if}
		</div>
	{/if}
</main>
