<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { MediaPlaceholderFill } from '$shared/ui/primitives/media-placeholder';

	/** `plain`: no frame (the doctor card); `framed`: a raised card with a 12 inset (the article card, M-31α). */
	export type MediaCardVariant = 'plain' | 'framed';
	/** A fixed ratio for the photo instead of the height of `imageClass` (Airbnb's 4:3 grid, a screen's choice). */
	export type MediaCardAspect = '4/3';

	export const mediaCardVariants: Record<MediaCardVariant, string> = {
		plain: '',
		framed: 'rounded-xl bg-card p-3 shadow-raised'
	};
	const aspects: Record<MediaCardAspect, string> = {
		'4/3': 'aspect-4/3 h-auto'
	};

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
			placeholderFill?: MediaPlaceholderFill;
			variant?: MediaCardVariant;
			/** Replaces the photo (a `PhotoCarousel`), inside the same frame and under the same slots. */
			media?: Snippet;
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
		placeholderFill = 'border',
		variant = 'plain',
		media,
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
