<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import type { MediaPlaceholderFill } from '$shared/ui/primitives/media-placeholder';
	import type { RailControlsFrom } from '$shared/ui/organisms/rail';

	/** One photo: its address and, from the caller, what it is called aloud («Φωτογραφία 2 από 5»). */
	export type PhotoCarouselSlide = { uri: string; ariaLabel?: string };

	/** The names of the two arrows, already localized; without them the gallery draws no arrows. */
	export type PhotoCarouselScrollLabels = { previous: string; next: string };

	export type PhotoCarouselProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		slides: PhotoCarouselSlide[];
		/** The height of every photo (a `media` name); the width is the gallery's. */
		imageClass?: string;
		/**
		 * How many photos on either side of the shown one mount their `<img>`; the others are an empty box of the same
		 * size, so the bytes download only as the reader comes near them.
		 */
		neighborWindow?: number;
		/** The first photo's loading; the others are always `lazy`. */
		loading?: 'lazy' | 'eager';
		scrollLabels?: PhotoCarouselScrollLabels;
		/** The zone from which the arrows show on hover or focus (Airbnb's pointer screens); touch swipes. */
		controlsFrom?: RailControlsFrom;
		/**
		 * Inside a card that is one link: every photo opens it too, as a pointer-only twin (out of the Tab order and
		 * hidden from assistive tech, which reach the card's own link).
		 */
		href?: string;
		/** A «2 / 5» counter instead of the dots, in the caller's words; shown only while there are photos (S-32.8). */
		counterLabel?: (position: number, total: number) => string;
		placeholderFill?: MediaPlaceholderFill;
	};
</script>

<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { keepArrowFocus } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { railControlsClasses } from '$shared/ui/organisms/rail';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { carouselArrowClasses } from '$shared/ui/primitives/carousel';
	import { MediaPlaceholder } from '$shared/ui/primitives/media-placeholder';

	let {
		slides,
		imageClass,
		neighborWindow = 1,
		loading = 'lazy',
		scrollLabels,
		controlsFrom = 'laptop',
		href,
		counterLabel,
		placeholderFill = 'border',
		class: className,
		...restProps
	}: PhotoCarouselProps = $props();

	let track = $state<HTMLElement | null>(null);
	let active = $state(0);
	// The addresses that did not load, for as long as the gallery lives (the application's `useFailedImages`).
	const failed = new SvelteSet<string>();

	const count = $derived(slides.length);
	// 🔴 S-32.13: a cover that does not load makes the whole gallery read as no photo — one silhouette, no dots, no
	// counter, no arrows, no paging — as a card without one (S-32.8).
	const coverFailed = $derived(count === 0 || failed.has(slides[0].uri));
	const paged = $derived(!coverFailed && count > 1);
	const shown = $derived(Math.min(active, Math.max(count - 1, 0)));
	let previousArrow = $state<HTMLElement | null>(null);
	let nextArrow = $state<HTMLElement | null>(null);

	// Before an arrow turns off at an end, the keyboard's focus on it moves to the other arrow (NIT-4, as `Rail`).
	$effect.pre(() => {
		keepArrowFocus(
			{ previous: previousArrow, next: nextArrow },
			{ previous: shown > 0, next: shown < count - 1 }
		);
	});

	/** The photo in view, from the track's scroll (one photo per page, snapped). */
	function measure() {
		if (!track || track.clientWidth <= 0) return;
		const next = Math.round(track.scrollLeft / track.clientWidth);
		active = Math.min(Math.max(next, 0), Math.max(count - 1, 0));
	}

	/** One photo back or on; the browser smooths it (`scroll-smooth`, whatever the motion setting, U-12.1). */
	function page(direction: 1 | -1) {
		if (!track) return;
		track.scrollBy?.({ left: direction * track.clientWidth });
	}

	const frame = $derived(cn('w-full rounded-xl', imageClass));
	// The `Carousel`'s arrows, at the same place (U-09.3): over the photo, 12 from its sides, centred on its height.
	const arrow = cn(
		'absolute top-1/2 size-touch -translate-y-1/2',
		carouselArrowClasses.box,
		carouselArrowClasses.reveal
	);
