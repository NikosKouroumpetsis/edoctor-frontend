<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getTooltipContext } from './tooltip.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> = $props();

	const ctx = getTooltipContext();

	$effect(() => {
		ctx.setTriggerEl(ref);
	});
</script>

<button
	bind:this={ref}
	type="button"
	data-slot="tooltip-trigger"
	data-state={ctx.open ? 'open' : 'closed'}
	aria-describedby={ctx.open ? ctx.contentId : undefined}
	onpointerenter={() => ctx.openWithDelay()}
	onpointerleave={() => ctx.close()}
	onfocus={() => ctx.openWithDelay()}
	onblur={() => ctx.close()}
	class={cn(className)}
	{...restProps}
>
	{@render children?.()}
</button>
