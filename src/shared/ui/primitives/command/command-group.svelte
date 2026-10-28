<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { onMount } from 'svelte';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';
	import { getCommandContext, setCommandGroupContext } from './command.svelte';

	let {
		ref = $bindable(null),
		class: className,
		heading,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { heading?: string } = $props();

	const ctx = getCommandContext();
	const id = useId(undefined, 'command-group');
	setCommandGroupContext({ id });
	const groupView = $derived(ctx.groupState(id));

	onMount(() => {
		ctx.registerGroup(id);
		return () => ctx.unregisterGroup(id);
	});
</script>

<!--
	The application's group: hidden while none of its items matches (its items stay mounted, so they come back), and
	a 1px line above every shown group after the first (`bg-border mb-1 h-px`).
-->
<div
	bind:this={ref}
	{id}
	role="group"
	aria-labelledby={heading ? `${id}-heading` : undefined}
	data-slot="command-group"
	hidden={groupView.hidden ? true : undefined}
	class={cn('overflow-hidden p-1', className)}
	{...restProps}
>
	{#if groupView.separated}
		<div data-slot="command-separator" aria-hidden="true" class="mb-1 h-px bg-border"></div>
	{/if}
	{#if heading}
		<div id={`${id}-heading`} class="px-2 py-1.5 text-label-md text-muted-foreground">
			{heading}
		</div>
	{/if}
	{@render children?.()}
</div>
