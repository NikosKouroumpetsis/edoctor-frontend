<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Chip } from '$shared/ui/primitives/chip';

	const sizes = ['sm', 'md'] as const;
	const variants = ['filled', 'tinted'] as const;
	const filters = ['Καρδιολόγος', 'Παιδίατρος', 'Δερματολόγος', 'Ορθοπαιδικός'] as const;

	// The application's meta (`atoms/chip`).
	const { Story } = defineMeta({
		title: 'Primitives/Chip',
		component: Chip,
		tags: ['autodocs'],
		args: { label: 'Καρδιολόγος', selected: false, disabled: false, size: 'md', variant: 'filled' },
		argTypes: {
			label: { control: 'text' },
			selected: { control: 'boolean' },
			disabled: { control: 'boolean' },
			size: { control: 'radio', options: sizes },
			variant: { control: 'radio', options: variants }
		}
	});
</script>

<script lang="ts">
	// Single choice: pressing the chosen chip clears it (the application's `SelectableChipGroup`).
	let chosen = $state<string | null>(null);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Chip {...args} />
	{/snippet}
</Story>

<Story name="Selectable Group">
	{#snippet template(args)}
		<div class="flex flex-row flex-wrap gap-2">
			{#each filters as filter (filter)}
				<Chip
					{...args}
					label={filter}
					selected={chosen === filter}
					onclick={() => (chosen = chosen === filter ? null : filter)}
				/>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-row items-center gap-2">
			{#each sizes as size (size)}
				<Chip {...args} {size} label={size} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story
	name="Tinted With Icon And Count"
	args={{ variant: 'tinted', icon: 'cash-outline', count: '12', selected: true, label: 'Μετρητά' }}
>
	{#snippet template(args)}
		<Chip {...args} />
	{/snippet}
</Story>

<Story
	name="Removable"
	args={{ variant: 'tinted', removable: true, label: 'Γυναίκα', onRemove: () => {} }}
>
	{#snippet template(args)}
		<Chip {...args} />
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<Chip {...args} />
	{/snippet}
</Story>
