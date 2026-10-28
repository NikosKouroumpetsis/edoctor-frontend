<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ToggleGroup, ToggleGroupItem } from '$shared/ui/primitives/toggle-group';

	const options = [
		{ label: 'Αριστερά', value: 'left' },
		{ label: 'Κέντρο', value: 'center' },
		{ label: 'Δεξιά', value: 'right' }
	];

	// The application's meta (`molecules/toggle-group`), composed of items with the words as text.
	const { Story } = defineMeta({
		title: 'Primitives/Toggle group',
		component: ToggleGroup,
		tags: ['autodocs'],
		args: { variant: 'outline', size: 'md', disabled: false },
		argTypes: {
			variant: { control: 'inline-radio', options: ['default', 'outline'] },
			size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
			disabled: { control: 'boolean' },
			orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] }
		}
	});
</script>

<script lang="ts">
	let single = $state<string | string[] | undefined>('left');
	let multiple = $state<string | string[] | undefined>(['left', 'right']);
	let vertical = $state<string | string[] | undefined>('center');
</script>

{#snippet items()}
	{#each options as option (option.value)}
		<ToggleGroupItem value={option.value}>{option.label}</ToggleGroupItem>
	{/each}
{/snippet}

<Story name="Single">
	{#snippet template()}
		<ToggleGroup type="single" variant="outline" bind:value={single}>{@render items()}</ToggleGroup>
	{/snippet}
</Story>

<Story name="Multiple">
	{#snippet template()}
		<ToggleGroup type="multiple" variant="outline" bind:value={multiple}>
			{@render items()}
		</ToggleGroup>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<ToggleGroup {...args} type="single" value="left">{@render items()}</ToggleGroup>
	{/snippet}
</Story>

<Story name="Vertical">
	{#snippet template()}
		<ToggleGroup type="single" orientation="vertical" variant="outline" bind:value={vertical}>
			{@render items()}
		</ToggleGroup>
	{/snippet}
</Story>
