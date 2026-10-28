<script lang="ts" module>
	import { controls, media } from '$shared/design/tokens';
	import type { IoniconName } from '$shared/ui/icons/ionicon';
	import type { RailControlsFrom, RailScrollLabels } from '$shared/ui/organisms/rail';

	/** One day: the caller's words (`label` over `sublabel`), its whole date as the name, and whether it is closed. */
	export type DateStripDay = {
		value: string;
		label: string;
		sublabel: string;
		accessibleLabel: string;
		disabled?: boolean;
	};

	/** The names of the two arrows, already localized; without them the strip draws no arrows. */
	export type DateStripScrollLabels = RailScrollLabels;

	/**
	 * 🔴 S-26.1: the day card's width in a strip `stripWidth` wide, so the strip shows `k` whole cards and HALF the next
	 * one at its trailing edge — the sign that more days follow. `k` is as many as fit at `day-card-min-w` with
	 * `touch-gap` between them; the card is never narrower than `day-card-min-w` (the application's formula).
	 */
	export function toDayCardWidth(stripWidth: number): number {
		const minimum = media['day-card-min-w'];
		const gap = controls['touch-gap'];
		const wholeCards = Math.max(0, Math.floor((stripWidth - minimum / 2) / (minimum + gap)));
		return Math.max(minimum, (stripWidth - wholeCards * gap) / (wholeCards + 1 / 2));
	}

	/** 🔴 U-02.2: the application's day card (M-08), class for class; the inset ring is the web's focus. */
	const dayClasses =
		'flex min-w-day-card-min-w min-h-touch shrink-0 flex-col items-center gap-1 rounded-lg border px-1 py-3 outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50';

	export type DateStripControlsFrom = RailControlsFrom;
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { handleRovingKeydown, keepArrowFocus, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { railControlsClasses } from '$shared/ui/organisms/rail';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	let {
		days,
		value = $bindable(),
		onChange,
		icon,
		scrollLabels,
		controlsFrom = 'laptop',
		testIdPrefix,
		'aria-label': ariaLabel,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		days: readonly DateStripDay[];
		value?: string;
		/** The day the reader pressed (the application's `onChange`); scrolling and the arrows never choose. */
		onChange?: (value: string) => void;
		/** A glyph above each day (the application's `calendar-outline`). */
		icon?: IoniconName;
		/** Previous / next arrows (a pointer's screen, from `controlsFrom`); touch scrolls by itself (S-26.1). */
		scrollLabels?: DateStripScrollLabels;
		controlsFrom?: DateStripControlsFrom;
		/** `<prefix>-strip` (the scroller), `<prefix>-row`, `<prefix>-<value>` (the application's test ids). */
		testIdPrefix?: string;
		/** The name of the row of days, already localized (a group of buttons needs one). */
		'aria-label': string;
	} = $props();

	const stripId = useId(undefined, 'date-strip');
	let strip = $state<HTMLElement | null>(null);
	let row = $state<HTMLElement | null>(null);
	let stripWidth = $state(0);
	let canPrevious = $state(false);
	let canNext = $state(false);
	let previousArrow = $state<HTMLElement | null>(null);
	let nextArrow = $state<HTMLElement | null>(null);
	// Opens on the selected day ONCE, after the first measure; a press ends that for good (not reactive).
	let revealed = false;

	const cardWidth = $derived(stripWidth > 0 ? toDayCardWidth(stripWidth) : 0);
	// The Tab stop: the selected day, else the first open one (the manual tabs pattern: the arrows only move).
	const tabStop = $derived(
		(days.find((day) => day.value === value && !day.disabled) ?? days.find((day) => !day.disabled))
			?.value
	);
	const testIdOf = (part: string) => (testIdPrefix ? `${testIdPrefix}-${part}` : undefined);

	// Before an arrow turns off at an end, the keyboard's focus on it moves to the other arrow (as `Rail`).
	$effect.pre(() => {
		keepArrowFocus(
			{ previous: previousArrow, next: nextArrow },
			{ previous: canPrevious, next: canNext }
		);
	});

	/** Whether the strip can still scroll either way. */
	function measureEnds() {
		if (!strip) return;
		const end = strip.scrollWidth - strip.clientWidth;
		canPrevious = strip.scrollLeft > 1;
		canNext = strip.scrollLeft < end - 1;
	}

	/** The strip's own width (never the screen's), then its ends. */
	function measure() {
		if (!strip) return;
		stripWidth = strip.clientWidth;
		measureEnds();
	}

	$effect(() => {
		if (!strip) return;
		measure();
		const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		resize?.observe(strip);
		return () => resize?.disconnect();
	});

	// The cards took their measured width, or the days changed: the row is longer or shorter, so the ends again.
	$effect(() => {
		void cardWidth;
		void days.length;
		measureEnds();
	});

	// 🔴 S-26.1: once the cards have their measured width AND the selected day is drawn, the strip opens on it,
	// without motion, once — days that arrive after the measure still open it (the application ties it to the
	// selected card's own layout). A press ends it for good. Its length, so days pushed into the same list count too.
	$effect(() => {
		void days.length;
		if (revealed || cardWidth <= 0 || !strip || !row) return;
		const selected = [...row.querySelectorAll<HTMLElement>('[data-roving-item]')].find(
			(card) => card.dataset.value === value
		);
		if (!selected) return;
		revealed = true;
		strip.scrollTo?.({ left: selected.offsetLeft, behavior: 'instant' });
	});

	function select(day: DateStripDay) {
		if (day.disabled) return;
		revealed = true;
		value = day.value;
		onChange?.(day.value);
	}

	/** The arrows, Home and End move the focus along the open days; only Enter, Space or a press chooses. */
	function onkeydown(event: KeyboardEvent) {
		if (row) handleRovingKeydown(event, row, { orientation: 'horizontal', loop: false });
	}

	/** One page: the whole cards in view (the half one becomes the first), smoothed unless motion is reduced. */
	function scrollPage(direction: 1 | -1) {
		if (!strip) return;
		strip.scrollBy?.({ left: direction * (strip.clientWidth - cardWidth / 2) });
	}
</script>

<div
	data-slot="date-strip"
	class={cn('flex flex-row items-center gap-2', className)}
	{...restProps}
>
	{#if scrollLabels}
		<IconButton
			icon="chevron-back"
			appearance="outline"
			size="xs"
			iconSize="md"
			aria-label={scrollLabels.previous}
			aria-controls={stripId}
			bind:ref={previousArrow}
			disabled={!canPrevious}
			onclick={() => scrollPage(-1)}
			class={railControlsClasses[controlsFrom]}
			data-slot="date-strip-previous"
		/>
	{/if}
	<div
		bind:this={strip}
		id={stripId}
		data-slot="date-strip-scroller"
		data-testid={testIdOf('strip')}
		onscroll={measure}
		class="relative scrollbar-none min-w-0 flex-1 overflow-x-auto overscroll-x-contain scroll-smooth"
	>
		<!-- The row moves the keyboard's focus between its buttons, as the kit's `ToggleGroup`. -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			bind:this={row}
			role="group"
			aria-label={ariaLabel}
			data-slot="date-strip-row"
			data-testid={testIdOf('row')}
			class="flex flex-row gap-touch-gap"
			{onkeydown}
		>
			{#each days as day (day.value)}
				{@const selected = day.value === value}
				<button
					type="button"
					aria-label={day.accessibleLabel}
					aria-pressed={selected}
					disabled={day.disabled}
					tabindex={day.value === tabStop ? 0 : -1}
					data-roving-item
					data-value={day.value}
					data-testid={testIdOf(day.value)}
					onclick={() => select(day)}
					style:min-width={cardWidth > 0 ? `${cardWidth}px` : undefined}
					class={cn(
						dayClasses,
						selected ? 'border-foreground' : 'border-border',
						day.disabled && 'opacity-40'
					)}
				>
					{#if icon}
						<Ionicon name={icon} class="icon-md text-foreground" />
					{/if}
					<span class={cn('text-label-lg text-foreground', selected && 'font-semibold')}
						>{day.label}</span
					>
					<span class="text-label-md text-muted-foreground">{day.sublabel}</span>
				</button>
			{/each}
		</div>
	</div>
	{#if scrollLabels}
		<IconButton
			icon="chevron-forward"
			appearance="outline"
			size="xs"
			iconSize="md"
			aria-label={scrollLabels.next}
			aria-controls={stripId}
			bind:ref={nextArrow}
			disabled={!canNext}
			onclick={() => scrollPage(1)}
			class={railControlsClasses[controlsFrom]}
			data-slot="date-strip-next"
		/>
	{/if}
</div>
