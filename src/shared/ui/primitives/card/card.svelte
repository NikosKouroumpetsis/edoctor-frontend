<script lang="ts" module>
	export type CardSize = 'sm' | 'default' | 'lg';

	/** Vertical padding + section gap on the card root. */
	const cardSizes: Record<CardSize, string> = {
		sm: 'gap-4 py-4',
		default: 'gap-6 py-6',
		lg: 'gap-8 py-8'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		size = 'default',
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { size?: CardSize } = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		'flex flex-col rounded-panel border border-border bg-card text-card-foreground shadow-raised',
		cardSizes[size],
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
