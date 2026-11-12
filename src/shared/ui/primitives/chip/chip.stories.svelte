<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Chip } from '$shared/ui/primitives/chip';

	const sizes = ['sm', 'md', 'tab'] as const;
	const variants = ['filled', 'tinted', 'outline', 'contrast'] as const;
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

<!-- U-24.3: the results' filters chip, chosen — the 2 dark ring on the band, the count muted. -->
<Story
	name="Outline With Icon And Count"
	args={{ variant: 'outline', icon: 'card-outline', count: '64', selected: true, label: 'Κάρτα' }}
>
	{#snippet template(args)}
		<Chip {...args} />
	{/snippet}
</Story>

<!-- D-W4-28: screen 50's two tabs as links, the chosen one filled dark (`.a-chip.on`), no colour under the pointer (U-100);
     D-W4-66: in a tab's measure (`size="tab"`, a 36 pill with 14 words). -->
<Story name="Contrast Tabs">
	{#snippet template()}
		<div class="flex flex-row gap-2">
			<Chip
				label="Επερχόμενα"
				href="#upcoming"
				variant="contrast"
				size="tab"
				selected
				hover={false}
			/>
			<Chip label="Ιστορικό" href="#history" variant="contrast" size="tab" hover={false} />
		</div>
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
