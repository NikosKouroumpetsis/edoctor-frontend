<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { isMoving, leaveTimeout } from '$shared/lib/headless';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { ErrorState } from '$shared/ui/molecules/error-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import {
		searchResultsHref,
		type SearchDoctorsCriteria
	} from '$modules/search-doctors/lib/search-criteria';
	import type { HomeRowResult, SectionId, StreamedHomeRow } from '$modules/search-doctors/types';
	import { useFavoriteToggle } from '$modules/search-doctors/ui/search-doctor-card';
	import type { HomeSectionsController } from '../hooks/use-sections.svelte';
	import type { DiscoveryState } from '../hooks/use-state.svelte';
	import type { StreamedSectionsController } from '../hooks/use-streamed-sections.svelte';
	import type { HomeMessageOptions } from '../types';
	import DoctorsSection from './doctors-section.svelte';
	import SectionSkeleton from './section-skeleton.svelte';

	let {
		discovery,
		home,
		streamed,
		sections,
		messageOptions,
		resultsPath,
		onSignIn
	}: {
		discovery: DiscoveryState;
		/** A category's rows (TanStack Query). */
		home: HomeSectionsController;
		/** The `all` view's rows (the streamed SSR sections, in TanStack Query, U-29.3). */
		streamed: StreamedSectionsController;
		/** The streamed sections of the page load, in the application's order. */
		sections: StreamedHomeRow[];
		messageOptions: HomeMessageOptions;
		/** The localized `/doctors`. */
		resultsPath: string;
		/** «Συνδεθείτε για κόστος»: the sign-in over the page. */
		onSignIn: () => void;
	} = $props();

	const favorites = useFavoriteToggle(() => messageOptions.locale);
	const sectionTitles = $derived<Record<SectionId, string>>({
		'popular-athens': m.section_popular_athens_title({}, messageOptions),
		'popular-psychologists': m.section_popular_psychologists_title({}, messageOptions),
		'internal-medicine-gp': m.section_internal_medicine_gp_title({}, messageOptions)
	});
	const scrollLabels = $derived({
		previous: m.rail_previous({}, messageOptions),
		next: m.rail_next({}, messageOptions)
	});
	const profileHref = (doctorSlug: string) => `${resultsPath}/${encodeURIComponent(doctorSlug)}`;
	const rowHref = (criteria: SearchDoctorsCriteria | null) =>
		criteria ? searchResultsHref(resultsPath, criteria) : resultsPath;

	/** «Δοκιμάστε ξανά» (U-20, app = web): only what failed is asked again — a streamed row, or a category's scope or rows. */
	function retry() {
		if (discovery.shownCategory === 'all') void streamed.retry();
		else void home.refetch();
	}

	const hasDoctors = (result: HomeRowResult | undefined) =>
		result?.status === 'ok' && result.doctors.length > 0;

	// The rows fade out before a category swaps them, then fade in (U-20, 0.25 s): the swap waits for their own
	// `transitionend`, the token's clock, or nothing moving (no CSS: at once).
	let rows = $state<HTMLElement | null>(null);
	$effect(() => {
		if (!discovery.leaving) return;
		const node = rows;
		let clock: ReturnType<typeof setTimeout> | undefined;
		let cancelled = false;
		void tick().then(() => {
			if (cancelled) return;
			if (!node || !isMoving(node)) discovery.swap();
			else clock = setTimeout(discovery.swap, leaveTimeout('standard'));
		});
		return () => {
			cancelled = true;
			clearTimeout(clock);
		};
	});
</script>

{#snippet emptyGlyph()}
	<StateGlyph name="search-outline" />
{/snippet}

{#snippet errorGlyph()}
	<!-- The application's (`discovery-rows`) and the prototype's: «no connection», a cloud struck through. -->
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

{#snippet emptyState()}
	{#if discovery.shownCategory === 'all'}
		<EmptyState
			variant="framed"
			titleAs="h2"
			title={m.home_empty_title({}, messageOptions)}
			description={m.home_empty_body({}, messageOptions)}
			actionLabel={m.home_empty_action({}, messageOptions)}
			actionHref={resultsPath}
			icon={emptyGlyph}
			testId="home-empty"
		/>
	{:else}
		<EmptyState
			variant="framed"
			titleAs="h2"
			title={m.home_empty_title({}, messageOptions)}
			description={m.home_empty_body({}, messageOptions)}
			actionLabel={m.home_empty_action({}, messageOptions)}
			onActionPress={() => discovery.selectCategory('all')}
			icon={emptyGlyph}
			testId="home-empty"
		/>
	{/if}
{/snippet}

{#snippet errorState()}
	<ErrorState
		variant="framed"
		titleAs="h2"
		title={m.home_error_title({}, messageOptions)}
		description={m.home_error_body({}, messageOptions)}
		actionLabel={m.home_error_retry({}, messageOptions)}
		onActionPress={retry}
		icon={errorGlyph}
		testId="home-error"
	/>
{/snippet}

{#snippet row(id: SectionId, doctors: HomeRowResult & { status: 'ok' })}
	<DoctorsSection
		title={sectionTitles[id]}
		viewAllLabel={m.section_view_all({}, messageOptions)}
		viewAllHref={rowHref(doctors.criteria)}
		{scrollLabels}
		doctors={doctors.doctors}
		{profileHref}
		profileLabel={m.card_profile_link({}, messageOptions)}
		favoriteLabel={m.favorite_toggle({}, messageOptions)}
		{favorites}
		feeRoomLabel={m.card_login_for_fee({}, messageOptions)}
		{onSignIn}
	/>
{/snippet}

<div
	bind:this={rows}
	data-slot="home-rows"
	data-leaving={discovery.leaving}
	ontransitionend={(event) => {
		if (event.target === event.currentTarget) discovery.swap();
	}}
	class="flex flex-col gap-6 transition-opacity duration-standard ease-standard data-[leaving=true]:opacity-0"
>
	<!-- The application's order (`discovery-rows`): waiting ⇒ failed ⇒ the rows ⇒ empty. A failed section is
	     the error with «Δοκιμάστε ξανά», never a row left out (app = web, U-20). -->
	{#if discovery.shownCategory === 'all'}
		{#if streamed.isError}
			{@render errorState()}
		{:else}
			<!-- Streamed SSR sections: each reveals as the backend responds; only rows with doctors show. -->
			{#each sections as section (section.id)}
				{@const result = streamed.results[section.id]}
				{#if result === undefined}
					<SectionSkeleton />
				{:else if result.status === 'ok' && result.doctors.length > 0}
					{@render row(section.id, result)}
				{/if}
			{/each}
			{#if !streamed.isWaiting && !sections.some( (section) => hasDoctors(streamed.results[section.id]) )}
				{@render emptyState()}
			{/if}
		{/if}
	{:else if home.isLoading && !(discovery.leaving && home.sections.length > 0)}
		<!-- D-103: the new category is asked at the press, while these rows fade out (the cards they show then are
		     the previous category's, kept by `keepPreviousData`); after the fade its rows, or this skeleton. -->
		{#each [0, 1, 2] as key (key)}
			<SectionSkeleton />
		{/each}
	{:else if home.isError}
		{@render errorState()}
	{:else if home.sections.length > 0}
		{#each home.sections as section (section.id)}
			{@render row(section.id, {
				status: 'ok',
				doctors: section.doctors,
				criteria: section.criteria
			})}
		{/each}
	{:else}
		{@render emptyState()}
	{/if}
</div>
