<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Checkbox } from '$shared/ui/primitives/checkbox';

	const { Story } = defineMeta({
		title: 'Primitives/Checkbox',
		component: Checkbox,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let checked = $state(false);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<label class="flex items-center gap-2 text-body-sm">
			<Checkbox bind:checked {...args} />
			<span>Accept terms — {checked ? 'yes' : 'no'}</span>
		</label>
	{/snippet}
</Story>

<Story name="States">
	{#snippet template()}
		<div class="flex items-center gap-4">
			<label class="flex items-center gap-2 text-body-sm"><Checkbox checked /> Checked</label>
			<label class="flex items-center gap-2 text-body-sm">
				<Checkbox indeterminate /> Indeterminate
			</label>
			<label class="flex items-center gap-2 text-body-sm text-muted-foreground">
				<Checkbox disabled /> Disabled
			</label>
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex items-center gap-4">
			<label class="flex items-center gap-2 text-body-sm"
				><Checkbox size="sm" checked /> Small</label
			>
			<label class="flex items-center gap-2 text-body-sm">
				<Checkbox size="default" checked /> Default
			</label>
			<label class="flex items-center gap-2 text-body-sm"
				><Checkbox size="lg" checked /> Large</label
			>
		</div>
	{/snippet}
</Story>
