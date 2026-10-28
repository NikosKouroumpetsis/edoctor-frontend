<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { AspectRatio } from '$shared/ui/primitives/aspect-ratio';

	// The application's meta (`atoms/aspect-ratio`).
	const { Story } = defineMeta({
		title: 'Primitives/Aspect ratio',
		component: AspectRatio,
		tags: ['autodocs'],
		args: { ratio: 1 },
		argTypes: { ratio: { control: { type: 'number', step: 0.1 } } }
	});
</script>

<Story name="Square">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<AspectRatio {...args} ratio={1} class="rounded-xl bg-muted">
				<div class="flex size-full items-center justify-center">
					<span class="text-label-md text-muted-foreground">1 : 1</span>
				</div>
			</AspectRatio>
		</div>
	{/snippet}
</Story>

<Story name="Widescreen">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<AspectRatio {...args} ratio={16 / 9} class="rounded-xl bg-muted">
				<div class="flex size-full items-center justify-center">
					<span class="text-label-md text-muted-foreground">16 : 9</span>
				</div>
			</AspectRatio>
		</div>
	{/snippet}
</Story>

<Story name="With Image">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<AspectRatio {...args} ratio={4 / 3} class="overflow-hidden rounded-xl bg-muted">
				<img
					src="https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=640&q=80"
					alt="Γιατρός εξετάζει τον φάκελο ασθενούς"
					class="size-full object-cover"
				/>
			</AspectRatio>
		</div>
	{/snippet}
</Story>
