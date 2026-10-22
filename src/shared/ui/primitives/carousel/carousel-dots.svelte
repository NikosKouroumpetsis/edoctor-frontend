<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { getCarouselContext } from './carousel.svelte';

	let { class: className }: { class?: string } = $props();

	const ctx = getCarouselContext();
</script>

<div data-slot="carousel-dots" class={cn('flex flex-wrap justify-center gap-touch-gap', className)}>
	{#each Array.from({ length: ctx.count }, (_, i) => i) as i (i)}
		<button
			type="button"
			aria-label={`Go to slide ${i + 1}`}
			aria-current={ctx.index === i}
			onclick={() => ctx.scrollTo(i)}
			class="group grid size-touch place-items-center rounded-full outline-none"
		>
			<span
				class={cn(
					'size-2 rounded-full transition-colors group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
					ctx.index === i ? 'bg-primary' : 'bg-muted-foreground/30'
				)}
			></span>
		</button>
	{/each}
</div>
