<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/** `gap`: the home rails' row (`gap-3`); `separated`: a hairline between cells (the profile's reviews, M-18). */
	export type RailVariant = 'gap' | 'separated';
	/** The zone from which the previous / next arrows show (a pointer's screen; touch scrolls by itself). */
	export type RailControlsFrom = 'tablet' | 'split' | 'laptop';

	/**
	 * The header's circle at the row's end: a pressable one is named and acts (`onclick` or an already resolved
	 * `href`); without either it is the static arrow of today, hidden from assistive tech — never an unnamed button.
	 */
	export type RailTrailing =
		| { icon?: IoniconName; label?: undefined; onclick?: undefined; href?: undefined }
		| { icon?: IoniconName; label: string; onclick: () => void; href?: undefined }
		| { icon?: IoniconName; label: string; href: string; onclick?: undefined };

	/** The names of the two arrows, already localized; without them the rail draws no arrows. */
	export type RailScrollLabels = { previous: string; next: string };

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

	export const railControlsClasses: Record<RailControlsFrom, string> = {
		tablet: 'hidden tablet:flex',
		split: 'hidden split:flex',
		laptop: 'hidden laptop:flex'
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
		scrollLabels?: RailScrollLabels;
		controlsFrom?: RailControlsFrom;
		/** Run the row into the page gutters (inside a `Container` with the zone gutter). */
		bleed?: boolean;
		headingAs?: string;
	} & RailContent<T> = $props();

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

{#snippet headerEnd()}
	{#if trailing}
		{@const icon = trailing.icon ?? 'arrow-forward'}
		{#if trailing.label !== undefined}
			<IconButton
				{icon}
				appearance="tint"
				surface="card"
				size="sm"
				iconSize="md"
				aria-label={trailing.label}
				href={trailing.href}
				onclick={trailing.onclick}
			/>
		{:else}
			<IconButton
				{icon}
				appearance="tint"
				surface="card"
				size="sm"
				iconSize="md"
				aria-label=""
				decorative
				class="mt-0.5"
			/>
		{/if}
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
				<div data-slot="rail-item" class="flex shrink-0 snap-start">
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
		trailing={trailing || scrollLabels ? headerEnd : undefined}
		data-slot="rail"
		data-variant={variant}
		class={className}
		{...restProps}
	>
		{@render row()}
	</Section>
{/if}
