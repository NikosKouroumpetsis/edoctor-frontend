<script lang="ts" module>
	import type { HTMLButtonAttributes } from 'svelte/elements';

	export type FavoriteButtonSize = 'md' | 'lg' | 'card-heart';
	export type FavoriteButtonInset = 'none' | 'xs' | 'sm' | 'md';
	/** `bare` the application's heart; `overlay` (U-20, Airbnb's) a white outline lifted over a dark see-through fill. */
	export type FavoriteButtonAppearance = 'bare' | 'overlay';

	// The heart over a card's photo (M-04): a transparent 48 box at the photo's top-right corner.
	const favoriteButtonBox =
		'group absolute inline-flex size-touch items-center justify-center rounded-full bg-transparent outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

	// U-28.4, with a pointer: the bare heart (on a surface) takes the round controls' light fill on hover; over a photo
	// (`overlay`) the heart itself grows, as Airbnb's does (the map pin's 8 %), and no fill covers the photo.
	const boxHoverClasses: Record<FavoriteButtonAppearance, string> = {
		bare: 'transition-colors duration-standard ease-standard can-hover:hover:bg-foreground/5',
		overlay: ''
	};
	const overlayGlyphHover =
		'transition-transform duration-standard ease-standard can-hover:group-hover:scale-108';

	const insets: Record<FavoriteButtonInset, string> = {
		none: 'top-0 right-0',
		xs: 'top-1 right-1',
		sm: 'top-1.5 right-1.5',
		md: 'top-2.5 right-2.5'
	};
	const glyphSizes: Record<FavoriteButtonSize, string> = {
		md: 'icon-md',
		lg: 'icon-lg',
		'card-heart': 'icon-card-heart'
	};

	export type FavoriteButtonProps = Omit<HTMLButtonAttributes, 'children' | 'onclick'> & {
		/** Saved or not: the filled heart in the brand pink, or the outline in the text colour. */
		selected: boolean;
		/** Called with the next value when the heart is pressed. */
		onToggle: (next: boolean) => void;
		/** The accessible name, which names what is saved (the card's subject), not just «save». */
		'aria-label': string;
		/** The application's default `lg` (24); a doctor's card passes `card-heart` (U-100). */
		size?: FavoriteButtonSize;
		/** The application's default `md` (10 from the corner); a doctor's card passes `none` or `xs` (U-100). */
		inset?: FavoriteButtonInset;
		appearance?: FavoriteButtonAppearance;
		/** The heart has just been filled: its «pop» plays once (`20-favorites` Π4, CSS only, always seen, U-12). */
		pop?: boolean;
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
		appearance = 'bare',
		pop = false,
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
	class={cn(favoriteButtonBox, insets[inset], boxHoverClasses[appearance], className)}
	onclick={() => onToggle(!selected)}
	{...restProps}
>
	{#if appearance === 'overlay'}
		<!-- U-20: the dark see-through fill (the accent when saved) under the white outline, which reads on any photo
		     (the application adds a 2 text shadow; the web's shadows are the elevation scale only, so none here). -->
		<Ionicon
			name="heart"
			data-slot="favorite-button-fill"
			class={cn(
				glyphSizes[size],
				selected ? 'text-accent/90' : 'text-secondary/45',
				overlayGlyphHover,
				pop && 'animate-heart-pop'
			)}
		/>
		<Ionicon
			name="heart-outline"
			data-slot="favorite-button-outline"
			class={cn(
				'absolute',
				glyphSizes[size],
				'text-media-scrim',
				overlayGlyphHover,
				pop && 'animate-heart-pop'
			)}
		/>
	{:else}
		<Ionicon
			name={selected ? 'heart' : 'heart-outline'}
			class={cn(
				glyphSizes[size],
				selected ? 'text-accent/90' : 'text-foreground/78',
				pop && 'animate-heart-pop'
			)}
		/>
	{/if}
</button>
