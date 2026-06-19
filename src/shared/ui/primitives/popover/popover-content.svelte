<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { scale } from 'svelte/transition';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { portal, dismissable, floating, type Placement } from '$shared/lib/headless';
	import { getPopoverContext } from './popover.svelte';

	let {
		ref = $bindable(null),
		class: className,
		placement = 'bottom',
		sideOffset = 8,
		align = 'center',
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		placement?: 'top' | 'bottom' | 'left' | 'right';
		sideOffset?: number;
		align?: 'start' | 'center' | 'end';
	} = $props();

	const ctx = getPopoverContext();
	const resolvedPlacement = $derived(`${placement}-${align}` as Placement);

	// Move focus into the popover when it opens.
	function autofocus(node: HTMLElement) {
		node.focus({ preventScroll: true });
	}
</script>

{#if ctx.open}
	<div
		bind:this={ref}
		use:portal
		role="dialog"
		id={ctx.contentId}
		data-slot="popover-content"
		data-state="open"
		tabindex={-1}
		use:floating={{
			reference: ctx.triggerEl,
			placement: resolvedPlacement,
			sideOffset
		}}
		use:dismissable={{
			onDismiss: () => ctx.setOpen(false),
			ignore: [ctx.triggerEl]
		}}
		use:autofocus
		transition:scale={{ start: 0.95, duration: 120 }}
		class={cn(
			'z-50 w-72 rounded-control border border-border bg-popover p-4 text-popover-foreground shadow-overlay outline-none',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
