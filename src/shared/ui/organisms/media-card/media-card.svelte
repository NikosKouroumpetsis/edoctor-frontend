<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { MediaPlaceholderFill } from '$shared/ui/primitives/media-placeholder';

	/** `plain`: no frame (the doctor card); `framed`: a raised card with a 12 inset (the article card, M-31α). */
	export type MediaCardVariant = 'plain' | 'framed';
	/**
	 * A fixed ratio for the photo instead of the height of `imageClass`: Airbnb's 4:3 grid (an article) or its 1:1
	 * rail card (the home's doctor card, U-20) — a screen's choice.
	 */
	export type MediaCardAspect = '4/3' | '1/1';

	export const mediaCardVariants: Record<MediaCardVariant, string> = {
		plain: '',
		framed: 'rounded-xl bg-card p-3 shadow-raised'
	};
	const aspects: Record<MediaCardAspect, string> = {
		'4/3': 'aspect-4/3 h-auto',
		'1/1': 'aspect-square h-auto'
	};

	/**
	 * The addresses already shown in this session (U-14.6, the application's `loadedPhotos`): with `reveal` one of
	 * them shows at once on a later mount; every first showing fades in. Filled only in the browser (a `load` or an
	 * effect, neither of which runs on the server).
	 */
	const shownPhotos = new SvelteSet<string>();

	/** The whole card is one link (`href`, already resolved by the page) named by `linkLabel`, or no link at all. */
	type MediaCardLink =
		| { href: string; linkLabel: string }
		| { href?: undefined; linkLabel?: undefined };

	export type MediaCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> &
		MediaCardLink & {
			imageUrl?: string | null;
			/** The photo's text alternative; decorative (`''`) by default, as the card's link names its subject. */
			imageAlt?: string;
			/** The photo's height (a `media` name, `h-card-rail-media tablet:h-card-rail-media-lg`). */
			imageClass?: string;
			aspect?: MediaCardAspect;
			/** `lazy` except for the first row of a page (`eager`). */
			loading?: 'lazy' | 'eager';
			/**
			 * The photo lights up once it arrives (U-14.1, Airbnb's 0.8 s fade on its curve) over the muted frame; an
			 * address already shown in this session shows at once (U-14.6).
			 */
			reveal?: boolean;
			placeholderFill?: MediaPlaceholderFill;
			variant?: MediaCardVariant;
			/** Replaces the photo (a `PhotoCarousel`), inside the same frame and under the same slots. */
			media?: Snippet;
			/**
			 * What stands in for a missing or broken photo, inside the muted frame (the application's article card: a
			 * page glyph); the no-photo silhouette without it (S-32.8, S-32.13).
			 */
			photoFallback?: Snippet;
			/** Over the photo's top-left corner (`MediaBadge`). */
			badge?: Snippet;
			/** The photo's control (`FavoriteButton`): outside the card's link, over the photo. */
			action?: Snippet;
			/** Another layer over the photo (`MapThumbnail`), positioned by itself. */
			overlay?: Snippet;
			/** The words under the photo. */
			children?: Snippet;
		};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { MediaPlaceholder } from '$shared/ui/primitives/media-placeholder';

	let {
		href,
		linkLabel,
		imageUrl,
		imageAlt = '',
		imageClass,
		aspect,
		loading = 'lazy',
		reveal = false,
		placeholderFill = 'border',
		variant = 'plain',
		media,
		photoFallback,
		badge,
		action,
		overlay,
		children,
		class: className,
		...restProps
	}: MediaCardProps = $props();

	// 🔴 S-32.13: the photo that does not load draws the no-photo silhouette, as a card without one (S-32.8).
	let failedUrl = $state<string | null>(null);
	const showsPhoto = $derived(Boolean(imageUrl) && failedUrl !== imageUrl);
	const frame = $derived(cn('w-full rounded-xl', imageClass, aspect && aspects[aspect]));
	// `reveal`: the address that arrived, and whether it showed at once (shown before in this session).
	let arrived = $state<{ url: string; atOnce: boolean } | null>(null);
	let photo = $state<HTMLImageElement | null>(null);
	const lit = $derived(Boolean(imageUrl) && arrived?.url === imageUrl);

	function arrive(node: Element, atOnce: boolean) {
		const url = node.getAttribute('src') ?? '';
		if (url !== imageUrl || (arrived?.url === url && !atOnce)) return;
		// The fade needs a start: commit the photo at opacity 0 before `data-loaded` turns it 1.
		if (!atOnce) node.getBoundingClientRect();
		shownPhotos.add(url);
		arrived = { url, atOnce };
	}

	// A photo shown before shows at once; one the browser already holds (cache, or loaded before hydration) fades in
	// now, as its `load` may be gone; any other waits for its `load`.
	$effect(() => {
		const node = photo;
		if (!reveal || !node) return;
		const url = node.getAttribute('src') ?? '';
		untrack(() => {
			if (shownPhotos.has(url)) arrive(node, true);
			else if (node.complete && node.naturalWidth > 0) arrive(node, false);
		});
	});

	// With a link the layers over it let a press through to it, except their own controls (the heart, a gallery).
	const passThrough = $derived(
		href ? 'pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto' : ''
	);
</script>

<div
	data-slot="media-card"
	data-variant={variant}
	class={cn('relative flex flex-col gap-2.5', mediaCardVariants[variant], className)}
	{...restProps}
>
	{#if href}
		<!-- ONE link for the whole card (Airbnb's): it lies under the photo and the words, which let a press
		     through; the heart and a gallery sit over it, outside it. -->
		<a
			{href}
			aria-label={linkLabel}
			data-slot="media-card-link"
			class="absolute inset-0 min-h-touch w-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		></a>
	{/if}

	<div data-slot="media-card-media" class={cn('relative', passThrough)}>
		{#if media}
			{@render media()}
		{:else if showsPhoto && reveal}
			<div data-slot="media-card-frame" class={cn('relative overflow-hidden bg-muted', frame)}>
				<img
					bind:this={photo}
					src={imageUrl}
					alt={imageAlt}
					{loading}
					decoding="async"
					data-loaded={lit}
					onload={(event) => arrive(event.currentTarget, false)}
					onerror={() => (failedUrl = imageUrl ?? null)}
					data-slot="media-card-image"
					class={cn(
						'absolute inset-0 size-full object-cover opacity-0 data-[loaded=true]:opacity-100',
						!(lit && arrived?.atOnce) && 'transition-opacity duration-reveal ease-standard'
					)}
				/>
			</div>
		{:else if showsPhoto}
			<img
				src={imageUrl}
				alt={imageAlt}
				{loading}
				decoding="async"
				onerror={() => (failedUrl = imageUrl ?? null)}
				data-slot="media-card-image"
				class={cn('block bg-muted object-cover', frame)}
			/>
		{:else if photoFallback}
			<div
				data-slot="media-card-placeholder"
				class={cn('flex items-center justify-center bg-muted', frame)}
			>
				{@render photoFallback()}
			</div>
		{:else}
			<MediaPlaceholder fill={placeholderFill} class={frame} />
		{/if}
		{@render badge?.()}
		{@render action?.()}
		{@render overlay?.()}
	</div>

	{#if children}
		<div data-slot="media-card-content" class={cn('relative flex flex-col', passThrough)}>
			{@render children()}
		</div>
	{/if}
</div>
