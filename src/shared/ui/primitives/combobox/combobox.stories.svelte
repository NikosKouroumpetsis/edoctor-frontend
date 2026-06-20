<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Combobox, type ComboboxOption } from '$shared/ui/primitives/combobox';

	const { Story } = defineMeta({
		title: 'Primitives/Combobox',
		component: Combobox,
		tags: ['autodocs'],
		args: {
			label: 'Specialty',
			placeholder: 'Αναζήτηση ειδικότητας…',
			size: 'default',
			allowFreeText: true,
			searchIcon: true,
			chevron: true,
			disabled: false
		},
		argTypes: {
			size: { control: 'select', options: ['sm', 'default', 'lg', 'xl'] },
			allowFreeText: { control: 'boolean' },
			searchIcon: { control: 'boolean' },
			chevron: { control: 'boolean' },
			disabled: { control: 'boolean' }
		}
	});

	const specialties: ComboboxOption[] = [
		{ label: 'Καρδιολόγος', value: 'cardio' },
		{ label: 'Δερματολόγος', value: 'derma' },
		{ label: 'Νευρολόγος', value: 'neuro' },
		{ label: 'Παιδίατρος', value: 'pedia' },
		{ label: 'Παθολόγος', value: 'internal' },
		{ label: 'Ακτινολόγος', value: 'radio' }
	];
</script>

<script lang="ts">
	let value = $state('');
	let preselected = $state('derma');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-80"><Combobox {...args} options={specialties} bind:value /></div>
	{/snippet}
</Story>

<Story name="Pre-selected">
	{#snippet template()}
		<div class="w-80">
			<Combobox label="Specialty" options={specialties} bind:value={preselected} />
			<p class="mt-2 text-body-sm text-muted-foreground">value: {preselected || '(empty)'}</p>
		</div>
	{/snippet}
</Story>

<Story name="Strict (no free text)">
	{#snippet template()}
		<div class="w-80">
			<Combobox label="Specialty" options={specialties} allowFreeText={false} />
		</div>
	{/snippet}
</Story>

<Story name="No search icon">
	{#snippet template()}
		<div class="w-80">
			<Combobox label="Specialty" options={specialties} searchIcon={false} />
		</div>
	{/snippet}
</Story>

<Story name="No chevron">
	{#snippet template()}
		<div class="w-80">
			<Combobox label="Specialty" options={specialties} chevron={false} />
		</div>
	{/snippet}
</Story>

<Story name="Bare (no icons)">
	{#snippet template()}
		<div class="w-80">
			<Combobox label="Specialty" options={specialties} searchIcon={false} chevron={false} />
		</div>
	{/snippet}
</Story>
