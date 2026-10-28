<script lang="ts" module>
	export type RangeHistogramSize = 'sm' | 'default' | 'lg';

	type SizeSpec = {
		/** Bar-area height (bars grow up from the track baseline). */
		histogram: string;
		/** Gap between histogram bars. */
		barGap: string;
		/** Slider track thickness override. */
		track: string;
		/** Slider thumb (handle) diameter override. */
		thumb: string;
		/** Pill input: height + horizontal padding + text size. */
		pill: string;
		/** Width of each min/max field column. */
		field: string;
		title: string;
		subtitle: string;
		label: string;
		/** Bottom margin under the title block. */
		titleMb: string;
		/** Top margin above the inputs row (also clears the slider-thumb overflow). */
		inputsMt: string;
	};

	// The application's `sizeConfig`, class for class; the web pill keeps the 48 touch box and 16 text at `sm`.
	const sizeConfig: Record<RangeHistogramSize, SizeSpec> = {
		sm: {
			histogram: 'h-histogram-sm',
			barGap: 'gap-0.5',
			track: 'h-0.5',
			thumb: 'size-6',
			pill: 'min-h-control-md px-4 text-body-lg',
			field: 'w-range-field-sm',
			title: 'text-body-lg',
			subtitle: 'text-label-md',
			label: 'text-label-md',
			titleMb: 'mb-4',
			inputsMt: 'mt-6'
		},
		default: {
			histogram: 'h-histogram-md',
			barGap: 'gap-1',
			track: 'h-0.5',
			thumb: 'size-6',
			pill: 'min-h-control-md px-5 text-body-lg',
			field: 'w-range-field-md',
			title: 'text-title-sm',
			subtitle: 'text-body-sm',
			label: 'text-body-sm',
			titleMb: 'mb-6',
			inputsMt: 'mt-section'
		},
		lg: {
			histogram: 'h-histogram-lg',
			barGap: 'gap-1.5',
			track: 'h-1',
			thumb: 'size-control-xs',
			pill: 'min-h-control-lg px-6 text-title-sm',
			field: 'w-range-field-lg',
			title: 'text-title-lg',
			subtitle: 'text-body-lg',
			label: 'text-body-lg',
			titleMb: 'mb-6',
			inputsMt: 'mt-section'
		}
	};

	/** The selected bars and range: the brand `accent`, as in the application's price filter. */
	const ACTIVE_FILL = 'bg-accent';
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';
	import { Slider } from '$shared/ui/primitives/slider';

	let {
		ref = $bindable(null),
		value = $bindable<[number, number]>([0, 100]),
		onChange,
		data = [],
		min = 0,
		max = 100,
		step = 1,
		size = 'default',
		disabled = false,
		title,
		subtitle,
		minLabel,
		maxLabel,
		formatValue,
		class: className,
		'aria-label': ariaLabel,
		...restProps
	}: WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'title'>> & {
		/** Selected `[min, max]` range; two-way bound, clamped and non-crossing. */
		value?: [number, number];
		/** The new range (the application's `onChange`). */
		onChange?: (value: [number, number]) => void;
		/** Histogram magnitudes; rendered as evenly-spaced bars. Without data: no bars and no height. */
		data?: number[];
		min?: number;
		max?: number;
		step?: number;
		size?: RangeHistogramSize;
		disabled?: boolean;
		title?: string;
		subtitle?: string;
		/** The captions of the two value pills, already localized by the caller. */
		minLabel: string;
		maxLabel: string;
		/**
		 * 🔴 U-03.11: the value as the pills and the thumbs show it, from the caller (no currency inside the kit):
		 * `atCeiling` is true for the max at `max` («420+ €»).
		 */
		formatValue: (value: number, atCeiling: boolean) => string;
	} = $props();

	const spec = $derived(sizeConfig[size]);
	const hasHistogram = $derived(data.length > 0);

	const minValue = $derived(value[0]);
	const maxValue = $derived(value[1]);
	const maxAtCeiling = $derived(maxValue >= max);

	function commit(next: [number, number]) {
		value = next;
		onChange?.(next);
	}
	// Histogram geometry ----------------------------------------------------
	const peak = $derived(data.length ? Math.max(...data, 0) : 0);

	function barHeight(magnitude: number): number {
		if (peak <= 0) return 0;
		return Math.max((magnitude / peak) * 100, 0);
	}

	/** Value at the centre of bucket `i` (buckets evenly split `[min, max]`). */
	function bucketCenter(i: number): number {
		return min + ((i + 0.5) * (max - min)) / data.length;
	}

	function isActive(i: number): boolean {
		const center = bucketCenter(i);
		return center >= minValue && center <= maxValue;
	}

	// Numeric inputs --------------------------------------------------------
	// Each field is a controlled input: it shows the formatted value at rest and
	// a raw editable buffer while focused, committing on blur/Enter. A raw
	// <input> is used so the numeric-only filter can correct the DOM
	// deterministically even when the sanitised value is unchanged.
	const minId = useId(undefined, 'range-min');
	const maxId = useId(undefined, 'range-max');

	let minBuffer = $state('');
	let maxBuffer = $state('');
	let minFocused = $state(false);
	let maxFocused = $state(false);

	const minDisplay = $derived(minFocused ? minBuffer : formatValue(minValue, false));
	const maxDisplay = $derived(maxFocused ? maxBuffer : formatValue(maxValue, maxAtCeiling));

	// The application's pill (label above, the value centred) with the web's border-colour focus.
	const pillClass = $derived(
		cn(
			'min-h-touch w-full rounded-full border border-input bg-card text-center font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50',
			spec.pill
		)
	);

	function sanitize(raw: string): string {
		return raw.replace(/[^0-9]/g, '');
	}

	/** Snap to `step` off `min` (keeps typed values consistent with the slider). */
	function snap(n: number): number {
		const stepped = Math.round((n - min) / step) * step + min;
		return Number(stepped.toFixed(10));
	}

	function commitMin(buffer: string) {
		const parsed = Number.parseInt(buffer, 10);
		if (Number.isNaN(parsed)) return;
		// Non-crossing: the min cannot exceed the current max.
		commit([Math.min(Math.max(snap(parsed), min), maxValue), maxValue]);
	}

	function commitMax(buffer: string) {
		const parsed = Number.parseInt(buffer, 10);
		if (Number.isNaN(parsed)) return;
		// Non-crossing: the max cannot fall below the current min.
		commit([minValue, Math.max(Math.min(snap(parsed), max), minValue)]);
	}

	function onSliderChange(next: number | number[]) {
		const arr = Array.isArray(next) ? next : [next, next];
		commit([arr[0], arr[1]]);
	}

	type InputEvt = Event & { currentTarget: HTMLInputElement };
	type KeyEvt = KeyboardEvent & { currentTarget: HTMLInputElement };

	function onMinInput(e: InputEvt) {
		const clean = sanitize(e.currentTarget.value);
		minBuffer = clean;
		e.currentTarget.value = clean; // reject non-digits deterministically
	}
	function onMaxInput(e: InputEvt) {
		const clean = sanitize(e.currentTarget.value);
		maxBuffer = clean;
		e.currentTarget.value = clean;
	}
	function commitOnEnter(e: KeyEvt) {
		if (e.key === 'Enter') e.currentTarget.blur();
	}
