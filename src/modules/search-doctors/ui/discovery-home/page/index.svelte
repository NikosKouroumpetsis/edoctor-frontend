<script lang="ts">
	import { page } from '$app/state';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { m } from '$paraglide/messages.js';
	import type { CategoryId, SectionId } from '$modules/search-doctors/types';
	import type { HomePageData } from '$modules/search-doctors/api/home';
	import { DiscoveryState, useHomeSections } from '../hooks';
	import SearchHeader from '../components/search-header.svelte';
	import CategoryRail from '../components/category-rail.svelte';
	import DoctorsSection from '../components/doctors-section.svelte';
	import SectionSkeleton from '../components/section-skeleton.svelte';

	let { data }: { data: HomePageData } = $props();

	const discovery = new DiscoveryState();

	const locale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale });

	// Category-scoped sections (client-side filtering through TanStack Query). The `all`
	// view is served by the streamed SSR `data.sections` instead, so this stays disabled
	// until a category is picked.
	const home = useHomeSections(
		() => discovery.activeCategory,
		() => getPageLocale(page.url)
	);

	const categoryLabels = $derived<Record<CategoryId, string>>({
		all: m.category_all({}, messageOptions),
		'internal-medicine': m.category_internal_medicine({}, messageOptions),
		pediatrics: m.category_pediatrics({}, messageOptions),
		cardiology: m.category_cardiology({}, messageOptions),
		dermatology: m.category_dermatology({}, messageOptions),
		online: m.category_online({}, messageOptions)
	});

	const categories = $derived(
		data.categories.map((category) => ({
			id: category.id,
			label: categoryLabels[category.id]
		}))
	);

	type SectionMeta = { title: string; subtitle: string };

	const sectionMeta = $derived<Record<SectionId, SectionMeta>>({
		'popular-athens': {
			title: m.section_popular_athens_title({}, messageOptions),
			subtitle: m.section_popular_athens_subtitle({}, messageOptions)
		},
		'online-this-week': {
			title: m.section_online_week_title({}, messageOptions),
			subtitle: m.section_online_week_subtitle({}, messageOptions)
		},
		'preventive-checkup': {
			title: m.section_preventive_title({}, messageOptions),
			subtitle: m.section_preventive_subtitle({}, messageOptions)
		}
	});

	const sectionSkeletonKeys = [0, 1, 2];
</script>

<svelte:head>
	<title>{m.home_meta_title({}, messageOptions)}</title>
	<meta name="description" content={m.home_meta_description({}, messageOptions)} />
</svelte:head>

<main class="container-page">
	<div class="sticky top-16 z-30 bg-background pt-6 pb-4">
		<SearchHeader placeholder={m.search_discovery_placeholder({}, messageOptions)} />
	</div>

	<div class="flex flex-col gap-8 pb-12">
		<CategoryRail
			{categories}
			activeCategory={discovery.activeCategory}
			onSelect={discovery.selectCategory}
		/>

		{#if discovery.activeCategory === 'all'}
			<!-- Streamed SSR sections: each reveals serially as the backend responds. -->
			{#each data.sections as section (section.id)}
				{@const meta = sectionMeta[section.id]}
				{#await section.result}
					<SectionSkeleton />
				{:then result}
					{#if result.status === 'ok' && result.doctors.length > 0}
						<DoctorsSection
							title={meta.title}
							subtitle={meta.subtitle}
							doctors={result.doctors}
							viewAllLabel={m.section_view_all({}, messageOptions)}
							favoriteLabel={m.favorite_toggle({}, messageOptions)}
							isFavorite={discovery.isFavorite}
							onToggleFavorite={discovery.toggleFavorite}
						/>
					{:else if result.status === 'error'}
						<div class="rounded-panel border border-border/70 bg-card p-6 shadow-soft">
							<h2 class="text-heading-sm font-semibold text-foreground">
								{m.section_error_title({}, messageOptions)}
							</h2>
							<p class="mt-1 text-body-md text-muted-foreground">
								{m.section_error_body({}, messageOptions)}
							</p>
						</div>
					{/if}
				{/await}
			{/each}
		{:else if home.isLoading}
			{#each sectionSkeletonKeys as key (key)}
				<SectionSkeleton />
			{/each}
		{:else if home.isError}
			<div class="rounded-panel border border-border/70 bg-card p-6 shadow-soft">
				<h2 class="text-heading-sm font-semibold text-foreground">
					{m.section_error_title({}, messageOptions)}
				</h2>
				<p class="mt-1 text-body-md text-muted-foreground">
					{m.section_error_body({}, messageOptions)}
				</p>
			</div>
		{:else if home.sections.length > 0}
			{#each home.sections as section (section.id)}
				{@const meta = sectionMeta[section.id]}
				<DoctorsSection
					title={meta.title}
					subtitle={meta.subtitle}
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
</main>
