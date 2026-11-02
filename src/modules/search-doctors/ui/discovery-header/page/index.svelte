<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { SearchTrigger } from '$shared/ui/molecules/search-trigger';
	import type { CategoryId } from '$modules/search-doctors/types';
	import CategoryRail from '../components/category-rail.svelte';
	import type { DiscoveryHeaderProps } from '../types';

	let {
		categories,
		selectedCategoryId,
		onSelectCategory,
		searchOpen,
		onOpenSearch,
		locale
	}: DiscoveryHeaderProps = $props();

	const messageOptions = $derived({ locale });

	const categoryLabels = $derived<Record<CategoryId, string>>({
		all: m.category_all({}, messageOptions),
		'internal-medicine': m.category_internal_medicine({}, messageOptions),
		pediatrics: m.category_pediatrics({}, messageOptions),
		cardiology: m.category_cardiology({}, messageOptions),
		dermatology: m.category_dermatology({}, messageOptions),
		online: m.category_online({}, messageOptions)
	});
	const railCategories = $derived(
		categories.map((category) => ({ id: category.id, label: categoryLabels[category.id] }))
	);

	// The phone's search and categories stay at the top (U-16.3); a shadow under them once the page scrolls.
	let scrolled = $state(false);
	$effect(() => {
		const update = () => (scrolled = window.scrollY > 0);
		update();
		window.addEventListener('scroll', update, { passive: true });
		return () => window.removeEventListener('scroll', update);
	});
</script>

<!-- U-32.6 (the application's `discovery-header`): the phone's search pill and the categories, at once and stuck to the
     top (no top bar, U-16.3); from 744 the categories alone, under the band of the big search. -->
<div
	data-slot="home-top"
	data-scrolled={scrolled}
	class="sticky top-0 z-30 -mx-gutter-sm border-b border-transparent bg-card px-gutter-sm pt-3.5 transition-[border-color,box-shadow] duration-standard ease-standard data-[scrolled=true]:border-border data-[scrolled=true]:shadow-raised tablet:static tablet:mx-0 tablet:border-b-0 tablet:px-0 tablet:pt-4.5 tablet:shadow-none"
>
	<SearchTrigger
		placeholder={m.search_placeholder({}, messageOptions)}
		aria-label={m.search_open({}, messageOptions)}
		aria-haspopup="dialog"
		aria-expanded={searchOpen}
		onclick={onOpenSearch}
		variant="pill"
		testId="home-search-trigger"
	/>
	<CategoryRail
		categories={railCategories}
		activeCategory={selectedCategoryId}
		onSelect={onSelectCategory}
	/>
</div>
