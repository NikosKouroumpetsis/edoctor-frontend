<script lang="ts" module>
	/** One time: the caller's words («10:30», S-32.9) and its value. */
	export type TimeSlot = { label: string; value: string };

	/** 🔴 U-02.2: the application's time chip (M-09), class for class; the focus ring is the web's own state. */
	const chipClasses =
		'flex min-h-touch w-full items-center justify-center rounded-md border px-2 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { handleRovingKeydown } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import {
		gridColumnClassesOf,
		type GridColumns,
		type GridColumnsByZone
	} from '$shared/ui/molecules/responsive-grid';

	let {
		slots,
		value = $bindable(),
		onChange,
		columns = 4,
		emptyText,
		testIdPrefix,
		'aria-label': ariaLabel,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		slots: readonly TimeSlot[];
		value?: string;
		/** The chosen time (the application's `onChange`). */
		onChange?: (value: string) => void;
		/** A count, or a count per zone from the phone up (the `ResponsiveGrid` columns); four by default. */
		columns?: GridColumns | GridColumnsByZone;
		/** The line shown when the day has no time, already localized. */
		emptyText: string;
		/** `<prefix>-times`, `<prefix>-slot-<value>`, `<prefix>-empty` (the application's test ids). */
		testIdPrefix?: string;
		/** The name of the group of times, already localized (a radio group needs one, ARIA 1.2). */
		'aria-label': string;
	} = $props();

	let root = $state<HTMLElement | null>(null);
	// The Tab stop of one choice: the chosen time, else the first (the radio pattern).
	const tabStop = $derived(slots.find((slot) => slot.value === value)?.value ?? slots[0]?.value);
	const testIdOf = (part: string) => (testIdPrefix ? `${testIdPrefix}-${part}` : undefined);

	function choose(next: string) {
		value = next;
		onChange?.(next);
	}

	// A radio group: the arrows move the focus and choose, as the native one (the application has no keyboard).
	function onkeydown(event: KeyboardEvent) {
		if (!root) return;
		const moved = handleRovingKeydown(event, root, { orientation: 'both' });
		if (moved?.dataset.value !== undefined) choose(moved.dataset.value);
	}
</script>

{#if slots.length === 0}
	<p
		data-slot="time-slot-grid-empty"
		data-testid={testIdOf('empty')}
		class={cn('text-body-sm text-muted-foreground', className)}
	>
		{emptyText}
	</p>
{:else}
	<!-- Equal columns, a short last row keeping their width (the application pads it with empty cells). -->
	<div
		bind:this={root}
		role="radiogroup"
		aria-label={ariaLabel}
		data-slot="time-slot-grid"
		data-testid={testIdOf('times')}
		class={cn('grid gap-rail', gridColumnClassesOf(columns), className)}
		{onkeydown}
		{...restProps}
	>
		{#each slots as slot (slot.value)}
			{@const selected = slot.value === value}
			<button
				type="button"
				role="radio"
				aria-checked={selected}
				tabindex={slot.value === tabStop ? 0 : -1}
				data-roving-item
				data-value={slot.value}
				data-testid={testIdOf(`slot-${slot.value}`)}
				onclick={() => choose(slot.value)}
				class={cn(chipClasses, selected ? 'border-primary bg-primary' : 'border-border/70 bg-card')}
			>
				<span
					class={cn(
						'truncate text-label-lg font-medium',
						selected ? 'text-primary-foreground' : 'text-primary-text'
					)}>{slot.label}</span
				>
			</button>
		{/each}
	</div>
{/if}
