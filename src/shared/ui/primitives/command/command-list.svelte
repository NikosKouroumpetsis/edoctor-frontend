<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getCommandContext } from './command.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

	const ctx = getCommandContext();
</script>

<div
	bind:this={ref}
	role="listbox"
	id={ctx.listId}
	data-slot="command-list"
	class={cn('max-h-72 overflow-x-hidden overflow-y-auto p-1', className)}
	{...restProps}
>
	{@render children?.()}
</div>
