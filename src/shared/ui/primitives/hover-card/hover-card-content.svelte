<script lang="ts" module>
	export type HoverCardSize = 'sm' | 'md' | 'lg';

	/** Panel width: 224 / the application's 256 (`hover-card-w`, its default) / 320 (R7-1, R7-2). */
	const hoverCardSizes: Record<HoverCardSize, string> = {
		sm: 'w-popover-sm',
		md: 'w-hover-card-w',
		lg: 'w-popover-lg'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { step } from '$shared/design/tokens';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { portal, dismissable, floating, Presence, type Placement } from '$shared/lib/headless';
	import { getHoverCardContext } from './hover-card.svelte';

	let {
		ref = $bindable(null),
		class: className,
		placement = 'bottom',
		align = 'center',
		sideOffset = step(2),
		size = 'md',
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		placement?: 'top' | 'bottom' | 'left' | 'right';
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
		size?: HoverCardSize;
	} = $props();

	const ctx = getHoverCardContext();
	// In the DOM until its CSS leave ends (U-12.2): it grows from 95 % as it fades in, and back out.
	const presence = new Presence(() => ctx.open, { duration: 'standard' });
	const resolvedPlacement = $derived(`${placement}-${align}` as Placement);
</script>

{#if presence.present}
	<div
		bind:this={ref}
		use:portal
		use:presence.track
		role="dialog"
		id={ctx.contentId}
		data-slot="hover-card-content"
		data-state={presence.state}
		inert={presence.closing}
		use:floating={{ reference: ctx.triggerEl, placement: resolvedPlacement, sideOffset }}
		use:dismissable={{
			enabled: presence.open,
			onDismiss: () => ctx.close(),
			ignore: [ctx.triggerEl]
		}}
		onpointerenter={() => ctx.openWithDelay()}
		onpointerleave={() => ctx.close()}
		class={cn(
			'z-50 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-overlay outline-none',
			'transition-[opacity,scale] duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:scale-95 data-[state=closed]:opacity-0 starting:scale-95 starting:opacity-0',
			hoverCardSizes[size],
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
