<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	export type IconButtonAppearance = 'bare' | 'outline' | 'scrim' | 'tint' | 'tile';
	export type IconButtonSize = 'xs' | 'sm' | 'md' | 'touch' | 'xl';
	export type IconButtonSurface = 'card' | 'muted' | 'subtle' | 'soft' | 'strong';
	export type IconButtonIconSize = 'md' | 'lg' | 'xl';
	export type IconButtonIconTone = 'foreground' | 'secondary' | 'muted';
	/** The sizes whose shape IS the target (48, 64); the smaller ones sit inside the 48 box. */
	export type IconButtonOwnShapeSize = Extract<IconButtonSize, 'touch' | 'xl'>;
	export type IconButtonBoxedSize = Exclude<IconButtonSize, IconButtonOwnShapeSize>;

	// The target box of a round look: the 48 touch box, or the 64 circle that is its own target.
	const roundBoxes: Record<IconButtonOwnShapeSize, string> = {
		touch: 'size-touch rounded-full',
		xl: 'size-control-xl rounded-full'
	};
	// The tile is a bordered square, the target itself: 48 or 64.
	const tileBoxes: Record<IconButtonOwnShapeSize, string> = {
		touch: 'size-touch',
		xl: 'size-control-xl'
	};
	const tileLook = 'rounded-md border border-border bg-card';
	const boxBase =
		'relative inline-flex shrink-0 items-center justify-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

	// The drawn circle (D1): its diameter, then its fill or ring per appearance.
	const shapeSizes: Record<IconButtonSize, string> = {
		xs: 'size-control-xs',
		sm: 'size-control-sm',
		md: 'size-control-md',
		touch: 'size-touch',
		xl: 'size-control-xl'
	};
	const shapeLooks: Record<Exclude<IconButtonAppearance, 'tint' | 'tile'>, string> = {
		bare: '',
		outline: 'border border-border/60 bg-card',
		scrim: 'bg-media-scrim/90'
	};
	const surfaces: Record<IconButtonSurface, string> = {
		card: 'bg-card',
		muted: 'bg-muted',
		subtle: 'bg-foreground/5',
		soft: 'bg-foreground/6',
		strong: 'bg-foreground/8'
	};
	const iconSizes: Record<IconButtonIconSize, string> = {
		md: 'icon-md',
		lg: 'icon-lg',
		xl: 'icon-xl'
	};
	const iconTones: Record<IconButtonIconTone, string> = {
		foreground: 'text-foreground',
		secondary: 'text-secondary',
		muted: 'text-muted-foreground'
	};

	/** What each appearance draws when the caller names nothing else (the application's defaults per look). */
	const defaults: Record<
		IconButtonAppearance,
		{ size: IconButtonSize; iconSize: IconButtonIconSize; iconTone: IconButtonIconTone }
	> = {
		bare: { size: 'touch', iconSize: 'lg', iconTone: 'foreground' },
		outline: { size: 'touch', iconSize: 'lg', iconTone: 'foreground' },
		scrim: { size: 'touch', iconSize: 'md', iconTone: 'secondary' },
		tint: { size: 'sm', iconSize: 'md', iconTone: 'foreground' },
		tile: { size: 'xl', iconSize: 'lg', iconTone: 'foreground' }
	};

	/**
	 * The look, narrowed as the application's (delta R1): the scrim IS the 48 circle, the tile the 48 or 64 square, and
	 * the lifted shadow (`elevated`, the application's `shadowStyle`) falls only from a shape that is its own target —
	 * a combination the shape cannot draw does not type-check, so no look is lost in silence.
	 */
	export type IconButtonLook =
		| { appearance: 'scrim'; size?: 'touch'; surface?: never; elevated?: never }
		| { appearance: 'tile'; size?: IconButtonOwnShapeSize; surface?: never; elevated?: never }
		| {
				appearance?: 'bare' | 'outline';
				size?: IconButtonOwnShapeSize;
				surface?: never;
				elevated?: boolean;
		  }
		| {
				appearance?: 'bare' | 'outline';
				size: IconButtonBoxedSize;
				surface?: never;
				elevated?: never;
		  }
		| {
				appearance: 'tint';
				size: IconButtonOwnShapeSize;
				surface?: IconButtonSurface;
				elevated?: boolean;
		  }
		| {
				appearance: 'tint';
				size?: IconButtonBoxedSize;
				surface?: IconButtonSurface;
				elevated?: never;
		  };

	export type IconButtonProps = Omit<HTMLButtonAttributes, 'children'> &
		Omit<HTMLAnchorAttributes, 'children'> &
		IconButtonLook & {
			/** The accessible name: an icon button has no visible words, so it is required. */
			'aria-label': string;
			/** The application's Ionicons name; a tile may draw a brand mark through `children` instead. */
			icon?: IoniconName;
			children?: Snippet;
			iconSize?: IconButtonIconSize;
			iconTone?: IconButtonIconTone;
			/** Above 0 the bare button is active: a foreground ring and a count badge. */
			count?: number;
			/** A tile whose provider sheet is open: dimmed, presses refused. */
			busy?: boolean;
			/** The shape alone, without a target (a header's static arrow): no button, hidden from assistive tech. */
			decorative?: boolean;
			/** Places the button (`mt-0.5`, `absolute top-5 right-5`); never sizes it — the size is `size`. */
			class?: string;
			ref?: HTMLElement | null;
		};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		icon,
		children,
		appearance = 'bare',
		size,
		surface = 'card',
		elevated = false,
		iconSize,
		iconTone,
		count = 0,
		busy = false,
		decorative = false,
		disabled = false,
		href,
		type = 'button',
		class: className,
		ref = $bindable(null),
		...restProps
	}: IconButtonProps = $props();

	const shape = $derived<IconButtonSize>(size ?? defaults[appearance].size);
	const ownShape = $derived<IconButtonOwnShapeSize | null>(
		shape === 'touch' || shape === 'xl' ? shape : null
	);
	const glyphSize = $derived(iconSize ?? defaults[appearance].iconSize);
	const glyphTone = $derived(iconTone ?? defaults[appearance].iconTone);
	const isTile = $derived(appearance === 'tile');
	const isActive = $derived(count > 0);
	const isBlocked = $derived(Boolean(disabled) || busy);
	const look = $derived(
		appearance === 'tint'
			? surfaces[surface]
			: appearance === 'tile'
				? tileLook
				: shapeLooks[appearance]
	);
	// The drawn shape: the circle of its size and look (a tile draws its square on the box itself).
	const circle = $derived(
		cn(
			'inline-flex items-center justify-center rounded-full',
			shapeSizes[shape],
			look,
			isActive && 'border-2 border-foreground'
		)
	);
	const tileSize = $derived<IconButtonOwnShapeSize>(ownShape ?? 'xl');
	const roundSize = $derived<IconButtonOwnShapeSize>(shape === 'xl' ? 'xl' : 'touch');
	const boxState = $derived(
		cn(
			isTile && 'active:bg-muted',
			elevated && ownShape && 'shadow-floating',
			isBlocked && 'opacity-50'
		)
	);
