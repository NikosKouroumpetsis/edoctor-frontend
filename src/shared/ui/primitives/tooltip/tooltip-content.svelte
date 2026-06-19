<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { scale } from 'svelte/transition';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { portal, floating, type Placement } from '$shared/lib/headless';
	import { getTooltipContext } from './tooltip.svelte';

	let {
		ref = $bindable(null),
		class: className,
		placement = 'top',
		sideOffset = 6,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		placement?: 'top' | 'bottom' | 'left' | 'right';
		sideOffset?: number;
	} = $props();

	const ctx = getTooltipContext();
</script>

{#if ctx.open}
	<div
		bind:this={ref}
		use:portal
		role="tooltip"
		id={ctx.contentId}
		data-slot="tooltip-content"
		data-state="open"
		use:floating={{ reference: ctx.triggerEl, placement: placement as Placement, sideOffset }}
		transition:scale={{ start: 0.9, duration: 120 }}
		class={cn(
			'z-50 w-fit rounded-md bg-primary px-3 py-1.5 text-label-md text-primary-foreground shadow-overlay',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
