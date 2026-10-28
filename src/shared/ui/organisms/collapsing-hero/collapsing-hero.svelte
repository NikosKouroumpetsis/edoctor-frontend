<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import { SvelteSet } from 'svelte/reactivity';

	/** The photo's height, a `media` name: `hero-h` 360 · `hero-h-lg` 468 (the application's two). */
	export type CollapsingHeroHeight = 'hero-h' | 'hero-h-lg';
	/** The zone from which the hero hides (the web's `PhotoGrid` takes over from 744), or `none` to keep it. */
	export type CollapsingHeroHideFrom = 'tablet' | 'none';

	const heightClasses: Record<CollapsingHeroHeight, string> = {
		'hero-h': 'h-hero-h',
		'hero-h-lg': 'h-hero-h-lg'
	};
	// The pill sits 8 above the overlap over `hero-h`, 4 over `hero-h-lg`: by the height alone, never the zone
	// (the application's NIT-2 of dyad 5).
	const countOffsetClasses: Record<CollapsingHeroHeight, string> = {
		'hero-h': 'mb-2',
		'hero-h-lg': 'mb-1'
	};
	const hideFromClasses: Record<CollapsingHeroHideFrom, string> = {
		tablet: 'tablet:hidden',
		none: ''
	};
	// U-14.1: the photo «lights up» once it arrives — Airbnb's 0.8 s fade on its curve (`reveal`, `standard`).
	const revealClasses = 'transition-opacity duration-reveal ease-standard';

	/**
	 * The addresses already shown in this session (the application's `loadedPhotos`, U-14.5): one of them shows at once,
	 * without the fade, on any later mount; every first showing fades in, even when the browser already holds it.
	 * Filled only in the browser (by a `load` or an effect, neither of which runs on the server); its reads are untracked.
	 */
	const shownPhotos = new SvelteSet<string>();

	export type CollapsingHeroProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		height: CollapsingHeroHeight;
		/** The photo; without one, or when it does not load, the silhouette (S-32.8, S-32.13). */
		imageUrl?: string;
		/** The «1 / N» pill in the caller's words, shown only over a photo (S-32.8) and lit up with it (U-14.5). */
		countLabel?: string;
		/** What the photo shows; decorative (`''`) by default, the page names the person. */
		alt?: string;
		/** While the page's data comes: the kit's breathing skeleton over the whole frame, no pill, no silhouette (U-14.1). */
		loading?: boolean;
		/** The `<img>`'s own `loading` (the former `loading` prop, renamed in U-14.1): `eager`, the top of its page. */
		imageLoading?: 'lazy' | 'eager';
		/** The page animates the photo (the application's `imageAnimatedStyle`) and the pill (`overlayAnimatedStyle`). */
		imageStyle?: string;
		overlayStyle?: string;
		hideFrom?: CollapsingHeroHideFrom;
		/**
		 * `<id>` the frame, `<id>-backdrop`, `-media`, `-reveal` (the node that lights up), `-waiting` (the muted fill
		 * until then), `-placeholder`, `-skeleton`, `-count` (the application's test ids).
		 */
		testId?: string;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { leaveTimeout } from '$shared/lib/headless/motion';
	import { cn } from '$shared/lib/utils';
	import { MediaPlaceholder } from '$shared/ui/primitives/media-placeholder';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let {
		height,
		imageUrl,
		countLabel,
		alt = '',
		loading = false,
		imageLoading = 'eager',
		imageStyle,
		overlayStyle,
		hideFrom = 'tablet',
		testId,
		class: className,
		...restProps
	}: CollapsingHeroProps = $props();

	// The addresses that did not load, for as long as the hero lives (the application's `useFailedImages`).
	const failed = new SvelteSet<string>();
	const photoUrl = $derived(imageUrl && !failed.has(imageUrl) ? imageUrl : '');
	const testIdOf = (part: string) => (testId ? `${testId}-${part}` : undefined);

	// The address that arrived: whether it showed at once (shown before in this session), and whether it is fully lit.
	let arrived = $state<{ url: string; atOnce: boolean; done: boolean }>();
	let photo = $state<HTMLImageElement | null>(null);
	const shown = $derived(photoUrl !== '' && arrived?.url === photoUrl);
	const atOnce = $derived(shown && arrived?.atOnce === true);
	// The muted fill waits under the photo until it is fully lit (the application's `-waiting`).
	const waiting = $derived(!(shown && arrived?.done === true));

	function arrive(node: Element, isAtOnce: boolean) {
		const url = node.getAttribute('src') ?? '';
		// A replaced <img> keeps loading detached, with its listeners (Svelte tears down only those of body, window,
		// document and media): its late `load` never takes the hero from the address shown now (review r1 MAJOR-1).
		if (url !== photoUrl) return;
		if (!isAtOnce && arrived?.url === url) return;
		// The fade needs a start: commit the reveal node's style (opacity 0) before `data-loaded` turns it 1, as a photo
		// may arrive before the browser drew the node, and `@starting-style` loses to the more specific `data-[…]` rule.
		if (!isAtOnce) node.parentElement?.getBoundingClientRect();
		shownPhotos.add(url);
		arrived = { url, atOnce: isAtOnce, done: isAtOnce };
	}

	function finish(url: string) {
		if (arrived?.url === url && !arrived.done) arrived = { ...arrived, done: true };
	}

	// Each <img> that mounts (U-14.5): an address already shown in this session shows at once, without the fade, so it
	// never blinks; a first showing the browser already decoded (cache, or loaded before hydration) fades in from 0 now,
	// as its `load` may be gone; any other waits for its `load` (a broken one for its `error`: the silhouette).
	$effect(() => {
		const node = photo;
		if (!node) return;
		untrack(() => {
			if (shownPhotos.has(node.getAttribute('src') ?? '')) arrive(node, true);
			else if (node.complete && node.naturalWidth > 0) arrive(node, false);
		});
	});

	// The fade's end lets the fill go: the reveal node's own `transitionend`, or the token's clock (`leaveTimeout`), as
	// a fade that is never drawn (the zone hides the hero) reports no end.
	$effect(() => {
		if (!shown || arrived?.done) return;
		const url = photoUrl;
		const clock = setTimeout(() => finish(url), leaveTimeout('reveal'));
		return () => clearTimeout(clock);
	});
