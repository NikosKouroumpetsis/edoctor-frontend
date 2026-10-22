<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import ChevronRightIcon from '~icons/lucide/chevron-right';
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
	aria-label="Next slide"
	data-slot="carousel-next"
	disabled={!ctx.canNext}
	onclick={() => ctx.scrollNext()}
	class={cn(
		'group inline-flex size-touch items-center justify-center rounded-full outline-none disabled:pointer-events-none disabled:opacity-40',
		className
	)}
	{...restProps}
>
	<span
		class="inline-flex size-control-sm items-center justify-center rounded-full border border-border bg-card shadow-xs group-hover:bg-muted group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
	>
		<ChevronRightIcon class="size-4" />
	</span>
</button>
