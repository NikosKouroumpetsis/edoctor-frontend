<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		RadioGroup,
		RadioGroupItem,
		type RadioGroupItemSize
	} from '$shared/ui/primitives/radio-group';
	import { Label } from '$shared/ui/primitives/label';

	const options = [
		{ label: 'Όλα', value: 'all' },
		{ label: 'Άνδρας', value: 'male' },
		{ label: 'Γυναίκα', value: 'female' }
	];
	const sizes = ['sm', 'md', 'lg'] as const;

	// The application's stories (`molecules/radio-group`), composed: one 48 row per option, the radio and its words
	// 12 apart (`text-body-md`), the rows 12 apart (a wrapping row when horizontal).
	const { Story } = defineMeta({
		title: 'Primitives/Radio group',
		component: RadioGroup,
		tags: ['autodocs'],
		args: { orientation: 'vertical', disabled: false },
		argTypes: {
			orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	let playground = $state('all');
	let horizontal = $state('all');
	let unselected = $state<string | undefined>(undefined);
	let disabledOption = $state('all');
	const sized = $state<Record<string, string>>({ sm: 'all', md: 'all', lg: 'all' });
</script>

{#snippet rows(prefix: string, size: RadioGroupItemSize = 'md', disabledValue?: string)}
	{#each options as option (option.value)}
		{@const off = option.value === disabledValue}
		<div class="flex min-h-touch flex-row items-center gap-3">
			<RadioGroupItem value={option.value} id={`${prefix}-${option.value}`} {size} disabled={off} />
			<Label for={`${prefix}-${option.value}`} class="text-body-md font-normal" disabled={off}>
				{option.label}
			</Label>
		</div>
	{/each}
{/snippet}

<Story name="Playground">
	{#snippet template(args)}
		<RadioGroup {...args} bind:value={playground} name="rg-playground">
			{@render rows('rg-playground')}
		</RadioGroup>
	{/snippet}
</Story>

<Story name="Horizontal" args={{ orientation: 'horizontal' }}>
	{#snippet template(args)}
		<RadioGroup
			{...args}
			bind:value={horizontal}
			name="rg-horizontal"
			class="flex flex-row flex-wrap gap-3"
		>
			{@render rows('rg-horizontal')}
		</RadioGroup>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<RadioGroup {...args} value="all" name="rg-disabled">
			{@render rows('rg-disabled')}
		</RadioGroup>
	{/snippet}
</Story>

<Story name="Unselected">
	{#snippet template(args)}
		<RadioGroup {...args} bind:value={unselected} name="rg-unselected">
			{@render rows('rg-unselected')}
		</RadioGroup>
	{/snippet}
</Story>

<Story name="Disabled Option">
	{#snippet template(args)}
		<RadioGroup {...args} bind:value={disabledOption} name="rg-disabled-option">
			{@render rows('rg-disabled-option', 'md', 'female')}
		</RadioGroup>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-col gap-6">
			{#each sizes as size (size)}
				<RadioGroup {...args} bind:value={sized[size]} name={`rg-size-${size}`}>
					{@render rows(`rg-size-${size}`, size)}
				</RadioGroup>
			{/each}
		</div>
	{/snippet}
</Story>
