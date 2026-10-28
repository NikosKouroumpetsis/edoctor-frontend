<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { CheckboxRow } from '$shared/ui/molecules/checkbox-row';

	const options = [
		{ count: '24', id: 'a', label: 'Πρώτη' },
		{ count: '7', id: 'b', label: 'Δεύτερη' },
		{ count: '1', id: 'c', label: 'Τρίτη' }
	];

	// The application's meta (`molecules/checkbox-row`).
	const { Story } = defineMeta({
		title: 'Molecules/CheckboxRow',
		component: CheckboxRow,
		tags: ['autodocs'],
		args: { checked: false, count: '12', label: 'Επιλογή' }
	});
</script>

<script lang="ts">
	let picked = $state<string[]>(['b']);
	const toggle = (id: string) =>
		(picked = picked.includes(id) ? picked.filter((value) => value !== id) : [...picked, id]);
</script>

<Story name="Unchecked">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><CheckboxRow {...args} /></div>
	{/snippet}
</Story>

<Story name="Checked" args={{ checked: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><CheckboxRow {...args} /></div>
	{/snippet}
</Story>

<Story name="Without Count" args={{ count: undefined }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><CheckboxRow {...args} /></div>
	{/snippet}
</Story>

<Story
	name="Long Label"
	args={{ label: 'Μια επιλογή με πολύ μεγάλο όνομα που κόβεται σε μία γραμμή' }}
>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><CheckboxRow {...args} /></div>
	{/snippet}
</Story>

<!-- A multi-select list, as inside an expanded accordion. -->
<Story name="List">
	{#snippet template()}
		<div class="flex w-full max-w-narrow flex-col gap-0.5">
			{#each options as option (option.id)}
				<CheckboxRow
					checked={picked.includes(option.id)}
					count={option.count}
					label={option.label}
					onToggle={() => toggle(option.id)}
				/>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><CheckboxRow {...args} /></div>
	{/snippet}
</Story>
