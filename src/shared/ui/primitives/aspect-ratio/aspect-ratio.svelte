<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		ratio = 1,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { ratio?: number } = $props();
</script>

<div
	bind:this={ref}
	data-slot="aspect-ratio"
	style={`aspect-ratio: ${ratio};`}
	class={cn('relative w-full', className)}
	{...restProps}
>
	{@render children?.()}
</div>
