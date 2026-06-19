<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		heading,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { heading?: string } = $props();
</script>

<div
	bind:this={ref}
	role="group"
	data-slot="command-group"
	class={cn('overflow-hidden p-1', className)}
	{...restProps}
>
	{#if heading}
		<div class="px-2 py-1.5 text-label-md text-muted-foreground">{heading}</div>
	{/if}
	{@render children?.()}
</div>
