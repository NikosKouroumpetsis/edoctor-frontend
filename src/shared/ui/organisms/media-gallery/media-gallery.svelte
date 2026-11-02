<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** How many thumbnails the column shows from 744; the last one is «+N» when there are more photos (U-41.1). */
	export const MEDIA_GALLERY_PREVIEWS = 5;

	/** The default «3 / 25»: digits and a slash, no word of the kit's own. */
	function defaultCounterLabel(position: number, total: number): string {
		return `${position} / ${total}`;
	}

	/**
	 * The application's `MediaGalleryProps` (same names, U-41.1), with the web's two addresses: a photo's press and
	 * «+N» are links (`photoHref`, `moreHref`), so they work before JavaScript and open in a new tab.
	 */
	export type MediaGalleryProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The photos' addresses, in order; the first is the cover. */
		images: readonly string[];
		/** The name of a photo and of its thumbnail («Φωτογραφία 3 από 25»), the caller's words. */
		photoLabel: (index: number, total: number) => string;
		/** The «1 / N» pill (digits by default); shown with more than one photo. */
		counterLabel?: (position: number, total: number) => string;
		/** The name of the «+N» thumbnail (every photo). */
		moreLabel: string;
		/** A press of a photo, by its place (the page may open it in place: `event.preventDefault()`). */
		onOpenPhoto?: (index: number, event: MouseEvent) => void;
		/** A press of «+N». */
		onOpenAll?: (event: MouseEvent) => void;
		/** Web: a photo's address (its viewer); without it a photo is a button. */
		photoHref?: (index: number) => string;
		/** Web: the address of every photo; without it «+N» is a button. */
		moreHref?: string;
		/** While the page's data comes: the kit's breathing skeleton, square as the photo (U-14.5). */
		loading?: boolean;
		/** `<id>`, `-main`, `-track`, `-slide-<i>`, `-thumbs`, `-thumb-<i>`, `-more`, `-counter`, `-placeholder`, `-skeleton`. */
		testId?: string;
	};
</script>

<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { cn } from '$shared/lib/utils';
	import { RevealingPhoto } from '$shared/ui/molecules/revealing-photo';
	import { MediaPlaceholder } from '$shared/ui/primitives/media-placeholder';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let {
		images,
		photoLabel,
		counterLabel = defaultCounterLabel,
		moreLabel,
		onOpenPhoto,
		onOpenAll,
		photoHref,
		moreHref,
		loading = false,
		testId,
		class: className,
		...restProps
	}: MediaGalleryProps = $props();

	const failed = new SvelteSet<string>();

	let track = $state<HTMLElement | null>(null);
	let active = $state(0);

	const total = $derived(images.length);
	const current = $derived(Math.min(active, Math.max(total - 1, 0)));
	// 🔴 S-32.13: a cover that does not load reads as no photo — one silhouette, no counter, no thumbnails.
	const noPhoto = $derived(total === 0 || failed.has(images[0]));
	const shown = $derived(Math.min(total, MEDIA_GALLERY_PREVIEWS));
	const testIdOf = (part: string) => (testId ? `${testId}-${part}` : undefined);

	/** The photo in view, from the track's scroll (one photo a page, snapped). */
	function measure() {
		if (!track || track.clientWidth <= 0) return;
		active = Math.min(
			Math.max(Math.round(track.scrollLeft / track.clientWidth), 0),
			Math.max(total - 1, 0)
		);
	}

	/** A thumbnail shows its photo in the square (the browser smooths it, `scroll-smooth`, U-12.1). */
	function showPhoto(index: number) {
		active = index;
		if (track) track.scrollTo?.({ left: index * track.clientWidth });
	}

	const thumbClasses =
		'relative block size-gallery-thumb min-h-touch min-w-touch overflow-hidden rounded-sm bg-foreground/5 outline-none transition-colors duration-standard ease-standard focus-visible:ring-3 focus-visible:ring-ring/50';
	const slideClasses =
		'relative block size-full min-h-touch min-w-touch shrink-0 snap-start snap-always outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset';
</script>

