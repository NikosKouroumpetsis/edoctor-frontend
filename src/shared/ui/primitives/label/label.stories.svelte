<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Label } from '$shared/ui/primitives/label';
	import { Input } from '$shared/ui/primitives/input';

	const { Story } = defineMeta({
		title: 'Primitives/Label',
		component: Label,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	{#snippet template()}
		<Label>Email address</Label>
	{/snippet}
</Story>

<Story name="With input association">
	{#snippet template()}
		<div class="flex w-72 flex-col gap-2">
			<Label for="email">Email address</Label>
			<Input id="email" type="email" placeholder="you@example.com" />
		</div>
	{/snippet}
</Story>
