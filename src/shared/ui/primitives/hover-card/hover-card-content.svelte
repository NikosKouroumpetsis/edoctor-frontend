<script lang="ts" module>
	export type HoverCardSize = 'sm' | 'default' | 'lg';

	/** Panel width. */
	const hoverCardSizes: Record<HoverCardSize, string> = {
		sm: 'w-48',
		default: 'w-64',
		lg: 'w-72'
	};
</script>

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
		size = 'default',
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		placement?: 'top' | 'bottom' | 'left' | 'right';
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
		size?: HoverCardSize;
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
			'z-50 rounded-control border border-border bg-popover p-4 text-popover-foreground shadow-overlay outline-none',
			hoverCardSizes[size],
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
