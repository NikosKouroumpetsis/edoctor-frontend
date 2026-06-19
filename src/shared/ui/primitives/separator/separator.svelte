<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		orientation = 'horizontal',
		decorative = true,
		'data-slot': dataSlot = 'separator',
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		orientation?: 'horizontal' | 'vertical';
		decorative?: boolean;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot={dataSlot}
	role={decorative ? 'none' : 'separator'}
	aria-orientation={!decorative && orientation === 'vertical' ? 'vertical' : undefined}
	data-orientation={orientation}
	class={cn(
		'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:min-h-full data-[orientation=vertical]:w-px',
		className
	)}
	{...restProps}
></div>
