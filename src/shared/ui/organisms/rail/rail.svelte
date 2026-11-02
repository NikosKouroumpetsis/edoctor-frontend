<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import {
		railControlsClasses,
		type RailControlsFrom,
		type RailScrollLabels
	} from '$shared/design/scroll-controls';
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/** `gap`: the home rails' row (`gap-3`); `separated`: a hairline between cells (the profile's reviews, M-18). */
	export type RailVariant = 'gap' | 'separated';
	// The zone from which the previous / next arrows show (a pointer's screen; touch scrolls by itself) and the names
	// of the two arrows, already localized (without them the rail draws no arrows) are `$shared/design/scroll-controls`,
	// one layer down, so the date strip (a molecule) reads them too (Π2, U-30.1); `index.ts` re-exports them.

	/**
	 * The header's circle at the row's end: a pressable one is named and acts (`onclick` or an already resolved
	 * `href`); without either it is the static arrow of today, hidden from assistive tech — never an unnamed button.
	 */
	export type RailTrailing =
		| { icon?: IoniconName; label?: undefined; onclick?: undefined; href?: undefined }
		| { icon?: IoniconName; label: string; onclick: () => void; href?: undefined }
		| { icon?: IoniconName; label: string; href: string; onclick?: undefined };

	/**
	 * Where the circle sits: right after the title (`title`, the application's `Rail` since U-20: the 32 soft
	 * circle), or at the header's end (`end`, the application's `CarouselSection`: the 40 card circle).
	 */
	export type RailTrailingAt = 'title' | 'end';

	/**
	 * Airbnb's cards per row (U-20), the application's `RAIL_CARDS_PER_VIEW`: ~2.3 on the phone (the row running into
	 * the gutters, a peek of the third), then 4 · 5 · 6 · 7 from 744 · 950 · 1128 · 1440 (bigger at 1920, where the page
	 * column grows), 12 apart. Each cell's 6 a side makes the 12 and holds a card's focus ring; the row gives them back
	 * at its ends. Tailwind reads no built class, so the web's `perView` takes this one table (its classes below).
	 */
	export const RAIL_CARDS_PER_VIEW = {
		phone: 2.3,
		tablet: 4,
		split: 5,
		laptop: 6,
		desktop: 7
	} as const;

	/** How many cells a `gap` row shows across its width by zone (the application's name; the one table above). */
	export type RailPerView = typeof RAIL_CARDS_PER_VIEW;

	// 🔴 The ONE size map of `RAIL_CARDS_PER_VIEW` (cards and their skeletons alike, as `cardSizeOf`, D13).
	const zoneRowClasses =
		'-mx-gutter-sm gap-0 px-4.5 scroll-px-4.5 tablet:-mx-1.5 tablet:px-0 tablet:scroll-px-0';
	const zoneCellClasses = 'w-4/9 px-1.5 tablet:w-1/4 split:w-1/5 laptop:w-1/6 desktop:w-1/7';
	const zoneChildClasses =
		'*:w-4/9 *:px-1.5 tablet:*:w-1/4 split:*:w-1/5 laptop:*:w-1/6 desktop:*:w-1/7';

	/** The room after the last cell of a `separated` row: `sm` 12, `md` 18 (the application's `endPadding`). */
	export type RailEndPadding = 'sm' | 'md';

	const endPaddingClasses: Record<RailEndPadding, string> = { sm: 'w-3', md: 'w-4.5' };

	/**
	 * The cells: `children` (each a direct child of the row) for the `gap` row, or `items` + `renderItem` — the only
	 * form of `separated`, whose hairline slot sits between two cells, outside both (the application's M-18).
	 */
	export type RailContent<T> =
		| {
				variant?: 'gap';
				children: Snippet;
				items?: undefined;
				renderItem?: undefined;
				keyExtractor?: undefined;
				/** Classes of the row of cells (the application's `itemsClassName`); the `gap` row only. */
				itemsClass?: string;
				endPadding?: undefined;
		  }
		| {
				variant?: 'gap';
				items: T[];
				renderItem: Snippet<[T, number]>;
				keyExtractor?: (item: T, index: number) => string | number;
				children?: undefined;
				itemsClass?: string;
				endPadding?: undefined;
		  }
		| {
				variant: 'separated';
				items: T[];
				renderItem: Snippet<[T, number]>;
				keyExtractor?: (item: T, index: number) => string | number;
				children?: undefined;
				/** The separated row owns its geometry (the application refuses `itemsClassName` there, its NIT-3). */
				itemsClass?: undefined;
				/** The room after the last cell (`sm` 12 by default, `md` 18). */
				endPadding?: RailEndPadding;
		  };

	// A rail that runs into the page gutters and snaps its cards to them (Airbnb's peek on the phone).
	const bleedClasses =
		'container-bleed scroll-px-gutter-sm split:scroll-px-gutter-md desktop:scroll-px-gutter-lg';

	// W-LIVE-2 (Airbnb's carousel): 4 of padding hold a card's focus ring inside the clip, the negative margin gives
	// them back, so no card moves; the scroll padding keeps the snap and an arrow's page. Above and below in every
	// row (the bottom keeps its 4, so the page under the rail stays put), at the sides unless the gutters hold it.
	const ringRoomClasses = '-mt-1 pt-1 pb-1';
	const ringRoomInlineClasses = '-mx-1 px-1 scroll-px-1';