</script>

{#snippet glyph()}
	{#if children}
		{@render children()}
	{:else if icon}
		<Ionicon name={icon} class={cn(iconSizes[glyphSize], iconTones[glyphTone])} />
	{/if}
{/snippet}

{#snippet body()}
	{#if isTile}
		{@render glyph()}
	{:else}
		<span class={circle} data-slot="icon-button-shape">{@render glyph()}</span>
	{/if}
	{#if isActive}
		<span
			data-slot="icon-button-count"
			class="absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-background bg-foreground px-1 py-px text-label-md font-semibold text-background"
		>
			{count}
		</span>
	{/if}
{/snippet}

{#if decorative}
	<!-- The shape alone, as the application draws a decorative one: the circle, or the tile's square. -->
	<span
		aria-hidden="true"
		data-slot="icon-button"
		data-appearance={appearance}
		class={cn(
			'inline-flex shrink-0 items-center justify-center',
			isTile ? cn(tileBoxes[tileSize], tileLook) : circle,
			elevated && ownShape && 'shadow-floating',
			className
		)}
	>
		{@render glyph()}
	</span>
{:else if href}
	<a
		bind:this={ref}
		data-slot="icon-button"
		data-appearance={appearance}
		href={isBlocked ? undefined : href}
		aria-disabled={isBlocked || undefined}
		aria-busy={busy || undefined}
		role={isBlocked ? 'link' : undefined}
		tabindex={isBlocked ? -1 : undefined}
		class={cn(
			boxBase,
			isTile ? cn(tileBoxes[tileSize], tileLook) : roundBoxes[roundSize],
			boxState,
			className
		)}
		{...restProps}
	>
		{@render body()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="icon-button"
		data-appearance={appearance}
		{type}
		disabled={isBlocked}
		aria-busy={busy || undefined}
		class={cn(
			boxBase,
			isTile ? cn(tileBoxes[tileSize], tileLook) : roundBoxes[roundSize],
			boxState,
			className
		)}
		{...restProps}
	>
		{@render body()}
	</button>
{/if}
