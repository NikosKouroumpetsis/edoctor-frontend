<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Ionicon, ioniconNames } from '$shared/ui/icons/ionicon';

	const { Story } = defineMeta({
		title: 'Icons/Ionicon',
		component: Ionicon,
		tags: ['autodocs'],
		args: { name: 'heart-outline', class: 'icon-lg text-foreground' },
		argTypes: { name: { control: 'select', options: ioniconNames } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Ionicon {...args} />
	{/snippet}
</Story>

<Story name="All Glyphs">
	{#snippet template()}
		<ul class="grid grid-cols-2 gap-3 tablet:grid-cols-4 laptop:grid-cols-6">
			{#each ioniconNames as name (name)}
				<li class="flex items-center gap-2 rounded-md border border-border/70 p-2">
					<Ionicon {name} class="icon-lg text-foreground" />
					<span class="truncate text-label-md text-muted-foreground">{name}</span>
				</li>
			{/each}
		</ul>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex items-end gap-3 text-foreground">
			<Ionicon name="star" class="icon-xs" />
			<Ionicon name="star" class="icon-sm" />
			<Ionicon name="star" class="icon-md" />
			<Ionicon name="star" class="icon-lg" />
			<Ionicon name="star" class="icon-xl text-rating" />
		</div>
	{/snippet}
</Story>
