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

<!-- The slides' cell of the carousel's grid (the arrows sit in it too); the track moves on the standard motion, whatever
     the device's motion setting (U-12.1). -->
<div data-slot="carousel-viewport" class="col-start-1 row-start-1 min-w-0 overflow-hidden">
	<div
		bind:this={ref}
		data-slot="carousel-content"
		style={`transform: translateX(-${ctx.index * 100}%)`}
		class={cn('flex transition-transform duration-standard ease-standard', className)}
		{...restProps}
	>
		{@render children?.()}
	</div>
</div>
