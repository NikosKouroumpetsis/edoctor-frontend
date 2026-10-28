<script lang="ts" module>
	import type { HTMLButtonAttributes } from 'svelte/elements';

	export type FavoriteButtonSize = 'md' | 'lg';
	export type FavoriteButtonInset = 'sm' | 'md';

	// The heart over a card's photo (M-04): a transparent 48 box at the photo's top-right corner.
	const favoriteButtonBox =
		'absolute inline-flex size-touch items-center justify-center rounded-full bg-transparent outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

	const insets: Record<FavoriteButtonInset, string> = {
		sm: 'top-1.5 right-1.5',
		md: 'top-2.5 right-2.5'
	};
	const glyphSizes: Record<FavoriteButtonSize, string> = {
		md: 'icon-md',
		lg: 'icon-lg'
	};

	export type FavoriteButtonProps = Omit<HTMLButtonAttributes, 'children' | 'onclick'> & {
		/** Saved or not: the filled heart in the brand pink, or the outline in the text colour. */
		selected: boolean;
		/** Called with the next value when the heart is pressed. */
		onToggle: (next: boolean) => void;
		/** The accessible name, which names what is saved (the card's subject), not just «save». */
		'aria-label': string;
		/** The application's default `lg` (24); a rail card passes `md` (R1-5). */
		size?: FavoriteButtonSize;
		/** The application's default `md` (10 from the corner); a rail card passes `sm`. */
		inset?: FavoriteButtonInset;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		selected,
		onToggle,
		size = 'lg',
		inset = 'md',
		type = 'button',
		class: className,
		...restProps
	}: FavoriteButtonProps = $props();
</script>

<button
	{type}
	aria-pressed={selected}
	data-slot="favorite-button"
	data-state={selected ? 'on' : 'off'}
	class={cn(favoriteButtonBox, insets[inset], className)}
	onclick={() => onToggle(!selected)}
	{...restProps}
>
	<Ionicon
		name={selected ? 'heart' : 'heart-outline'}
		class={cn(glyphSizes[size], selected ? 'text-accent/90' : 'text-foreground/78')}
	/>
</button>
