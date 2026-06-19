<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { scale } from 'svelte/transition';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { portal, dismissable, floating, type Placement } from '$shared/lib/headless';
	import { getHoverCardContext } from './hover-card.svelte';

	let {
		ref = $bindable(null),
		class: className,
		placement = 'bottom',
		align = 'center',
		sideOffset = 8,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		placement?: 'top' | 'bottom' | 'left' | 'right';
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
	} = $props();

	const ctx = getHoverCardContext();
	const resolvedPlacement = $derived(`${placement}-${align}` as Placement);
</script>

{#if ctx.open}
	<div
		bind:this={ref}
		use:portal
		role="dialog"
		id={ctx.contentId}
		data-slot="hover-card-content"
		data-state="open"
		use:floating={{ reference: ctx.triggerEl, placement: resolvedPlacement, sideOffset }}
		use:dismissable={{ onDismiss: () => ctx.close(), ignore: [ctx.triggerEl] }}
		onpointerenter={() => ctx.openWithDelay()}
		onpointerleave={() => ctx.close()}
		transition:scale={{ start: 0.95, duration: 120 }}
		class={cn(
			'z-50 w-64 rounded-control border border-border bg-popover p-4 text-popover-foreground shadow-overlay outline-none',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
