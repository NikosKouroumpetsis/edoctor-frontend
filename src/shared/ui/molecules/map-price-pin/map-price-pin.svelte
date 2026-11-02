<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		label = null,
		selected = false,
		hot = false,
		'aria-label': ariaLabel,
		testId,
		class: className,
		...restProps
	}: Omit<HTMLButtonAttributes, 'children'> & {
		/** The price in the caller's words («60 €»); none ⇒ the small dot (a fee that needs sign-in, §7.1). */
		label?: string | null;
		/** The pin whose card is open: dark (the dot: accent) and a little bigger. */
		selected?: boolean;
		/** Pointed at from elsewhere (the list's card under the pointer): a little bigger. */
		hot?: boolean;
		/** The whole name (the price is not enough: whose, and where). */
		'aria-label': string;
		testId?: string;
	} = $props();
</script>

<!-- U-24.4 (§7.1 of the wave record, Airbnb's map): the white 28 pill with the price (13/700, a hairline and the
     raised shadow), or the 14 dark dot with a white ring; selected ⇒ dark (the dot: accent) and 8 % bigger, as when
     pointed at. The button is the 48 box centred on the point; the drawn pin sits in it. -->
<button
	type="button"
	aria-label={ariaLabel}
	aria-pressed={selected}
	data-slot="map-price-pin"
	data-kind={label ? 'price' : 'dot'}
	data-state={selected ? 'selected' : hot ? 'hot' : 'idle'}
	data-testid={testId}
	class={cn(
		'group inline-flex min-h-touch min-w-touch items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
		className
	)}
	{...restProps}
>
	{#if label}
		<span
			data-slot="map-price-pin-shape"
			class={cn(
				'inline-flex h-map-pin items-center rounded-full px-2.5 text-label-lg font-bold whitespace-nowrap shadow-raised ring-1 ring-secondary/8 transition-[scale,background-color,color] duration-standard ease-standard can-hover:group-hover:scale-108',
				selected ? 'bg-secondary text-secondary-foreground' : 'bg-card text-foreground',
				(selected || hot) && 'scale-108'
			)}
		>
			{label}
		</span>
	{:else}
		<span
			data-slot="map-price-pin-shape"
			class={cn(
				'inline-flex size-3.5 rounded-full border-2 border-card shadow-raised transition-[scale,background-color] duration-standard ease-standard can-hover:group-hover:scale-108',
				selected ? 'bg-accent' : 'bg-foreground',
				(selected || hot) && 'scale-108'
			)}
		></span>
	{/if}
</button>
