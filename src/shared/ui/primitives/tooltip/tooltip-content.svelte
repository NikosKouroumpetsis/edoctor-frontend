<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { step } from '$shared/design/tokens';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { portal, floating, Presence, type Placement } from '$shared/lib/headless';
	import { getTooltipContext } from './tooltip.svelte';

	let {
		ref = $bindable(null),
		class: className,
		placement = 'top',
		sideOffset = step(1.5),
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		placement?: 'top' | 'bottom' | 'left' | 'right';
		sideOffset?: number;
	} = $props();

	const ctx = getTooltipContext();
	// In the DOM until its CSS leave ends (U-12.2): it grows from 90 % as it fades in, and back out.
	const presence = new Presence(() => ctx.open, { duration: 'standard' });
</script>

{#if presence.present}
	<div
		bind:this={ref}
		use:portal
		use:presence.track
		role="tooltip"
		id={ctx.contentId}
		data-slot="tooltip-content"
		data-state={presence.state}
		inert={presence.closing}
		use:floating={{ reference: ctx.triggerEl, placement: placement as Placement, sideOffset }}
		class={cn(
			'z-50 w-fit rounded-md bg-primary px-3 py-1.5 text-label-md text-primary-foreground shadow-overlay',
			'transition-[opacity,scale] duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:scale-90 data-[state=closed]:opacity-0 starting:scale-90 starting:opacity-0',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
