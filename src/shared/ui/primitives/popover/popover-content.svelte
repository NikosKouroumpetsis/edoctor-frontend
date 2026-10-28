<script lang="ts" module>
	export type PopoverSize = 'sm' | 'md' | 'lg';

	/** Panel width. */
	const popoverSizes: Record<PopoverSize, string> = {
		sm: 'w-popover-sm',
		md: 'w-popover-md',
		lg: 'w-popover-lg'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { step } from '$shared/design/tokens';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { portal, dismissable, floating, Presence, type Placement } from '$shared/lib/headless';
	import { getPopoverContext } from './popover.svelte';

	let {
		ref = $bindable(null),
		class: className,
		placement = 'bottom',
		sideOffset = step(2),
		align = 'center',
		size = 'md',
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		placement?: 'top' | 'bottom' | 'left' | 'right';
		sideOffset?: number;
		align?: 'start' | 'center' | 'end';
		size?: PopoverSize;
	} = $props();

	const ctx = getPopoverContext();
	// In the DOM until its CSS leave ends (U-12.2): it grows from 95 % as it fades in, and back out.
	const presence = new Presence(() => ctx.open, { duration: 'standard' });
	const resolvedPlacement = $derived(`${placement}-${align}` as Placement);

	// Move focus into the popover when it opens.
	function autofocus(node: HTMLElement) {
		node.focus({ preventScroll: true });
	}
</script>

{#if presence.present}
	<div
		bind:this={ref}
		use:portal
		use:presence.track
		role="dialog"
		id={ctx.contentId}
		data-slot="popover-content"
		data-state={presence.state}
		inert={presence.closing}
		tabindex={-1}
		use:floating={{
			reference: ctx.triggerEl,
			placement: resolvedPlacement,
			sideOffset
		}}
		use:dismissable={{
			enabled: presence.open,
			onDismiss: () => ctx.setOpen(false),
			// As the menu and the select: Escape gives the focus back to the trigger, so a modal under the popover
			// still holds it and takes the next Escape (NIT-R2-1).
			onEscapeKeydown: () => ctx.triggerEl?.focus({ preventScroll: true }),
			ignore: [ctx.triggerEl]
		}}
		use:autofocus
		class={cn(
			'z-50 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-overlay outline-none',
			'transition-[opacity,scale] duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:scale-95 data-[state=closed]:opacity-0 starting:scale-95 starting:opacity-0',
			popoverSizes[size],
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