</script>

{#snippet photo(slide: PhotoCarouselSlide, index: number)}
	{#if Math.abs(index - shown) > neighborWindow}
		<div data-slot="photo-carousel-pending" class={cn('bg-muted', frame)}></div>
	{:else if failed.has(slide.uri)}
		<MediaPlaceholder fill={placeholderFill} class={frame} />
	{:else}
		<img
			src={slide.uri}
			alt={href ? '' : (slide.ariaLabel ?? '')}
			loading={index === 0 ? loading : 'lazy'}
			decoding="async"
			draggable="false"
			onerror={() => failed.add(slide.uri)}
			class={cn('block bg-muted object-cover', frame)}
		/>
	{/if}
{/snippet}

{#if coverFailed}
	<div
		data-slot="photo-carousel"
		data-state="no-photo"
		class={cn('relative', className)}
		{...restProps}
	>
		<MediaPlaceholder fill={placeholderFill} class={frame} />
	</div>
{:else}
	<div
		data-slot="photo-carousel"
		data-state="photos"
		class={cn('group/carousel relative', className)}
		{...restProps}
	>
		<div
			bind:this={track}
			data-slot="photo-carousel-track"
			onscroll={measure}
			class="pointer-events-auto scrollbar-none flex snap-x snap-mandatory flex-row overflow-x-auto overscroll-x-contain scroll-smooth rounded-xl"
		>
			{#each slides as slide, index (`${slide.uri}-${index}`)}
				<div
					data-slot="photo-carousel-slide"
					data-index={index}
					class="w-full shrink-0 snap-start snap-always"
				>
					{#if href}
						<a
							{href}
							tabindex="-1"
							aria-hidden="true"
							data-slot="photo-carousel-link"
							class="block min-h-touch w-full"
						>
							{@render photo(slide, index)}
						</a>
					{:else}
						{@render photo(slide, index)}
					{/if}
				</div>
			{/each}
		</div>

		{#if paged && counterLabel}
			<span
				data-slot="photo-carousel-counter"
				aria-hidden="true"
				class="pointer-events-none absolute right-4 bottom-3 rounded-full bg-secondary/75 px-3 py-1.5 text-body-sm font-semibold text-secondary-foreground"
				>{counterLabel(shown + 1, count)}</span
			>
		{:else if paged}
			<!-- The dots say where the reader is; the photos' own names say it aloud. -->
			<span
				data-slot="photo-carousel-dots"
				aria-hidden="true"
				class="pointer-events-none absolute inset-x-0 bottom-3 flex flex-row items-center justify-center gap-1.5"
			>
				{#each slides as slide, index (`${slide.uri}-${index}`)}
					<span
						data-slot="photo-carousel-dot"
						data-active={index === shown ? 'true' : 'false'}
						class={cn('size-1.5 rounded-full', index === shown ? 'bg-card' : 'bg-card/50')}
					></span>
				{/each}
			</span>
		{/if}

		{#if paged && scrollLabels}
			<button
				type="button"
				aria-label={scrollLabels.previous}
				bind:this={previousArrow}
				disabled={shown === 0}
				onclick={() => page(-1)}
				class={cn(arrow, railControlsClasses[controlsFrom], 'left-1')}
				data-slot="photo-carousel-previous"
			>
				<span class={carouselArrowClasses.shape}>
					<Ionicon name="chevron-back" class={carouselArrowClasses.glyph} />
				</span>
			</button>
			<button
				type="button"
				aria-label={scrollLabels.next}
				bind:this={nextArrow}
				disabled={shown >= count - 1}
				onclick={() => page(1)}
				class={cn(arrow, railControlsClasses[controlsFrom], 'right-1')}
				data-slot="photo-carousel-next"
			>
				<span class={carouselArrowClasses.shape}>
					<Ionicon name="chevron-forward" class={carouselArrowClasses.glyph} />
				</span>
			</button>
		{/if}
	</div>
{/if}
