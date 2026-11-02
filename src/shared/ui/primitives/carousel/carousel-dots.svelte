<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { getCarouselContext } from './carousel.svelte';

	let {
		dotLabel,
		class: className
	}: {
		/** The accessible name of the dot of slide `index` (0-based), already localized by the caller. */
		dotLabel: (index: number) => string;
		class?: string;
	} = $props();

	const ctx = getCarouselContext();
</script>

<div
	data-slot="carousel-dots"
	class={cn('mt-1 flex flex-wrap justify-center gap-touch-gap', className)}
>
	{#each Array.from({ length: ctx.count }, (_, i) => i) as i (i)}
		<button
			type="button"
			aria-label={dotLabel(i)}
			aria-current={ctx.index === i}
			onclick={() => ctx.scrollTo(i)}
			class="group grid size-touch place-items-center rounded-full outline-none"
		>
			<span
				class={cn(
					'size-2 rounded-full transition-colors duration-standard ease-standard group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
					// U-28.4: with a pointer, a dot not shown darkens on hover.
					ctx.index === i
						? 'bg-primary'
						: 'bg-muted-foreground/30 can-hover:group-hover:bg-muted-foreground/60'
				)}
			></span>
		</button>
	{/each}
</div>
