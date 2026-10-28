<script lang="ts" module>
	/** One segment: the caller's words and its value. */
	export type SegmentedControlSegment = { label: string; value: string };
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { handleRovingKeydown } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';

	let {
		segments,
		value = $bindable(),
		onChange,
		disabled = false,
		'aria-label': ariaLabel,
		testId,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		segments: SegmentedControlSegment[];
		value?: string;
		/** The chosen segment's value (the application's `onChange`). */
		onChange?: (value: string) => void;
		disabled?: boolean;
		/** The group's name («Φύλο»), already localized. */
		'aria-label'?: string;
		/** `<id>`, `<id>-<value>` per segment, `<id>-thumb`, `<id>-divider-<index>` (the application's test ids). */
		testId?: string;
	} = $props();

	let root = $state<HTMLElement | null>(null);
	const selectedIndex = $derived(
		Math.max(
			0,
			segments.findIndex((segment) => segment.value === value)
		)
	);
	const count = $derived(Math.max(segments.length, 1));

	function choose(next: string) {
		if (disabled) return;
		value = next;
		onChange?.(next);
	}

	// A radio group: the arrows move the focus and choose (the application's control has no keyboard).
	function onkeydown(event: KeyboardEvent) {
		if (!root) return;
		const moved = handleRovingKeydown(event, root, { orientation: 'horizontal' });
		if (moved?.dataset.value !== undefined) choose(moved.dataset.value);
	}
</script>

<!-- The application's `SegmentedControl` (D8): a 1px track, hairlines only between two unselected segments, and one
     dark-ringed muted thumb that slides across equal segments on the application's 180 ms `out(cubic)` (U-09.1,
     the `segment` motion token; whatever the device's motion setting, U-12.1); a label that does not fit wraps whole (S-26.5).
     The thumb is placed by CSS from the first render (no measuring, so the server draws it too): a CSS transition
     runs only on a change, so the first draw never slides from the start. -->
<div
	bind:this={root}
	role="radiogroup"
	aria-label={ariaLabel}
	aria-disabled={disabled || undefined}
	data-slot="segmented-control"
	data-testid={testId}
	class={cn('w-full rounded-md border border-border p-1', disabled && 'opacity-50', className)}
	{onkeydown}
	{...restProps}
>
	<div class="relative flex w-full flex-row">
		<span
			aria-hidden="true"
			data-slot="segmented-control-thumb"
			data-testid={testId ? `${testId}-thumb` : undefined}
			class="pointer-events-none absolute inset-y-0 left-0 rounded-md border-2 border-foreground bg-muted transition-transform duration-segment ease-segment"
			style="width: {100 / count}%; transform: translateX({selectedIndex * 100}%)"
		></span>
		{#each segments as segment, index (segment.value)}
			{@const selected = segment.value === value}
			{@const previousSelected = index > 0 && segments[index - 1].value === value}
			<button
				type="button"
				role="radio"
				aria-checked={selected}
				tabindex={index === selectedIndex ? 0 : -1}
				data-roving-item
				data-value={segment.value}
				data-testid={testId ? `${testId}-${segment.value}` : undefined}
				{disabled}
				onclick={() => choose(segment.value)}
				class="relative flex min-h-touch min-w-touch flex-1 items-center justify-center rounded-md px-3 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				{#if index > 0 && !selected && !previousSelected}
					<span
						aria-hidden="true"
						data-slot="segmented-control-divider"
						data-testid={testId ? `${testId}-divider-${index}` : undefined}
						class="pointer-events-none absolute inset-y-2 left-0 w-px bg-border"
					></span>
				{/if}
				<span
					class={cn(
						'text-center text-label-lg font-medium',
						selected ? 'text-foreground' : 'text-muted-foreground'
					)}>{segment.label}</span
				>
			</button>
		{/each}
	</div>
</div>
