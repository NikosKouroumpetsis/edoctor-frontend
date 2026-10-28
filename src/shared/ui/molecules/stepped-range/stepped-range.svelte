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
	import { pickStepLabels } from './pick-step-labels';

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

	// Step labels without overlap (U-06.10): every label is measured (`bind:clientWidth`, a ResizeObserver), the
	// row is the track's width, and `pickStepLabels` says which ones show and where. Until measured, none shows.
	let trackWidth = $state(0);
	let labelWidths = $state<number[]>([]);
	let mergedWidth = $state(0);
	const selected = $derived(startIndex === endIndex ? [startIndex] : [startIndex, endIndex]);
	const mergedText = $derived(`${steps[startIndex] ?? ''} – ${steps[endIndex] ?? ''}`);
	const measured = $derived(
		trackWidth > 0 && steps.every((_, index) => (labelWidths[index] ?? 0) > 0) && mergedWidth > 0
	);
	const placements = $derived(
		measured
			? pickStepLabels({
					centers: steps.map((_, index) => (percent(index) / 100) * trackWidth),
					widths: steps.map((_, index) => labelWidths[index] ?? 0),
					trackWidth,
					selected,
					mergedWidth
				})
			: []
	);
	const shownAt = $derived(
		new Map(
			placements
				.filter((place) => place.mergedWith === undefined)
				.map((place) => [place.index, place.x] as const)
		)
	);
	const merged = $derived(placements.find((place) => place.mergedWith !== undefined));

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
				'border-input bg-card shadow-raised transition-[border-color,box-shadow] data-[dragging=true]:border-2 data-[dragging=true]:border-foreground data-[dragging=true]:shadow-overlay',
				spec.thumb
			)}
			formatValue={(stop) => steps[stop] ?? String(stop)}
			onValueChange={onSliderChange}
			aria-label={ariaLabel ?? title}
		/>

		<!-- On the slider's rail: inset by half the touch box, as the track (U-06.2). -->
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-x-6 inset-y-0 flex items-center"
		>
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

	<!-- Per-stop labels on the track's width: the first aligned left, the last right, the rest centred on their tick;
	     only those `pickStepLabels` places show (the others stay measured, invisible). -->
	<div
		data-slot="stepped-range-labels"
		class={cn('relative mx-6', spec.labelsMt, spec.labelsH)}
		bind:clientWidth={trackWidth}
	>
		{#each steps as label, i (i)}
			{@const x = shownAt.get(i)}
			<span
				data-slot="stepped-range-label"
				data-shown={x === undefined ? undefined : ''}
				class={cn(
					'absolute top-0 left-0 whitespace-nowrap',
					spec.label,
					isEndpoint(i) ? 'font-medium text-foreground' : 'text-muted-foreground',
					x === undefined && 'invisible',
					disabled && 'opacity-50'
				)}
				style:transform={x === undefined ? undefined : `translateX(${x}px)`}
				bind:clientWidth={labelWidths[i]}
			>
				{label}
			</span>
		{/each}
		<span
			data-slot="stepped-range-merged-label"
			data-shown={merged ? '' : undefined}
			aria-hidden={merged ? undefined : 'true'}
			class={cn(
				'absolute top-0 left-0 font-medium whitespace-nowrap text-foreground',
				spec.label,
				!merged && 'invisible',
				disabled && 'opacity-50'
			)}
			style:transform={merged ? `translateX(${merged.x}px)` : undefined}
			bind:clientWidth={mergedWidth}
		>
			{mergedText}
		</span>
	</div>
</div>
