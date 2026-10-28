<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Checkbox } from '$shared/ui/primitives/checkbox';

	// The application's meta (`atoms/checkbox`); its `accessibilityLabel` is the web's `aria-label`.
	const { Story } = defineMeta({
		title: 'Primitives/Checkbox',
		component: Checkbox,
		tags: ['autodocs'],
		args: { checked: false, disabled: false, size: 'md', 'aria-label': 'Αποδοχή όρων' },
		argTypes: {
			checked: { control: 'boolean' },
			disabled: { control: 'boolean' },
			indeterminate: { control: 'boolean' },
			size: { control: 'select', options: ['sm', 'md', 'lg'] }
		}
	});
</script>

<script lang="ts">
	let checked = $state(false);
	// A parent of a mixed group: «−», read as «mixed»; a press checks it, and the caller clears the mixed state.
	let all = $state({ checked: false, indeterminate: true });
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Checkbox {...args} bind:checked />
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-row items-center gap-4">
			<Checkbox {...args} size="sm" checked />
			<Checkbox {...args} size="md" checked />
			<Checkbox {...args} size="lg" checked />
		</div>
	{/snippet}
</Story>

<Story name="States">
	{#snippet template(args)}
		<div class="flex flex-row flex-wrap gap-4">
			<Checkbox {...args} checked={false} />
			<Checkbox {...args} checked />
			<Checkbox {...args} checked={false} disabled />
			<Checkbox {...args} checked disabled />
		</div>
	{/snippet}
</Story>

<Story name="Indeterminate">
	{#snippet template(args)}
		<Checkbox
			{...args}
			aria-label="Επιλογή όλων"
			checked={all.checked}
			indeterminate={all.indeterminate}
			onCheckedChange={(next) => (all = { checked: next, indeterminate: false })}
		/>
	{/snippet}
</Story>
