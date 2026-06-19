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
	// Shown only when nothing matches the active query.
	const empty = $derived(ctx.activeId === undefined);
</script>

{#if empty}
	<div
		bind:this={ref}
		role="presentation"
		data-slot="command-empty"
		class={cn('py-6 text-center text-body-sm text-muted-foreground', className)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
