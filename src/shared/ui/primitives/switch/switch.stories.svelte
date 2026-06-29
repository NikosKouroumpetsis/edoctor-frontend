<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Switch } from '$shared/ui/primitives/switch';

	const { Story } = defineMeta({
		title: 'Primitives/Switch',
		component: Switch,
		tags: ['autodocs'],
		args: { showCheck: true },
		argTypes: { showCheck: { control: 'boolean' } }
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

<Story name="Checked">
	{#snippet template()}
		<Switch checked aria-label="Checked" />
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

<!-- The ON-state check is opt-out: left keeps the default check, right is the
     same ON state with showCheck={false}. -->
<Story name="Optional check">
	{#snippet template()}
		<div class="flex items-center gap-4">
			<Switch checked aria-label="With check (default)" />
			<Switch checked showCheck={false} aria-label="Without check" />
		</div>
	{/snippet}
</Story>
