<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getDropdownMenuContext } from './dropdown-menu.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		onclick,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> = $props();

	const ctx = getDropdownMenuContext();

	$effect(() => {
		ctx.setTriggerEl(ref);
	});

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			ctx.setOpen(true);
		}
	}
</script>

<button
	bind:this={ref}
	type="button"
	id={ctx.triggerId}
	aria-haspopup="menu"
	aria-expanded={ctx.open}
	aria-controls={ctx.contentId}
	data-slot="dropdown-menu-trigger"
	data-state={ctx.open ? 'open' : 'closed'}
	onclick={(e) => {
		onclick?.(e);
		ctx.setOpen(!ctx.open);
	}}
	{onkeydown}
	class={cn(className)}
	{...restProps}
>
	{@render children?.()}
</button>
