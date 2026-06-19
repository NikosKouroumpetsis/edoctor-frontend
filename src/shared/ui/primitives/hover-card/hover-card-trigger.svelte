<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getHoverCardContext } from './hover-card.svelte';

	let {
		ref = $bindable(null),
		href,
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAnchorAttributes> = $props();

	const ctx = getHoverCardContext();

	$effect(() => {
		ctx.setTriggerEl(ref);
	});
</script>

<svelte:element
	this={href ? 'a' : 'button'}
	bind:this={ref}
	{href}
	type={href ? undefined : 'button'}
	data-slot="hover-card-trigger"
	data-state={ctx.open ? 'open' : 'closed'}
	aria-expanded={ctx.open}
	aria-controls={ctx.contentId}
	onpointerenter={() => ctx.openWithDelay()}
	onpointerleave={() => ctx.close()}
	onfocus={() => ctx.openWithDelay()}
	onblur={() => ctx.close()}
	class={cn(className)}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
