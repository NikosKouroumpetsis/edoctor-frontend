<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Separator } from '$shared/ui/primitives/separator';

	const { Story } = defineMeta({
		title: 'Primitives/Separator',
		component: Separator,
		tags: ['autodocs']
	});
</script>

<Story name="Horizontal">
	{#snippet template()}
		<div class="w-72">
			<p class="text-body-sm">Section one</p>
			<Separator class="my-3" />
			<p class="text-body-sm">Section two</p>
		</div>
	{/snippet}
</Story>

<Story name="Vertical">
	{#snippet template()}
		<div class="flex h-8 items-center gap-3 text-body-sm">
			<span>Profile</span>
			<Separator orientation="vertical" />
			<span>Settings</span>
			<Separator orientation="vertical" />
			<span>Log out</span>
		</div>
	{/snippet}
</Story>
