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

	const sizeConfig: Record<RangeHistogramSize, SizeSpec> = {
		sm: {
			histogram: 'h-histogram-sm',
			barGap: 'gap-0.5',
			track: 'h-0.5',
			thumb: 'size-6',
			pill: 'min-h-control-md px-4 text-body-lg',
			field: 'w-2/5',
			title: 'text-body-lg',
			subtitle: 'text-label-md font-normal',
			label: 'text-label-md font-normal',
			titleMb: 'mb-4',
			inputsMt: 'mt-6'
		},
		default: {
			histogram: 'h-histogram-md',
			barGap: 'gap-1',
			track: 'h-0.5',
			thumb: 'size-control-xs',
			pill: 'min-h-control-lg px-5 text-body-lg',
			field: 'w-2/5',
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
			thumb: 'size-control-sm',
			pill: 'min-h-control-xl px-6 text-title-sm font-normal',
			field: 'w-2/5',
			title: 'text-title-lg',
			subtitle: 'text-body-lg',
			label: 'text-body-lg',
			titleMb: 'mb-6',
			inputsMt: 'mt-section'
		}
	};

	/**
	 * Brand pink from the reference mockups (Airbnb-style price filter). A
	 * deliberate one-off kept close to this feature — brand accents are constant
	 * across light/dark, so it is not routed through a semantic theme token.
	 */
	const ACTIVE_FILL = 'bg-[#e31c5f]';
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';
	import { Slider } from '$shared/ui/primitives/slider';

	let {
		ref = $bindable(null),
		value = $bindable<[number, number]>([0, 100]),
		data = [],
		min = 0,
		max = 100,
		step = 1,
		size = 'default',
		disabled = false,
		title,
		subtitle,
		minLabel = 'Min',
		maxLabel = 'Max',
		currencyPrefix = '€',
		showPlusAtMax = true,
		formatValue,
		class: className,
		'aria-label': ariaLabel,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		/** Selected `[min, max]` range; two-way bound, clamped and non-crossing. */
		value?: [number, number];
		/** Histogram magnitudes; rendered as evenly-spaced bars. */
		data?: number[];
		min?: number;
		max?: number;
		step?: number;
		size?: RangeHistogramSize;
		disabled?: boolean;
		title?: string;
		subtitle?: string;
		minLabel?: string;
		maxLabel?: string;
		/** Leading currency symbol for the default `formatValue`. */
		currencyPrefix?: string;
		/** Append `+` when the max value sits at the ceiling (default formatter). */
		showPlusAtMax?: boolean;
		/** Format a value for the resting input display; `atCeiling` is true for the
		 * max field when its value equals `max`. Defaults to `€{value}` / `€{value}+`. */
		formatValue?: (value: number, atCeiling: boolean) => string;
	} = $props();

	const spec = $derived(sizeConfig[size]);

	const minValue = $derived(value[0]);
	const maxValue = $derived(value[1]);
	const maxAtCeiling = $derived(maxValue >= max);

	const format = $derived(
		formatValue ??
			((v: number, atCeiling: boolean) =>
				`${currencyPrefix}${v}${atCeiling && showPlusAtMax ? '+' : ''}`)
	);

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

	const minDisplay = $derived(minFocused ? minBuffer : format(minValue, false));
	const maxDisplay = $derived(maxFocused ? maxBuffer : format(maxValue, maxAtCeiling));

	// Pill-shaped field (label above, centred value, currency prefix) — matches
	// the reference mockup; on-pattern focus indicator via `focus-visible:border-ring`.
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
		value = [Math.min(Math.max(snap(parsed), min), maxValue), maxValue];
	}

	function commitMax(buffer: string) {
		const parsed = Number.parseInt(buffer, 10);
		if (Number.isNaN(parsed)) return;
		// Non-crossing: the max cannot fall below the current min.
		value = [minValue, Math.max(Math.min(snap(parsed), max), minValue)];
	}

	function onSliderChange(next: number | number[]) {
		const arr = Array.isArray(next) ? next : [next, next];
		value = [arr[0], arr[1]];
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

	<!-- Histogram + slider group. The group's bottom edge is the track baseline:
	     bars grow up from it and the slider is vertically centred on it, so the
	     handles straddle the line exactly as in the mockup. -->
	<div class={cn('relative', spec.histogram)}>
		<div
			aria-hidden="true"
			class={cn(
				'pointer-events-none absolute inset-0 flex items-end',
				spec.barGap,
				disabled && 'opacity-50'
			)}
		>
			{#each data as magnitude, i (i)}
				<div
					data-slot="range-histogram-bar"
					data-active={isActive(i) ? '' : undefined}
					class={cn(
						'min-h-0.5 flex-1 rounded-t-sm',
						isActive(i) ? ACTIVE_FILL : 'bg-muted-foreground/25'
					)}
					style={`height: ${barHeight(magnitude)}%`}
				></div>
			{/each}
		</div>

		<div class="absolute inset-x-0 bottom-0 translate-y-1/2">
			<Slider
				{value}
				{min}
				{max}
				{step}
				{disabled}
				trackClass={cn('bg-muted-foreground/20', spec.track)}
				rangeClass={ACTIVE_FILL}
				thumbClass={cn(
					'border-neutral-300 bg-white shadow-md transition-[border-color,box-shadow] data-[dragging=true]:border-2 data-[dragging=true]:border-[#e31c5f] data-[dragging=true]:shadow-lg',
					spec.thumb
				)}
				formatValue={(thumbValue, thumbIndex) =>
					format(thumbValue, thumbIndex === 1 && thumbValue >= max)}
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
