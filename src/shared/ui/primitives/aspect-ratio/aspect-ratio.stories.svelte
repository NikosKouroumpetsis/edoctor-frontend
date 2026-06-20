<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { AspectRatio } from '$shared/ui/primitives/aspect-ratio';

	const { Story } = defineMeta({
		title: 'Primitives/Aspect ratio',
		component: AspectRatio,
		tags: ['autodocs']
	});
</script>

<Story name="Ratio 16:9">
	{#snippet template()}
		<div class="w-80">
			<AspectRatio ratio={16 / 9} class="overflow-hidden rounded-md bg-muted">
				<div class="flex size-full items-center justify-center text-body-sm text-muted-foreground">
					16 : 9
				</div>
			</AspectRatio>
		</div>
	{/snippet}
</Story>

<Story name="Square 1:1">
	{#snippet template()}
		<div class="w-60">
			<AspectRatio ratio={1} class="overflow-hidden rounded-md bg-muted">
				<div class="flex size-full items-center justify-center text-body-sm text-muted-foreground">
					1 : 1
				</div>
			</AspectRatio>
		</div>
	{/snippet}
</Story>

<Story name="Ratio 4:3 (with image)">
	{#snippet template()}
		<div class="w-80">
			<AspectRatio ratio={4 / 3} class="overflow-hidden rounded-md bg-muted">
				<img
					src="https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=640&q=80"
					alt="A doctor reviewing a patient chart"
					class="size-full object-cover"
				/>
			</AspectRatio>
		</div>
	{/snippet}
</Story>
