<script lang="ts" module>
	export type SteppedRangeSize = 'sm' | 'default' | 'lg';

	type SizeSpec = {
		/** Slider track thickness. */
		track: string;
		/** Slider thumb (handle) diameter. */
		thumb: string;
		/** Tick-mark height (width is always a hairline). */
		tick: string;
		/** Reserved height of the slider row (clears the thumb overflow). */
		sliderArea: string;
		title: string;
		subtitle: string;
		/** Per-stop label text size. */
		label: string;
		/** Bottom margin under the title block. */
		titleMb: string;
		/** Top margin above the labels row. */
		labelsMt: string;
		/** Height reserved for the (single-line) labels row. */
		labelsH: string;
	};

	const sizeConfig: Record<SteppedRangeSize, SizeSpec> = {
		sm: {
			track: 'h-0.5',
			thumb: 'size-6',
			tick: 'h-1.5',
			sliderArea: 'min-h-touch',
			title: 'text-body-lg',
			subtitle: 'text-label-md font-normal',
			label: 'text-label-md font-normal',
			titleMb: 'mb-4',
			labelsMt: 'mt-3',
			labelsH: 'h-4'
		},
		default: {
			track: 'h-0.5',
			thumb: 'size-control-xs',
			tick: 'h-2',
			sliderArea: 'min-h-touch',
			title: 'text-title-sm',
			subtitle: 'text-body-sm',
			label: 'text-body-sm',
			titleMb: 'mb-6',
			labelsMt: 'mt-4',
			labelsH: 'h-5'
		},
		lg: {
			track: 'h-1',
			thumb: 'size-control-sm',
			tick: 'h-2.5',
			sliderArea: 'min-h-touch',
			title: 'text-title-lg',
			subtitle: 'text-body-lg',
			label: 'text-body-lg',
			titleMb: 'mb-6',
			labelsMt: 'mt-5',
			labelsH: 'h-6'
		}
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { Slider } from '$shared/ui/primitives/slider';

	let {
		ref = $bindable(null),
		value = $bindable<[number, number]>(),
		steps,
		size = 'default',
		disabled = false,
		title,
		subtitle,
		class: className,
		onValueChange,
		'aria-label': ariaLabel,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		/** Selected `[startIndex, endIndex]`; two-way bound, clamped and
		 * non-crossing. Defaults to the full range `[0, steps.length - 1]`. */
		value?: [number, number];
		/** Ordered stop labels; drives the number of discrete stops (N). */
		steps: string[];
		size?: SteppedRangeSize;
		disabled?: boolean;
		title?: string;
		subtitle?: string;
		onValueChange?: (value: [number, number]) => void;
	} = $props();

	const spec = $derived(sizeConfig[size]);

	// Discrete index domain: one stop per label, snapping to whole indices.
	const maxIndex = $derived(Math.max(steps.length - 1, 0));
	const stopIndices = $derived(steps.map((_, i) => i));

	// Uncontrolled default is the full range; a bound/passed `value` wins.
	const current = $derived<[number, number]>(value ?? [0, maxIndex]);
	const startIndex = $derived(current[0]);
	const endIndex = $derived(current[1]);

	/** Position of stop `i` as a percentage of the track width. */
	function percent(i: number): number {
		return maxIndex === 0 ? 0 : (i / maxIndex) * 100;
	}

	/** A stop is a selected endpoint when a thumb sits on it. */
	function isEndpoint(i: number): boolean {
		return i === startIndex || i === endIndex;
	}

	function onSliderChange(next: number | number[]) {
		const arr = Array.isArray(next) ? next : [next, next];
		const result: [number, number] = [arr[0], arr[1]];
		value = result;
		onValueChange?.(result);
	}
</script>

<div
	bind:this={ref}
	data-slot="stepped-range"
	aria-disabled={disabled ? 'true' : undefined}
	class={cn('w-full', className)}
	{...restProps}
>
	{#if title || subtitle}
		<div class={cn('flex flex-col gap-0.5', spec.titleMb)}>
			{#if title}
				<span
					data-slot="stepped-range-title"
					class={cn('font-semibold text-foreground', spec.title)}
				>
					{title}
				</span>
			{/if}
			{#if subtitle}
				<span data-slot="stepped-range-subtitle" class={cn('text-muted-foreground', spec.subtitle)}>
					{subtitle}
				</span>
			{/if}
		</div>
	{/if}

	<!-- Track + discrete tick marks. The slider is vertically centred in the row
	     and the ticks overlay is centred on the same baseline, so notches sit on
	     the track line. Ticks at the two selected endpoints are omitted because a
	     white thumb already sits there. -->
	<div class={cn('relative flex items-center', spec.sliderArea)}>
		<Slider
			value={current}
			min={0}
			max={maxIndex}
			step={1}
			{disabled}
			trackClass={cn('bg-muted-foreground/20', spec.track)}
			rangeClass="bg-foreground"
			thumbClass={cn(
				'border-input bg-card shadow-sm transition-[border-color,box-shadow] focus-visible:border-2 focus-visible:border-foreground focus-visible:ring-0 data-[dragging=true]:border-2 data-[dragging=true]:border-foreground data-[dragging=true]:shadow-md',
				spec.thumb
			)}
			formatValue={(stop) => steps[stop] ?? String(stop)}
			onValueChange={onSliderChange}
			aria-label={ariaLabel ?? title ?? 'Range'}
		/>

		<div aria-hidden="true" class="pointer-events-none absolute inset-0 flex items-center">
			{#each stopIndices as i (i)}
				{#if !isEndpoint(i)}
					<span
						data-slot="stepped-range-tick"
						class={cn(
							'absolute top-1/2 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/30',
							spec.tick,
							disabled && 'opacity-50'
						)}
						style={`left: ${percent(i)}%`}
					></span>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Per-stop labels. Edge labels are anchored to the track edges (left / right
	     aligned) so they cannot clip; interior labels are centred on their stop. -->
	<div class={cn('relative', spec.labelsMt, spec.labelsH)}>
		{#each steps as label, i (i)}
			<span
				data-slot="stepped-range-label"
				class={cn(
					'absolute top-0 whitespace-nowrap',
					spec.label,
					i === 0
						? 'text-left'
						: i === maxIndex
							? '-translate-x-full text-right'
							: '-translate-x-1/2 text-center',
					isEndpoint(i) ? 'font-medium text-foreground' : 'text-muted-foreground',
					disabled && 'opacity-50'
				)}
				style={`left: ${percent(i)}%`}
			>
				{label}
			</span>
		{/each}
	</div>
</div>