</script>

<script lang="ts" generics="T">
	import type { HTMLAttributes } from 'svelte/elements';
	import { keepArrowFocus, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Section } from '$shared/ui/molecules/section';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Separator } from '$shared/ui/primitives/separator';

	let {
		title,
		subtitle,
		variant = 'gap',
		items,
		renderItem,
		keyExtractor,
		itemsClass,
		endPadding = 'sm',
		trailing,
		trailingAt = 'title',
		perView,
		scrollLabels,
		controlsFrom = 'laptop',
		bleed = false,
		headingAs = 'h2',
		class: className,
		children,
		...restProps
	}: Omit<HTMLAttributes<HTMLElement>, 'children'> & {
		/** Without a title the rail is its row alone: no header, no trailing, no arrows (the application's). */
		title?: string;
		subtitle?: string;
		trailing?: RailTrailing;
		trailingAt?: RailTrailingAt;
		/** The `gap` row's cells by zone (`RAIL_CARDS_PER_VIEW`); without it each cell keeps its own width. */
		perView?: RailPerView;
		scrollLabels?: RailScrollLabels;
		controlsFrom?: RailControlsFrom;
		/** Run the row into the page gutters (inside a `Container` with the zone gutter). */
		bleed?: boolean;
		headingAs?: string;
	} & RailContent<T> = $props();

	// Only the `gap` row takes cells by zone (the application's `perView`).
	const byZone = $derived(variant === 'gap' && perView !== undefined);
	const listId = useId(undefined, 'rail');
	let list = $state<HTMLElement | null>(null);
	// Off until the browser has measured the row: the server cannot know whether it overflows.
	let canPrevious = $state(false);
	let canNext = $state(false);
	let previousArrow = $state<HTMLElement | null>(null);
	let nextArrow = $state<HTMLElement | null>(null);

	// Before an arrow turns off at an end, the keyboard's focus on it moves to the other arrow (NIT-4).
	$effect.pre(() => {
		keepArrowFocus(
			{ previous: previousArrow, next: nextArrow },
			{ previous: canPrevious, next: canNext }
		);
	});

	function measure() {
		if (!list) return;
		const end = list.scrollWidth - list.clientWidth;
		canPrevious = list.scrollLeft > 1;
		canNext = list.scrollLeft < end - 1;
	}

	// The row is measured again when it scrolls, when its box changes and when its cells change (skeletons swapped
	// for cards of the same height change no box, only the content).
	$effect(() => {
		if (!list) return;
		measure();
		const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		resize?.observe(list);
		const mutation = typeof MutationObserver === 'undefined' ? null : new MutationObserver(measure);
		mutation?.observe(list, { childList: true, subtree: true });
		return () => {
			resize?.disconnect();
			mutation?.disconnect();
		};
	});

	/** One page: the visible width inside the snap padding; the browser smooths it unless motion is reduced. */
	function scrollPage(direction: 1 | -1) {
		if (!list) return;
		const inset = Number.parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
		list.scrollBy?.({ left: direction * (list.clientWidth - inset * 2) });
	}
</script>

