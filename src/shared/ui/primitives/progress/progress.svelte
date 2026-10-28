<script lang="ts" module>
	/** The application's two thicknesses (U-07.1): `md` (10) by default, `sm` (6) for the reviews' bars. */
	export type ProgressSize = 'sm' | 'md';
	/** The bar's colour (the application's `tone`): `accent` is the reviews' distribution (M-16). */
	export type ProgressTone = 'primary' | 'accent' | 'success' | 'warning' | 'danger';

	/** Track thickness, the application's `sizeClassNames`. */
	const progressSizes: Record<ProgressSize, string> = {
		sm: 'h-1.5',
		md: 'h-2.5'
	};

	/** The application's indicator colours, name for name (`atoms/progress`). */
	export const progressTones: Record<ProgressTone, string> = {
		primary: 'bg-primary',
		accent: 'bg-accent',
		success: 'bg-success',
		warning: 'bg-warning',
		danger: 'bg-danger'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		value = 0,
		max = 100,
		size = 'md',
		tone = 'primary',
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: number;
		max?: number;
		size?: ProgressSize;
		tone?: ProgressTone;
	} = $props();

	const clamped = $derived(Math.min(Math.max(Number.isNaN(value) ? 0 : value, 0), max));
	const percent = $derived(max > 0 ? (clamped / max) * 100 : 0);
</script>

<div
	bind:this={ref}
	data-slot="progress"
	role="progressbar"
	aria-valuemin={0}
	aria-valuemax={max}
	aria-valuenow={clamped}
	data-state={clamped >= max ? 'complete' : 'loading'}
	class={cn(
		'relative w-full overflow-hidden rounded-full bg-muted',
		progressSizes[size],
		className
	)}
	{...restProps}
>
	<!-- A pill as long as the track, slid back: its round end is the bar's end (the application's `rounded-full`). -->
	<div
		data-slot="progress-indicator"
		class={cn('h-full w-full flex-1 rounded-full transition-transform', progressTones[tone])}
		style={`transform: translateX(-${100 - percent}%)`}
	></div>
</div>
