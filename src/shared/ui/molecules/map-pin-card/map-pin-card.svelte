<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { MediaPlaceholder } from '$shared/ui/primitives/media-placeholder';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	let {
		href,
		linkLabel,
		imageUrl = null,
		imageAlt = '',
		closeLabel,
		onClose,
		badge,
		testId,
		class: className,
		children,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The whole card is one link (already resolved by the page). */
		href: string;
		/** The link's name. */
		linkLabel: string;
		/** The photo, or none: the muted frame with the no-photo silhouette. */
		imageUrl?: string | null;
		imageAlt?: string;
		/** The «×»'s name. */
		closeLabel: string;
		onClose: () => void;
		/** Over the photo's top-left corner (`MediaBadge`). */
		badge?: Snippet;
		testId?: string;
		/** The lines beside the photo (title, facts); a button or a link of theirs is its own target, over the link. */
		children: Snippet;
	} = $props();
</script>

<!-- U-24.4 (§7.1 of the wave record): the card a pin opens over the map — the 128 photo on the left, the caller's
     lines beside it, a «×» of its own (outside the link) at the top right; the 16 corner and the floating shadow.
     It rises in 8 the first time it is drawn (`starting:`): the page keys it by the pin, so each pin's card is new.
     U-27.4: ONE link for the whole card as the media card's (Airbnb's): an empty `<a>` under the photo and the lines,
     which let a press through to it, while their own buttons and links (a «Συνδεθείτε για κόστος») sit over it,
     outside it — never a control inside the link. -->
<div
	data-slot="map-pin-card"
	data-testid={testId}
	class={cn(
		'relative flex overflow-hidden rounded-lg bg-card shadow-floating transition-[translate,opacity] duration-standard ease-standard starting:translate-y-2 starting:opacity-0',
		// The link's focus ring is the card's own (the photo and the lines lie over the link, and the card clips).
		'has-[[data-slot=map-pin-card-link]:focus-visible]:ring-3 has-[[data-slot=map-pin-card-link]:focus-visible]:ring-ring/50',
		className
	)}
	{...restProps}
>
	<a
		{href}
		aria-label={linkLabel}
		data-slot="map-pin-card-link"
		class="absolute inset-0 min-h-touch w-full outline-none"
	></a>
	<span
		data-slot="map-pin-card-media"
		class="pointer-events-none relative w-map-card-media shrink-0 self-stretch overflow-hidden bg-muted"
	>
		{#if imageUrl}
			<img src={imageUrl} alt={imageAlt} class="absolute inset-0 size-full object-cover" />
		{:else}
			<MediaPlaceholder class="absolute inset-0 size-full" />
		{/if}
		{#if badge}
			<span class="absolute top-2 left-2">{@render badge()}</span>
		{/if}
	</span>
	<span
		data-slot="map-pin-card-body"
		class="pointer-events-none relative flex min-h-touch min-w-0 flex-1 flex-col gap-0.5 py-3 pr-control-xs pl-3.5 [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
	>
		{@render children()}
	</span>
	<IconButton
		appearance="tint"
		size="xs"
		surface="card"
		icon="close"
		iconSize="sm"
		aria-label={closeLabel}
		data-testid={testId ? `${testId}-close` : undefined}
		class="absolute top-0 right-0"
		onclick={() => onClose()}
	/>
</div>