{#snippet photo(url: string, alt: string, eager: boolean)}
	<RevealingPhoto {url} {alt} fit="contain" {eager} onError={(broken) => failed.add(broken)} />
{/snippet}

{#snippet more(url: string, index: number)}
	{#if failed.has(url)}
		<MediaPlaceholder class="h-full" />
	{:else}
		{@render photo(url, '', false)}
	{/if}
	<span
		aria-hidden="true"
		class="absolute inset-0 flex items-center justify-center bg-secondary/55 text-body-lg font-semibold text-secondary-foreground"
		>+{total - index}</span
	>
{/snippet}

<!-- 🔴 U-41.1 (Skroutz, app = web): ONE square photo shown whole on the muted ground, that swipes with its «1 / N»
     pill; from 744 a column of up to five 56 thumbnails beside it (12 apart, the shown one ringed, the fifth «+N»), the
     square 26 % of the window held between 260 and 360 (`w-gallery-fluid`). No photo, or a cover that does not load:
     the silhouette alone (S-32.8, S-32.13). Each photo lights up in 0.8 s the first time (U-14). -->
<div
	data-slot="media-gallery"
	data-testid={testId}
	class={cn('flex flex-col tablet:flex-row tablet:items-start tablet:gap-4', className)}
	{...restProps}
>
	{#if !loading && !noPhoto && total > 1}
		<div
			data-slot="media-gallery-thumbs"
			data-testid={testIdOf('thumbs')}
			class="hidden shrink-0 flex-col gap-3 tablet:flex"
		>
			{#each images.slice(0, shown) as url, index (`${url}-${index}`)}
				{#if index === shown - 1 && total > shown}
					{#if moreHref}
						<a
							href={moreHref}
							aria-label={moreLabel}
							data-testid={testIdOf('more')}
							onclick={(event) => onOpenAll?.(event)}
							class={cn(thumbClasses, 'border border-border')}
						>
							{@render more(url, index)}
						</a>
					{:else}
						<button
							type="button"
							aria-label={moreLabel}
							data-testid={testIdOf('more')}
							onclick={(event) => onOpenAll?.(event)}
							class={cn(thumbClasses, 'border border-border')}
						>
							{@render more(url, index)}
						</button>
					{/if}
				{:else}
					<button
						type="button"
						aria-label={photoLabel(index, total)}
						aria-pressed={index === current}
						data-testid={testIdOf(`thumb-${index}`)}
						onclick={() => showPhoto(index)}
						class={cn(
							thumbClasses,
							index === current
								? 'border-2 border-foreground'
								: 'border border-border can-hover:hover:border-foreground'
						)}
					>
						{#if failed.has(url)}
							<MediaPlaceholder class="h-full" />
						{:else}
							{@render photo(url, '', false)}
						{/if}
					</button>
				{/if}
			{/each}
		</div>
	{/if}

	<div
		data-slot="media-gallery-main"
		data-testid={testIdOf('main')}
		class="relative aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-foreground/5 tablet:w-gallery-fluid"
	>
		{#if loading}
			<Skeleton data-testid={testIdOf('skeleton')} class="size-full rounded-none" />
		{:else if noPhoto}
			<MediaPlaceholder data-testid={testIdOf('placeholder')} class="h-full" />
		{:else}
			<div
				bind:this={track}
				data-slot="media-gallery-track"
				data-testid={testIdOf('track')}
				onscroll={measure}
				class="scrollbar-none flex size-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
			>
				{#each images as url, index (`${url}-${index}`)}
					{#if photoHref}
						<a
							href={photoHref(index)}
							data-testid={testIdOf(`slide-${index}`)}
							onclick={(event) => onOpenPhoto?.(index, event)}
							class={slideClasses}
						>
							{#if failed.has(url)}
								<MediaPlaceholder class="h-full" />
							{:else}
								{@render photo(url, photoLabel(index, total), index === 0)}
							{/if}
						</a>
					{:else}
						<button
							type="button"
							aria-label={photoLabel(index, total)}
							data-testid={testIdOf(`slide-${index}`)}
							onclick={(event) => onOpenPhoto?.(index, event)}
							class={slideClasses}
						>
							{#if failed.has(url)}
								<MediaPlaceholder class="h-full" />
							{:else}
								{@render photo(url, '', index === 0)}
							{/if}
						</button>
					{/if}
				{/each}
			</div>
			{#if total > 1}
				<span
					aria-hidden="true"
					data-slot="media-gallery-counter"
					data-testid={testIdOf('counter')}
					class="pointer-events-none absolute right-3 bottom-3 rounded-full bg-secondary/75 px-3 py-1.5 text-label-lg font-semibold text-secondary-foreground"
					>{counterLabel(current + 1, total)}</span
				>
			{/if}
		{/if}
	</div>
</div>
