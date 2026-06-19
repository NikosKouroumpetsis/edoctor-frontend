<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import ChevronLeftIcon from '~icons/lucide/chevron-left';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getCarouselContext } from './carousel.svelte';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> = $props();

	const ctx = getCarouselContext();
</script>

<button
	bind:this={ref}
	type="button"
	aria-label="Previous slide"
	data-slot="carousel-previous"
	disabled={!ctx.canPrev}
	onclick={() => ctx.scrollPrev()}
	class={cn(
		'inline-flex size-9 items-center justify-center rounded-full border border-border bg-card shadow-xs hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40',
		className
	)}
	{...restProps}
>
	<ChevronLeftIcon class="size-4" />
</button>
