<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getPopoverContext } from './popover.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		onclick,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> = $props();

	const ctx = getPopoverContext();

	$effect(() => {
		ctx.setTriggerEl(ref);
	});
</script>

<button
	bind:this={ref}
	type="button"
	aria-haspopup="dialog"
	aria-expanded={ctx.open}
	aria-controls={ctx.contentId}
	data-slot="popover-trigger"
	data-state={ctx.open ? 'open' : 'closed'}
	onclick={(e) => {
		onclick?.(e);
		ctx.setOpen(!ctx.open);
	}}
	class={cn(className)}
	{...restProps}
>
	{@render children?.()}
</button>
