<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import type { RailScrollLabels } from '$shared/design/scroll-controls';
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/** One topic of the row: its words and its count already localized, its glyph; `ariaLabel` the words a reader hears. */
	export type MentionChip = {
		id: string;
		label: string;
		count: string;
		icon: IoniconName;
		ariaLabel?: string;
	};
	/** The padding of the surface the row runs edge to edge in: `gutter-sm` the web's modal screen (24). */
	export type MentionChipsBleed = 'none' | 'gutter-sm';

	const rowBleeds: Record<MentionChipsBleed, string> = {
		none: '',
		'gutter-sm': '-mx-gutter-sm pl-gutter-sm'
	};
	const trackBleeds: Record<MentionChipsBleed, string> = {
		none: '',
		'gutter-sm': 'pr-gutter-sm'
	};
	/** Room kept on each side of the chip brought into view: a round arrow (32) and its gap. */
	const REVEAL_ROOM = 40;

	export type MentionChipsProps = Omit<
		HTMLAttributes<HTMLElement>,
		'children' | 'title' | 'onchange'
	> & {
		/** The section's heading, already localized. */
		title: string;
		chips: readonly MentionChip[];
		/** The one chosen topic, `null` none. */
		value: string | null;
		/** A press: its topic, or `null` for a second press and «× Καθαρισμός». */
		onChange: (id: string | null) => void;
		clearLabel: string;
		/** From 744 the round «‹ ›» over the row, only while there is more of it to see. */
		scrollLabels?: RailScrollLabels;
		bleed?: MentionChipsBleed;
		/** `<id>`, `<id>-clear`, `<id>-row`, `<id>-chip-<chip id>`. */
		testId?: string;
	};
</script>

