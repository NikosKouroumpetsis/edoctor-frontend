<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { getCarouselContext } from './carousel.svelte';

	let { class: className }: { class?: string } = $props();

	const ctx = getCarouselContext();
</script>

<div data-slot="carousel-dots" class={cn('flex justify-center gap-2', className)}>
	{#each Array.from({ length: ctx.count }, (_, i) => i) as i (i)}
		<button
			type="button"
			aria-label={`Go to slide ${i + 1}`}
			aria-current={ctx.index === i}
			onclick={() => ctx.scrollTo(i)}
			class={cn(
				'size-2 rounded-full transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
				ctx.index === i ? 'bg-primary' : 'bg-muted-foreground/30'
			)}
		></button>
	{/each}
</div>
