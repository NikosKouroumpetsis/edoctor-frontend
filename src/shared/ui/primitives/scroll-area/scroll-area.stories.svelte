<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ScrollArea } from '$shared/ui/primitives/scroll-area';

	// The application's stories (`atoms/scroll-area`), its texts in Greek (U-07.2).
	const { Story } = defineMeta({
		title: 'Primitives/ScrollArea',
		component: ScrollArea,
		tags: ['autodocs']
	});

	const tags = Array.from({ length: 40 }, (_, i) => `v1.2.0-beta.${i + 1}`);
	const cards = Array.from({ length: 15 }, (_, i) => i + 1);
	const lines = Array.from({ length: 30 }, (_, i) => i + 1);
</script>

<Story name="Vertical">
	{#snippet template()}
		<ScrollArea orientation="vertical" class="h-scroll-max w-2/3 border border-border">
			<div class="p-4">
				<p class="mb-3 text-label-md font-medium text-foreground">Ετικέτες</p>
				{#each tags as tag (tag)}
					<div class="border-b border-border py-2">
						<p class="text-body-sm text-foreground">{tag}</p>
					</div>
				{/each}
			</div>
		</ScrollArea>
	{/snippet}
</Story>

<Story name="Horizontal">
	{#snippet template()}
		<ScrollArea orientation="horizontal" class="w-full max-w-narrow border border-border">
			<div class="flex flex-row gap-3 p-4">
				{#each cards as n (n)}
					<div
						class="flex size-placeholder-lg shrink-0 items-center justify-center rounded-xl bg-muted"
					>
						<p class="text-body-sm text-foreground">Κάρτα {n}</p>
					</div>
				{/each}
			</div>
		</ScrollArea>
	{/snippet}
</Story>

<!-- The content is as wide as its longest line (`w-max`): it overflows sideways inside the area. -->
<Story name="Both Axes">
	{#snippet template()}
		<ScrollArea orientation="both" class="h-scroll-max w-full max-w-narrow border border-border">
			<div class="w-max p-4">
				{#each lines as n (n)}
					<p class="py-1 text-body-sm whitespace-nowrap text-foreground">
						Γραμμή {n} — μια σκόπιμα φαρδιά γραμμή που ξεχειλίζει και οριζόντια.
					</p>
				{/each}
			</div>
		</ScrollArea>
	{/snippet}
</Story>
