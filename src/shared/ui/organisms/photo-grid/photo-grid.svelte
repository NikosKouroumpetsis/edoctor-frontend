<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import type { PhotoCarouselSlide } from '$shared/ui/organisms/photo-carousel';

	/** One photo: its address and, from the caller, what it shows («Φωτογραφία 2 από 5»). */
	export type PhotoGridPhoto = PhotoCarouselSlide;

	/** The «show all photos» button: the caller's words and its action (a press or a page). */
	export type PhotoGridShowAll =
		| { label: string; onclick: () => void; href?: undefined }
		| { label: string; href: string; onclick?: undefined };

	/**
	 * A press on a photo opens it (Airbnb's tour), as a pointer-only twin: out of the Tab order and hidden from
	 * assistive tech — so `onOpen` comes only with `showAll`, the keyboard's way in (WCAG 2.1.1).
	 */
	type PhotoGridOpen =
		| { onOpen: (index: number) => void; showAll: PhotoGridShowAll }
		| { onOpen?: undefined; showAll?: PhotoGridShowAll };

	export type PhotoGridProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> &
		PhotoGridOpen & {
			photos: PhotoGridPhoto[];
			/** The large photo's loading; the four small ones are always `lazy`. */
			loading?: 'lazy' | 'eager';
			/** `<id>` the grid, `<id>-photo-<n>`, `<id>-placeholder-<n>`, `<id>-show-all`. */
			testId?: string;
		};

	/** One large photo and a 2 × 2 block: Airbnb's listing (`10-analysis.md` §2.2, «Grid φωτογραφιών 1+4»). */
	export const PHOTO_GRID_SLOTS = 5;
</script>

<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import { MediaPlaceholder } from '$shared/ui/primitives/media-placeholder';

	let {
		photos,
		showAll,
		onOpen,
		loading = 'eager',
		testId,
		class: className,
		...restProps
	}: PhotoGridProps = $props();

	// The addresses that did not load, for as long as the grid lives (the application's `useFailedImages`).
	const failed = new SvelteSet<string>();
	const slots = $derived(
		Array.from(
			{ length: PHOTO_GRID_SLOTS },
			(_, index): PhotoGridPhoto | undefined => photos[index]
		)
	);
	// 🔴 S-32.8 / S-32.13: no photo at all, or none that loads, reads as no photo — ONE silhouette, no button.
	const anyPhoto = $derived(slots.some((photo) => photo !== undefined && !failed.has(photo.uri)));
	const testIdOf = (part: string) => (testId ? `${testId}-${part}` : undefined);
</script>

{#snippet picture(photo: PhotoGridPhoto, index: number)}
	<img
		data-testid={testIdOf(`photo-${index}`)}
		src={photo.uri}
		alt={onOpen ? '' : (photo.ariaLabel ?? '')}
		loading={index === 0 ? loading : 'lazy'}
		decoding="async"
		draggable="false"
		onerror={() => failed.add(photo.uri)}
		class="block size-full bg-muted object-cover"
	/>
{/snippet}

{#if anyPhoto}
	<!-- From 744 (below it the hero carousel of the application): the outer corners only, the photos 8 apart. -->
	<div
		data-slot="photo-grid"
		data-state="photos"
		data-testid={testId}
		class={cn('relative hidden tablet:block', className)}
		{...restProps}
	>
		<div
			data-slot="photo-grid-frame"
			class="grid aspect-2/1 grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl"
		>
			{#each slots as photo, index (index)}
				<div
					data-slot="photo-grid-cell"
					data-index={index}
					class={cn(
						'relative min-h-0 min-w-0 overflow-hidden',
						index === 0 && 'col-span-2 row-span-2'
					)}
				>
					{#if photo === undefined || failed.has(photo.uri)}
						<MediaPlaceholder data-testid={testIdOf(`placeholder-${index}`)} class="size-full" />
					{:else if onOpen}
						<button
							type="button"
							tabindex="-1"
							aria-hidden="true"
							data-slot="photo-grid-open"
							onclick={() => onOpen(index)}
							class="block size-full transition-[filter] hover:brightness-90"
						>
							{@render picture(photo, index)}
						</button>
					{:else}
						{@render picture(photo, index)}
					{/if}
				</div>
			{/each}
		</div>

		{#if showAll}
			<Button
				label={showAll.label}
				tone="outline"
				radius="sm"
				href={showAll.href}
				onclick={showAll.onclick}
				data-testid={testIdOf('show-all')}
				class="absolute right-6 bottom-6 bg-card"
			>
				{#snippet leading()}
					<Ionicon name="apps-outline" class="icon-sm text-foreground" />
				{/snippet}
			</Button>
		{/if}
	</div>
{:else}
	<div
		data-slot="photo-grid"
		data-state="no-photo"
		data-testid={testId}
		class={cn('hidden tablet:block', className)}
		{...restProps}
	>
		<MediaPlaceholder class="aspect-2/1 rounded-xl" />
	</div>
{/if}
