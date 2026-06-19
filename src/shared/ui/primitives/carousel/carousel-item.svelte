<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { onMount } from 'svelte';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getCarouselContext } from './carousel.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

	const ctx = getCarouselContext();
	onMount(() => ctx.register());
</script>

<div
	bind:this={ref}
	role="group"
	aria-roledescription="slide"
	data-slot="carousel-item"
	class={cn('min-w-0 shrink-0 grow-0 basis-full', className)}
	{...restProps}
>
	{@render children?.()}
</div>