<script lang="ts">
	import { keepArrowFocus, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	let {
		title,
		chips,
		value,
		onChange,
		clearLabel,
		scrollLabels,
		bleed = 'none',
		testId,
		class: className,
		...restProps
	}: MentionChipsProps = $props();

	const titleId = useId(undefined, 'mention-chips');
	// «× Καθαρισμός» only for a chip that is there: a value with none has nothing to take out.
	const hasChosen = $derived(chips.some((chip) => chip.id === value));
	const testIdOf = (part: string) => (testId ? `${testId}-${part}` : undefined);

	// The arrows only measure and move the row; the browser's own smooth scroll draws the motion.
	let row = $state<HTMLElement | null>(null);
	let canPrevious = $state(false);
	let canNext = $state(false);
	let previousArrow = $state<HTMLElement | null>(null);
	let nextArrow = $state<HTMLElement | null>(null);
	function measure() {
		if (!row) return;
		canPrevious = row.scrollLeft > 1;
		canNext = row.scrollLeft < row.scrollWidth - row.clientWidth - 1;
	}
	$effect(() => {
		const target = row;
		void chips.length;
		if (!target || !scrollLabels) return;
		measure();
		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		observer?.observe(target);
		return () => observer?.disconnect();
	});
	$effect.pre(() => {
		keepArrowFocus(
			{ previous: previousArrow, next: nextArrow },
			{ previous: canPrevious, next: canNext }
		);
	});
	const scrollBy = (direction: -1 | 1) =>
		row?.scrollBy?.({ left: (direction * row.clientWidth) / 2, behavior: 'smooth' });

	// The chosen chip comes into view (the application's `ChipGroup`, U-60.4); only the row moves, never the page.
	$effect(() => {
		const chosen = value;
		const target = row;
		if (!chosen || !target) return;
		const chip = target.querySelector<HTMLElement>('[aria-pressed="true"]');
		if (!chip) return;
		const area = target.getBoundingClientRect();
		const box = chip.getBoundingClientRect();
		if (box.left >= area.left + REVEAL_ROOM && box.right <= area.right - REVEAL_ROOM) return;
		target.scrollBy?.({ left: box.left - area.left - REVEAL_ROOM, behavior: 'smooth' });
	});
</script>

<!-- 🔴 U-66.2 «Οι ασθενείς αναφέρουν» (Π5), the application's `MentionChips`: nothing without chips; the heading in a row
     that stays 48, so «× Καθαρισμός» comes beside it (only with a topic chosen) and a press moves nothing below; one row of
     toggles — below 744 the application's (48, corner 16, its border), from 744 Airbnb's web chip (56, corner 12, lifted).
     The labels are drawn as text (U-65.6). -->
{#if chips.length > 0}
	<section
		aria-labelledby={titleId}
		data-slot="mention-chips"
		data-testid={testId}
		class={className}
		{...restProps}
	>
		<div
			data-slot="mention-chips-head"
			class="flex min-h-touch flex-row items-center justify-between gap-3"
		>
			<h3 id={titleId} class="flex-1 text-title-sm text-foreground">{title}</h3>
			{#if hasChosen}
				<button
					type="button"
					data-slot="mention-chips-clear"
					data-testid={testIdOf('clear')}
					class="inline-flex min-h-touch min-w-touch shrink-0 flex-row items-center justify-center gap-1 rounded-sm text-body-sm font-semibold text-foreground transition-[opacity,translate] duration-label ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 starting:translate-x-1.5 starting:opacity-0 can-hover:hover:[&>span]:decoration-2"
					onclick={() => onChange(null)}
				>
					<Ionicon name="close" class="icon-sm" />
					<span class="underline">{clearLabel}</span>
				</button>
			{/if}
		</div>
		<div class="relative mt-1.5">
			<div
				bind:this={row}
				onscroll={measure}
				role="group"
				aria-labelledby={titleId}
				data-slot="mention-chips-row"
				data-testid={testIdOf('row')}
				class={cn(
					'scrollbar-none overflow-x-auto overscroll-x-contain scroll-smooth',
					rowBleeds[bleed]
				)}
			>
				<div class={cn('flex w-max flex-row gap-2 pt-1.5 pb-2.5', trackBleeds[bleed])}>
					{#each chips as chip (chip.id)}
						{@const selected = chip.id === value}
						<button
							type="button"
							aria-pressed={selected}
							aria-label={chip.ariaLabel}
							data-slot="mention-chip"
							data-testid={testIdOf(`chip-${chip.id}`)}
							class={cn(
								'inline-flex min-h-touch min-w-touch shrink-0 flex-row items-center gap-2 rounded-lg border bg-card px-4 text-body-md font-medium whitespace-nowrap text-foreground transition-[border-color,box-shadow,background-color,scale] duration-label ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-97 tablet:min-h-control-lg tablet:rounded-md tablet:text-label-md tablet:shadow-raised can-hover:hover:border-foreground',
								selected
									? 'border-foreground bg-foreground/5 ring-1 ring-foreground ring-inset'
									: 'border-border tablet:border-border/60'
							)}
							onclick={() => onChange(selected ? null : chip.id)}
						>
							<Ionicon
								name={chip.icon}
								class={cn(
									'icon-md transition-colors duration-label ease-standard',
									selected ? 'text-rating' : 'text-foreground'
								)}
							/>
							<span>{chip.label}</span>
							<span data-slot="mention-chip-count" class="font-normal text-muted-foreground"
								>{chip.count}</span
							>
						</button>
					{/each}
				</div>
			</div>
			{#if scrollLabels}
				<IconButton
					icon="chevron-back"
					appearance="outline"
					size="xs"
					iconSize="sm"
					aria-label={scrollLabels.previous}
					bind:ref={previousArrow}
					disabled={!canPrevious}
					onclick={() => scrollBy(-1)}
					class={cn(
						'absolute top-1/2 -left-1 hidden -translate-y-1/2 transition-opacity duration-label ease-standard tablet:inline-flex',
						!canPrevious && 'pointer-events-none opacity-0'
					)}
				/>
				<IconButton
					icon="chevron-forward"
					appearance="outline"
					size="xs"
					iconSize="sm"
					aria-label={scrollLabels.next}
					bind:ref={nextArrow}
					disabled={!canNext}
					onclick={() => scrollBy(1)}
					class={cn(
						'absolute top-1/2 -right-1 hidden -translate-y-1/2 transition-opacity duration-label ease-standard tablet:inline-flex',
						!canNext && 'pointer-events-none opacity-0'
					)}
				/>
			{/if}
		</div>
	</section>
{/if}
