<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { onMount } from 'svelte';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';
	import { getCommandContext } from './command.svelte';

	let {
		ref = $bindable(null),
		value,
		class: className,
		onSelect,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value: string;
		onSelect?: (value: string) => void;
	} = $props();

	const ctx = getCommandContext();
	const id = useId(undefined, 'command-item');
	const visible = $derived(ctx.matches(value));
	const active = $derived(ctx.isActive(id));

	onMount(() => {
		ctx.registerItem({ id, value, onSelect: () => onSelect?.(value) });
		return () => ctx.unregisterItem(id);
	});
</script>

{#if visible}
	<div
		bind:this={ref}
		{id}
		role="option"
		aria-selected={active}
		data-slot="command-item"
		data-active={active ? '' : undefined}
		onclick={() => onSelect?.(value)}
		onpointermove={() => ctx.setActiveId(id)}
		class={cn(
			'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-body-sm outline-none select-none data-[active]:bg-accent/10',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
