<script lang="ts" module>
	export type ProgressSize = 'sm' | 'default' | 'lg';

	/** Track thickness. */
	const progressSizes: Record<ProgressSize, string> = {
		sm: 'h-1.5',
		default: 'h-2',
		lg: 'h-3'
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
		size = 'default',
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: number | null;
		max?: number;
		size?: ProgressSize;
	} = $props();

	const clamped = $derived(value == null ? null : Math.min(Math.max(value, 0), max));
	const percent = $derived(clamped == null ? null : (clamped / max) * 100);
</script>

<div
	bind:this={ref}
	data-slot="progress"
	role="progressbar"
	aria-valuemin={0}
	aria-valuemax={max}
	aria-valuenow={clamped ?? undefined}
	data-state={clamped == null ? 'indeterminate' : clamped >= max ? 'complete' : 'loading'}
	class={cn(
		'relative w-full overflow-hidden rounded-full bg-muted',
		progressSizes[size],
		className
	)}
	{...restProps}
>
	<div
		data-slot="progress-indicator"
		class="h-full w-full flex-1 bg-primary transition-transform"
		style={`transform: translateX(-${100 - (percent ?? 0)}%)`}
	></div>
</div>
