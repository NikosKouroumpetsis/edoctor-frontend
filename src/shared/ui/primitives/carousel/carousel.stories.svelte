<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		Carousel,
		CarouselContent,
		CarouselItem,
		CarouselPrevious,
		CarouselNext,
		CarouselDots
	} from '$shared/ui/primitives/carousel';

	const { Story } = defineMeta({
		title: 'Primitives/Carousel',
		component: Carousel,
		tags: ['autodocs']
	});

	const slides = ['One', 'Two', 'Three'];
</script>

<script lang="ts">
	let index = $state(0);
	let loopIndex = $state(0);
</script>

{#snippet slide(label: string)}
	<div
		class="flex h-40 items-center justify-center rounded-md bg-muted text-title-md font-semibold"
	>
		{label}
	</div>
{/snippet}

<Story name="Default">
	{#snippet template()}
		<div class="w-80">
			<Carousel bind:index>
				<CarouselContent>
					{#each slides as label (label)}
						<CarouselItem>{@render slide(label)}</CarouselItem>
					{/each}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>
		</div>
	{/snippet}
</Story>

<Story name="With dots">
	{#snippet template()}
		<div class="w-80">
			<Carousel bind:index>
				<CarouselContent>
					{#each slides as label (label)}
						<CarouselItem>{@render slide(label)}</CarouselItem>
					{/each}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
				<CarouselDots />
			</Carousel>
		</div>
	{/snippet}
</Story>

<Story name="Loop">
	{#snippet template()}
		<div class="w-80">
			<Carousel bind:index={loopIndex} loop>
				<CarouselContent>
					{#each slides as label (label)}
						<CarouselItem>{@render slide(label)}</CarouselItem>
					{/each}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
				<CarouselDots />
			</Carousel>
		</div>
	{/snippet}
</Story>
