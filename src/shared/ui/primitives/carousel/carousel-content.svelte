<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getCarouselContext } from './carousel.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

	const ctx = getCarouselContext();
</script>

<div data-slot="carousel-viewport" class="overflow-hidden">
	<div
		bind:this={ref}
		data-slot="carousel-content"
		style={`transform: translateX(-${ctx.index * 100}%)`}
		class={cn('flex transition-transform duration-300 ease-out', className)}
		{...restProps}
	>
		{@render children?.()}
	</div>
</div>