</script>

<div
	bind:this={ref}
	data-slot="range-histogram"
	aria-disabled={disabled ? 'true' : undefined}
	class={cn('w-full', className)}
	{...restProps}
>
	{#if title || subtitle}
		<div class={cn('flex flex-col gap-0.5', spec.titleMb)}>
			{#if title}
				<span
					data-slot="range-histogram-title"
					class={cn('font-semibold text-foreground', spec.title)}
				>
					{title}
				</span>
			{/if}
			{#if subtitle}
				<span
					data-slot="range-histogram-subtitle"
					class={cn('text-muted-foreground', spec.subtitle)}
				>
					{subtitle}
				</span>
			{/if}
		</div>
	{/if}

	<!-- The chart; its bars sit on the slider's rail (inset by half the touch box, U-06.2). With data its bottom edge is the track baseline: the bars grow up from it
	     and the slider straddles it; without data there are no bars and no reserved height (the application's). -->
	<div data-slot="range-histogram-chart" class={cn('relative', hasHistogram && spec.histogram)}>
		{#if hasHistogram}
			<div
				aria-hidden="true"
				class={cn(
					'pointer-events-none absolute inset-x-6 inset-y-0 flex flex-row items-end',
					spec.barGap,
					disabled && 'opacity-50'
				)}
			>
				{#each data as magnitude, i (i)}
					<div
						data-slot="range-histogram-bar"
						data-active={isActive(i) ? '' : undefined}
						class={cn(
							'min-h-0.5 flex-1 rounded-t-xs',
							isActive(i) ? ACTIVE_FILL : 'bg-muted-foreground/25'
						)}
						style={`height: ${barHeight(magnitude)}%`}
					></div>
				{/each}
			</div>
		{/if}

		<div
			data-slot="range-histogram-slider"
			class={cn(hasHistogram && 'absolute inset-x-0 bottom-0 translate-y-1/2')}
		>
			<Slider
				{value}
				{min}
				{max}
				{step}
				{disabled}
				tone="accent"
				trackClass={cn('bg-muted-foreground/20', spec.track)}
				thumbClass={cn(
					'border-input bg-card shadow-overlay transition-[border-color,box-shadow] data-[dragging=true]:border-2 data-[dragging=true]:border-accent',
					spec.thumb
				)}
				formatValue={(thumbValue, thumbIndex) =>
					formatValue(thumbValue, thumbIndex === 1 && thumbValue >= max)}
				onValueChange={onSliderChange}
				aria-label={ariaLabel ?? title ?? `${minLabel} / ${maxLabel}`}
			/>
		</div>
	</div>

	<div class={cn('flex items-start justify-between gap-4', spec.inputsMt)}>
		<div class={cn('flex flex-col gap-2', spec.field)}>
			<label for={minId} class={cn('text-center text-muted-foreground', spec.label)}
				>{minLabel}</label
			>
			<input
				id={minId}
				type="text"
				inputmode="numeric"
				{disabled}
				value={minDisplay}
				class={pillClass}
				data-slot="range-histogram-input"
				onfocus={() => {
					minFocused = true;
					minBuffer = String(minValue);
				}}
				oninput={onMinInput}
				onblur={() => {
					commitMin(minBuffer);
					minFocused = false;
				}}
				onkeydown={commitOnEnter}
			/>
		</div>

		<div class={cn('flex flex-col gap-2', spec.field)}>
			<label for={maxId} class={cn('text-center text-muted-foreground', spec.label)}
				>{maxLabel}</label
			>
			<input
				id={maxId}
				type="text"
				inputmode="numeric"
				{disabled}
				value={maxDisplay}
				class={pillClass}
				data-slot="range-histogram-input"
				onfocus={() => {
					maxFocused = true;
					maxBuffer = String(maxValue);
				}}
				oninput={onMaxInput}
				onblur={() => {
					commitMax(maxBuffer);
					maxFocused = false;
				}}
				onkeydown={commitOnEnter}
			/>
		</div>
	</div>
</div>