</script>

<!-- The application's hero (M-20): the photo under the sheet that overlaps it by `hero-overlap`; the pill sits
     above that overlap (8 over `hero-h`, 4 over `hero-h-lg`), on the secondary scrim at 75 % (S-32.7). As the
     application's (U-14.1): the reveal node lights the photo up, the page's `imageStyle` still moves the photo itself
     and the muted fill that waits under it until the fade ends. -->
<div
	data-slot="collapsing-hero"
	data-testid={testId}
	class={cn('relative', heightClasses[height], hideFromClasses[hideFrom], className)}
	{...restProps}
>
	<div
		data-testid={testIdOf('backdrop')}
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 bg-background"
	></div>

	{#if loading}
		<!-- U-14.5: square, as the photo it stands for (the kit's `Skeleton` keeps its corners everywhere else). -->
		<div class="pointer-events-none absolute inset-0" style={imageStyle}>
			<Skeleton data-testid={testIdOf('skeleton')} class="size-full rounded-none" />
		</div>
	{:else if photoUrl}
		{#key photoUrl}
			{#if waiting}
				<div
					data-testid={testIdOf('waiting')}
					aria-hidden="true"
					class="pointer-events-none absolute inset-0 bg-muted"
					style={imageStyle}
				></div>
			{/if}
			<div
				data-testid={testIdOf('reveal')}
				data-loaded={shown}
				ontransitionend={(event) => {
					if (event.target === event.currentTarget) finish(photoUrl);
				}}
				class={cn(
					'absolute inset-0 opacity-0 data-[loaded=true]:opacity-100',
					!atOnce && revealClasses
				)}
			>
				<img
					bind:this={photo}
					data-testid={testIdOf('media')}
					src={photoUrl}
					{alt}
					loading={imageLoading}
					decoding="async"
					onload={(event) => arrive(event.currentTarget, false)}
					onerror={(event) => failed.add(event.currentTarget.getAttribute('src') ?? '')}
					style={imageStyle}
					class="absolute inset-0 size-full bg-muted object-cover"
				/>
				<!-- U-14.5: the pill lights up WITH the photo (the same node, opacity and `data-loaded`), never over the
				     muted fill before it; its box is the hero's, as the node is `absolute inset-0`. -->
				{#if countLabel}
					<span
						data-testid={testIdOf('count')}
						style={overlayStyle}
						class={cn(
							'absolute right-4 bottom-hero-overlap rounded-full bg-secondary/75 px-3 py-1.5 text-body-sm font-semibold text-secondary-foreground',
							countOffsetClasses[height]
						)}>{countLabel}</span
					>
				{/if}
			</div>
		{/key}
	{:else}
		<div aria-hidden="true" class="pointer-events-none absolute inset-0" style={imageStyle}>
			<MediaPlaceholder data-testid={testIdOf('placeholder')} class="h-full" />
		</div>
	{/if}
</div>
