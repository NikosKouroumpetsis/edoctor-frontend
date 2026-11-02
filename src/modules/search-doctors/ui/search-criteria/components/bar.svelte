<script lang="ts">
	import { tick, untrack, type Snippet } from 'svelte';
	import { platform } from '$shared/design/tokens';
	import { dismissable, Presence } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import type { SearchDock } from '$shared/state/search-dock';
	import {
		SearchBar,
		type SearchBarPanelContext,
		type SearchBarSegment
	} from '$shared/ui/organisms/search-bar';

	let {
		dock,
		inline = true,
		slot = 'home-search',
		segments,
		active,
		onActiveChange,
		panel,
		submitLabel,
		panelTitle,
		closeLabel,
		onSubmit
	}: {
		/** The frame's side of the search (its pill and the drop), when the page sits in the frame. */
		dock: SearchDock | undefined;
		/**
		 * `true` (the home): the big bar has its place in the page and docks once that place goes under the top bar.
		 * `false` (the results, §7.2): no place in the page — the top bar's pill is always there and the bar exists
		 * only while dropped from it.
		 */
		inline?: boolean;
		/** The `data-slot` names (`<slot>`, `<slot>-bar`, `<slot>-scrim`) and the bar's test id (`<slot>-bar`). */
		slot?: string;
		segments: SearchBarSegment[];
		/** The open segment (the search's state), or none. */
		active: string | null;
		/** A segment opened, or the bar closed (`null`). */
		onActiveChange: (id: string | null) => void;
		/** The open segment's panel (the search's rows, U-23.2). */
		panel: Snippet<[string, SearchBarPanelContext]>;
		submitLabel: string;
		panelTitle: string;
		closeLabel: string;
		/** The search button. */
		onSubmit: () => void;
	} = $props();

	let slotNode = $state<HTMLElement | null>(null);
	let bar = $state<HTMLElement | null>(null);
	const dropped = $derived(dock?.dropped ?? false);
	// The page dims under the dropped bar (§6.4): it fades in and out, a leaving layer kept until its fade ends. A
	// press on it is a press outside the bar (`dismissable`), which lifts the bar.
	const scrim = new Presence(() => dropped, { duration: 'standard' });

	// The page's search is the frame's to dock while this page is on screen.
	$effect(() => {
		dock?.register(true);
		return () => dock?.register(false);
	});

	// Without a place in the page (the results) the search is docked from the start: the top bar shows its pill.
	$effect(() => {
		if (!inline && dock) dock.docked = true;
	});

	// It docks once its place has gone under the top bar (64): the bar then shows its small pill (U-16.7).
	$effect(() => {
		const node = slotNode;
		if (!inline || !node || !dock || typeof IntersectionObserver === 'undefined') return;
		const barTop = platform.spacing['bar-top'];
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry) dock.docked = !entry.isIntersecting && entry.boundingClientRect.top < barTop;
			},
			{ rootMargin: `-${barTop}px 0px 0px 0px` }
		);
		observer.observe(node);
		return () => observer.disconnect();
	});

	// Dropped from the pill, the bar opens on «Τι» (the prototype's `openSeg('what')`, U-23.2) and the keyboard's
	// focus goes into its field once it is drawn.
	$effect(() => {
		if (!dropped || !bar) return;
		const node = bar;
		if (untrack(() => active) === null) onActiveChange('what');
		void tick().then(() =>
			node.querySelector<HTMLElement>('[data-search-bar-control]')?.focus({ preventScroll: true })
		);
	});

	/** A press outside the bar or Escape: the open segment closes and a dropped bar goes back to its place. */
	function close(fromEscape: boolean) {
		if (active !== null) onActiveChange(null);
		dock?.lift({ restoreFocus: fromEscape });
	}
</script>

{#snippet searchBar()}
	<div
		bind:this={bar}
		data-slot={`${slot}-bar`}
		data-dropped={dropped}
		use:dismissable={{
			enabled: dropped || active !== null,
			onPointerDownOutside: () => close(false),
			onEscapeKeydown: () => close(true)
		}}
		class={cn(
			dropped &&
				'fixed inset-x-0 top-bar-top z-40 animate-search-drop border-b border-border bg-linear-to-b from-card to-background px-gutter-sm pt-4 pb-6 split:px-gutter-md desktop:px-gutter-lg'
		)}
	>
		<SearchBar
			{segments}
			bind:active={() => active, (id) => onActiveChange(id)}
			{submitLabel}
			{onSubmit}
			{panelTitle}
			{closeLabel}
			{panel}
			testId={`${slot}-bar`}
		/>
	</div>
{/snippet}

<!-- From 744 (U-16.7): the kit's big `SearchBar` under the top bar, on the white-to-grey band. Its place keeps its
     height while the bar is dropped from the top bar's pill: then it is fixed under the top bar, dropping in 0.25 s
     (the theme's `animate-search-drop` keyframe: the bar already exists, so `starting:` would never play)
     over the dimmed page (rgba(15,23,42,.25)); the page never scrolls to the top; a press outside or Escape lifts it.
     Without a place (`inline` off, the results): the bar exists only while dropped, from the same pill. -->
{#if inline}
	<section
		data-slot={slot}
		class="hidden border-b border-border bg-linear-to-b from-card to-background pt-6 pb-6 tablet:block"
	>
		<div class="container-page">
			<div
				bind:this={slotNode}
				data-slot={`${slot}-dock`}
				class="min-h-search-pill split:min-h-search-bar-h"
			>
				{@render searchBar()}
			</div>
		</div>
	</section>
{:else if dropped}
	<div data-slot={slot} class="hidden tablet:block">
		{@render searchBar()}
	</div>
{/if}

{#if scrim.present}
	<div
		use:scrim.track
		data-slot={`${slot}-scrim`}
		data-state={scrim.state}
		aria-hidden="true"
		class="fixed inset-0 z-30 hidden bg-secondary/25 transition-opacity duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 tablet:block starting:opacity-0"
	></div>
{/if}
