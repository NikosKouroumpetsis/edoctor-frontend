<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { carouselArrowClasses, getCarouselContext } from './carousel.svelte';

	let {
		ref = $bindable(null),
		label,
		class: className,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		/** The button's accessible name, already localized by the caller. */
		label: string;
	} = $props();

	const ctx = getCarouselContext();
	$effect(() => {
		ctx.setArrow('next', ref);
		return () => ctx.setArrow('next', null);
	});
</script>

<!-- Over the slides, at their side, centred on their height (U-09.3); gone at an end without `loop`. -->
<button
	bind:this={ref}
	type="button"
	aria-label={label}
	data-slot="carousel-next"
	disabled={!ctx.canNext}
	onclick={() => ctx.scrollNext()}
	class={cn(
		'z-10 col-start-1 row-start-1 mr-1 size-touch self-center justify-self-end',
		carouselArrowClasses.box,
		carouselArrowClasses.reveal,
		className
	)}
	{...restProps}
>
	<span class={carouselArrowClasses.shape}>
		<Ionicon name="chevron-forward" class={carouselArrowClasses.glyph} />
	</span>
</button>
