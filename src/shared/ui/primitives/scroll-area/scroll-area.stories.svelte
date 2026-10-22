<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ScrollArea } from '$shared/ui/primitives/scroll-area';

	const { Story } = defineMeta({
		title: 'Primitives/ScrollArea',
		component: ScrollArea,
		tags: ['autodocs']
	});

	const tags = Array.from({ length: 40 }, (_, i) => `v1.2.0-beta.${i + 1}`);
</script>

<Story name="Vertical">
	{#snippet template()}
		<ScrollArea
			orientation="vertical"
			class="h-scroll-max w-narrow rounded-md border border-border"
		>
			<div class="p-4">
				<h4 class="mb-3 text-body-sm font-medium">Tags</h4>
				{#each tags as tag (tag)}
					<div class="border-b border-border py-2 text-body-sm">{tag}</div>
				{/each}
			</div>
		</ScrollArea>
	{/snippet}
</Story>

<Story name="Horizontal">
	{#snippet template()}
		<ScrollArea orientation="horizontal" class="w-narrow rounded-md border border-border">
			<div class="flex gap-3 p-4">
				{#each Array.from({ length: 15 }, (_, i) => i + 1) as n (n)}
					<div
						class="flex size-tile shrink-0 items-center justify-center rounded-md bg-muted text-body-sm"
					>
						Card {n}
					</div>
				{/each}
			</div>
		</ScrollArea>
	{/snippet}
</Story>

<Story name="Both axes">
	{#snippet template()}
		<ScrollArea orientation="both" class="h-scroll-max w-narrow rounded-md border border-border">
			<div class="w-content p-4">
				{#each Array.from({ length: 30 }, (_, i) => i + 1) as n (n)}
					<p class="py-1 text-body-sm whitespace-nowrap">
						Row {n} — a deliberately wide line of content that overflows horizontally as well.
					</p>
				{/each}
			</div>
		</ScrollArea>
	{/snippet}
</Story>