<!-- The «→» right after the title (U-20, as the application's `Rail`): the 32 soft circle, pressable in its 48
     box; at the header's end (`trailingAt="end"`, the application's `CarouselSection`) the 40 card circle. -->
{#snippet trailingControl()}
	{#if trailing}
		{@const icon = trailing.icon ?? 'arrow-forward'}
		{@const atEnd = trailingAt === 'end'}
		{#if trailing.label !== undefined}
			<IconButton
				{icon}
				appearance="tint"
				surface={atEnd ? 'card' : 'soft'}
				size={atEnd ? 'sm' : 'xs'}
				iconSize={atEnd ? 'md' : 'sm'}
				aria-label={trailing.label}
				href={trailing.href}
				onclick={trailing.onclick}
			/>
		{:else}
			<IconButton
				{icon}
				appearance="tint"
				surface={atEnd ? 'card' : 'soft'}
				size={atEnd ? 'sm' : 'xs'}
				iconSize={atEnd ? 'md' : 'sm'}
				aria-label=""
				decorative
				class={atEnd ? 'mt-0.5' : undefined}
			/>
		{/if}
	{/if}
{/snippet}

{#snippet headerEnd()}
	{#if trailingAt === 'end'}
		{@render trailingControl()}
	{/if}
	{#if scrollLabels}
		<div
			data-slot="rail-controls"
			class={cn('items-center gap-2', railControlsClasses[controlsFrom])}
		>
			<IconButton
				icon="chevron-back"
				appearance="outline"
				size="xs"
				iconSize="md"
				aria-label={scrollLabels.previous}
				aria-controls={listId}
				bind:ref={previousArrow}
				disabled={!canPrevious}
				onclick={() => scrollPage(-1)}
			/>
			<IconButton
				icon="chevron-forward"
				appearance="outline"
				size="xs"
				iconSize="md"
				aria-label={scrollLabels.next}
				aria-controls={listId}
				bind:ref={nextArrow}
				disabled={!canNext}
				onclick={() => scrollPage(1)}
			/>
		</div>
	{/if}
{/snippet}

{#snippet row()}
	<div
		bind:this={list}
		id={listId}
		data-slot="rail-items"
		onscroll={measure}
		class={cn(
			'scrollbar-none flex snap-x snap-mandatory flex-row overflow-x-auto overscroll-x-contain scroll-smooth',
			ringRoomClasses,
			variant === 'gap' && 'gap-3',
			children && '*:shrink-0 *:snap-start',
			bleed ? bleedClasses : ringRoomInlineClasses,
			byZone && zoneRowClasses,
			byZone && children && zoneChildClasses,
			itemsClass
		)}
	>
		{#if items && renderItem}
			{#each items as item, index (keyExtractor ? keyExtractor(item, index) : index)}
				{#if variant === 'separated' && index > 0}
					<!-- The application's slot: the gap is ITS padding (16, 20 from the tablet), outside both cards. -->
					<div
						data-slot="rail-separator"
						aria-hidden="true"
						class="flex shrink-0 items-center justify-center self-stretch px-4 tablet:px-5"
					>
						<Separator orientation="vertical" spacing="none" />
					</div>
				{/if}
				<div
					data-slot="rail-item"
					class={cn('flex shrink-0 snap-start', byZone && zoneCellClasses)}
				>
					{@render renderItem(item, index)}
				</div>
			{/each}
			{#if variant === 'separated' && items.length > 0}
				<div
					data-slot="rail-end"
					aria-hidden="true"
					class={cn('shrink-0', endPaddingClasses[endPadding])}
				></div>
			{/if}
		{:else}
			{@render children?.()}
		{/if}
	</div>
{/snippet}

<!-- Untitled, the row alone in its block (the application's profile reviews and articles). -->
{#if title === undefined}
	<div data-slot="rail" data-variant={variant} class={className} {...restProps}>
		{@render row()}
	</div>
{:else}
	<Section
		{title}
		{subtitle}
		{headingAs}
		variant="plain"
		trailing={trailing && trailingAt === 'title' ? trailingControl : undefined}
		end={scrollLabels || (trailing && trailingAt === 'end') ? headerEnd : undefined}
		data-slot="rail"
		data-variant={variant}
		class={className}
		{...restProps}
	>
		{@render row()}
	</Section>
{/if}
