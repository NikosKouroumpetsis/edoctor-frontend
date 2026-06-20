<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Switch } from '$shared/ui/primitives/switch';

	const { Story } = defineMeta({
		title: 'Primitives/Switch',
		component: Switch,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let checked = $state(false);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<label class="flex items-center gap-2 text-body-sm">
			<Switch bind:checked {...args} aria-label="Notifications" />
			<span>Notifications — {checked ? 'on' : 'off'}</span>
		</label>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<div class="flex items-center gap-4">
			<Switch disabled aria-label="Off disabled" />
			<Switch checked disabled aria-label="On disabled" />
		</div>
	{/snippet}
</Story>
