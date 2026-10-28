<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Switch } from '$shared/ui/primitives/switch';

	// The application's meta (`atoms/switch`); its `accessibilityLabel` is the web's `aria-label`.
	const { Story } = defineMeta({
		title: 'Primitives/Switch',
		component: Switch,
		tags: ['autodocs'],
		args: {
			checked: false,
			disabled: false,
			showCheck: true,
			size: 'md',
			'aria-label': 'Ειδοποιήσεις'
		},
		argTypes: {
			checked: { control: 'boolean' },
			disabled: { control: 'boolean' },
			showCheck: { control: 'boolean' },
			size: { control: 'select', options: ['sm', 'md', 'lg'] }
		}
	});
</script>

<script lang="ts">
	let checked = $state(false);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Switch {...args} bind:checked />
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-row items-center gap-4">
			<Switch {...args} size="sm" checked />
			<Switch {...args} size="md" checked />
			<Switch {...args} size="lg" checked />
		</div>
	{/snippet}
</Story>

<Story name="States">
	{#snippet template(args)}
		<div class="flex flex-col items-start gap-4">
			<Switch {...args} checked={false} />
			<Switch {...args} checked />
			<Switch {...args} checked={false} disabled />
			<Switch {...args} checked disabled />
		</div>
	{/snippet}
</Story>

<!-- The ON checkmark is opt-out: the same ON state with and without `showCheck`. -->
<Story name="Optional Check">
	{#snippet template(args)}
		<div class="flex flex-row items-center gap-4">
			<Switch {...args} checked showCheck />
			<Switch {...args} checked showCheck={false} />
		</div>
	{/snippet}
</Story>
