<script lang="ts" module>
	export type SliderSize = 'sm' | 'default' | 'lg';

	/** Track thickness and thumb diameter scale together. */
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
		onValueChange?: (value: number | number[]) => void;
	} = $props();

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
		'relative flex w-full touch-none items-center select-none',
		disabled && 'opacity-50',
		className
	)}
	{...restProps}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- Track is a pointer convenience; keyboard access is on the slider thumbs below. -->
	<div
		bind:this={trackEl}
		data-slot="slider-track"
		onpointerdown={onTrackPointerDown}
		class={cn('relative w-full grow rounded-full bg-muted', sliderTrackSizes[size])}
	>
		<div
			data-slot="slider-range"
			class="absolute h-full rounded-full bg-primary"
			style={`left: ${rangeStart}%; width: ${rangeEnd - rangeStart}%`}
		></div>
	</div>

	{#each thumbs as thumb, index (index)}
		<button
			type="button"
			role="slider"
			data-slot="slider-thumb"
			aria-label={ariaLabel}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={thumb}
			aria-orientation="horizontal"
			{disabled}
			tabindex={disabled ? -1 : 0}
			onkeydown={(e) => onThumbKeydown(e, index)}
			style={`left: ${percent(thumb)}%`}
			class={cn(
				'absolute -translate-x-1/2 rounded-full border border-primary bg-card shadow-sm transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none',
				sliderThumbSizes[size]
			)}
		></button>
	{/each}
</div>
