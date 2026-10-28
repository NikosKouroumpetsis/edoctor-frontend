<script lang="ts" module>
	export type SliderSize = 'sm' | 'default' | 'lg';

	/** Range-fill / thumb-border colour. `primary` is the default; `accent`
	 * repaints the selected range and thumb borders with the accent token (used
	 * by the range-histogram molecule). Additive and backward-compatible. */
	export type SliderTone = 'primary' | 'accent';

	/** Track thickness and thumb diameter scale together; each thumb sits in a touch-sized button. */
	const sliderTrackSizes: Record<SliderSize, string> = {
		sm: 'h-1',
		default: 'h-1.5',
		lg: 'h-2'
	};
	const sliderThumbSizes: Record<SliderSize, string> = {
		sm: 'size-3',
		default: 'size-4',
		lg: 'size-5'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		disabled = false,
		size = 'default',
		tone = 'primary',
		trackClass,
		rangeClass,
		thumbClass,
		formatValue = String,
		class: className,
		onValueChange,
		'aria-label': ariaLabel,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: number | number[];
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		size?: SliderSize;
		tone?: SliderTone;
		/** Extra classes merged onto the track / selected-range / thumb elements
		 * (they win over the defaults via tailwind-merge) for higher-fidelity
		 * variants such as the range-histogram. */
		trackClass?: string;
		rangeClass?: string;
		thumbClass?: string;
		/** 🔴 S-26.9: each thumb's `aria-valuetext`, the value as the screen shows it (`€420+`, a stop's
		 * label); the plain number by default, never left to a percentage reading. */
		formatValue?: (value: number, thumbIndex: number) => string;
		onValueChange?: (value: number | number[]) => void;
	} = $props();

	const rangeToneClass = $derived(tone === 'accent' ? 'bg-accent' : 'bg-primary');
	const thumbToneClass = $derived(tone === 'accent' ? 'border-accent' : 'border-primary');

	const isRange = $derived(Array.isArray(value));
	const thumbs = $derived(Array.isArray(value) ? value : [value]);

	let trackEl = $state<HTMLDivElement | null>(null);
	let activeThumb = $state<number | null>(null);

	function clampToStep(raw: number): number {
		const stepped = Math.round((raw - min) / step) * step + min;
		return Math.min(max, Math.max(min, Number(stepped.toFixed(10))));
	}

	function percent(v: number): number {
		return ((v - min) / (max - min)) * 100;
	}

	function commit(index: number, next: number) {
		const others = thumbs.slice();
		// Keep thumbs from crossing their neighbours.
		const lower = index > 0 ? others[index - 1] : min;
		const upper = index < others.length - 1 ? others[index + 1] : max;
		others[index] = Math.min(Math.max(clampToStep(next), lower), upper);
		const result = Array.isArray(value) ? others : others[0];
		value = result;
		onValueChange?.(result);
	}

	function valueFromPointer(clientX: number): number {
		if (!trackEl) return min;
		const rect = trackEl.getBoundingClientRect();
		const ratio = rect.width === 0 ? 0 : (clientX - rect.left) / rect.width;
		return min + ratio * (max - min);
	}

	function closestThumb(target: number): number {
		let best = 0;
		let bestDist = Infinity;
		thumbs.forEach((t, i) => {
			const d = Math.abs(t - target);
			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		});
		return best;
	}

	function onTrackPointerDown(event: PointerEvent) {
		if (disabled) return;
		const target = valueFromPointer(event.clientX);
		const index = closestThumb(target);
		activeThumb = index;
		commit(index, target);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	// Only the visible dot grabs the handle and drags it without jumping the value; the rest
	// of its touch-sized box behaves exactly like the track beneath it. The dot takes the focus (Safari and
	// Firefox on macOS give none to a pressed button), so the arrows move it after a drag; the press is not
	// cancelled (U-06.10). A scripted focus matches `:focus-visible` in Chrome even after a pointer, so
	// `focusVisible: false` keeps the ring, drawn only there, for the keyboard: a click or a drag draws none.
	function onThumbPointerDown(event: PointerEvent, index: number) {
		if (disabled) return;
		if (!(event.target as HTMLElement).closest('[data-slot="slider-thumb-dot"]')) {
			onTrackPointerDown(event);
			return;
		}
		(event.currentTarget as HTMLElement).focus({ preventScroll: true, focusVisible: false });
		activeThumb = index;
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	function onPointerMove(event: PointerEvent) {
		if (activeThumb == null) return;
		commit(activeThumb, valueFromPointer(event.clientX));
	}

	function onPointerUp() {
		activeThumb = null;
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
	}

	function onThumbKeydown(event: KeyboardEvent, index: number) {
		if (disabled) return;
		const big = (max - min) / 10;
		let next: number;
		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				next = thumbs[index] + step;
				break;
			case 'ArrowLeft':
			case 'ArrowDown':
				next = thumbs[index] - step;
				break;
			case 'PageUp':
				next = thumbs[index] + big;
				break;
			case 'PageDown':
				next = thumbs[index] - big;
				break;
			case 'Home':
				next = min;
				break;
			case 'End':
				next = max;
				break;
			default:
				return;
		}
		event.preventDefault();
		commit(index, next);
	}

	const rangeStart = $derived(isRange ? percent(Math.min(...thumbs)) : 0);
	const rangeEnd = $derived(isRange ? percent(Math.max(...thumbs)) : percent(thumbs[0]));
</script>

<div
	bind:this={ref}
	data-slot="slider"
	data-disabled={disabled ? '' : undefined}
	class={cn(
		'relative flex min-h-touch w-full touch-none items-center select-none',
		disabled && 'opacity-50',
		className
	)}
	{...restProps}
>
	<!-- The rail is inset by half the 48 touch box (`mx-6`), so a thumb at either end stays inside the slider's
	     box (U-06.2): its dot and its touch box. The thumbs are placed on the rail, the track spans it. -->
	<div data-slot="slider-rail" class="relative mx-6 flex min-w-0 flex-1 items-center self-stretch">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- Track is a pointer convenience; keyboard access is on the slider thumbs below. -->
		<div
			bind:this={trackEl}
			data-slot="slider-track"
			onpointerdown={onTrackPointerDown}
			class={cn(
				'relative w-full grow rounded-full bg-muted [-webkit-tap-highlight-color:transparent]',
				sliderTrackSizes[size],
				trackClass
			)}
		>
			<div
				data-slot="slider-range"
				class={cn('absolute h-full rounded-full', rangeToneClass, rangeClass)}
				style={`left: ${rangeStart}%; width: ${rangeEnd - rangeStart}%`}
			></div>
		</div>

		{#each thumbs as thumb, index (index)}
			<button
				type="button"
				role="slider"
				data-slot="slider-thumb"
				data-dragging={activeThumb === index ? 'true' : undefined}
				aria-label={ariaLabel}
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={thumb}
				aria-valuetext={formatValue(thumb, index)}
				aria-orientation="horizontal"
				{disabled}
				tabindex={disabled ? -1 : 0}
				onpointerdown={(e) => onThumbPointerDown(e, index)}
				onkeydown={(e) => onThumbKeydown(e, index)}
				style={`left: ${percent(thumb)}%`}
				class="group absolute grid size-touch -translate-x-1/2 cursor-grab touch-none place-items-center rounded-full outline-none [-webkit-tap-highlight-color:transparent] active:cursor-grabbing disabled:pointer-events-none disabled:cursor-not-allowed"
			>
				<span
					data-slot="slider-thumb-dot"
					data-dragging={activeThumb === index ? 'true' : undefined}
					class={cn(
						'rounded-full border bg-card shadow-raised transition-[color,box-shadow] group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
						thumbToneClass,
						sliderThumbSizes[size],
						thumbClass
					)}
				></span>
			</button>
		{/each}
	</div>
</div>
