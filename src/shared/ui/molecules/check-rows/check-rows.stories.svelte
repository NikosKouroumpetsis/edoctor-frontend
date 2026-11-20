<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { CheckRows } from '$shared/ui/molecules/check-rows';

	const options = [
		{ value: 'visit', label: 'Επίσκεψη', detail: '30 λεπτά · 60 €' },
		{ value: 'recheck', label: 'Επανέλεγχος', detail: '20 λεπτά · 45 €' },
		{ value: 'ecg', label: 'Ηλεκτροκαρδιογράφημα', detail: '20 λεπτά · 30 €' },
		{ value: 'echo', label: 'Υπέρηχος καρδιάς', detail: '30 λεπτά · 80 €' }
	];

	const { Story } = defineMeta({
		title: 'Molecules/CheckRows',
		component: CheckRows,
		tags: ['autodocs'],
		args: { label: 'Υπηρεσίες', options, values: ['recheck'], onToggle: () => {} }
	});
</script>

<script lang="ts">
	let chosen = $state<string[]>(['recheck', 'ecg']);
	const toggle = (value: string) =>
		(chosen = chosen.includes(value)
			? chosen.filter((entry) => entry !== value)
			: [...chosen, value]);
	let limited = $state<string[]>(['recheck', 'ecg']);
	const toggleLimited = (value: string) =>
		(limited = limited.includes(value)
			? limited.filter((entry) => entry !== value)
			: [...limited, value]);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form">
			<CheckRows {...args} values={chosen} onToggle={toggle} />
		</div>
	{/snippet}
</Story>

<!-- A limit the caller keeps (two here): at it the rows that are not chosen are held back, and come back once one is
     taken out. -->
<Story name="At A Limit">
	{#snippet template(args)}
		<div class="w-full max-w-form">
			<CheckRows
				{...args}
				options={options.map((option) => ({
					...option,
					disabled: limited.length >= 2 && !limited.includes(option.value)
				}))}
				values={limited}
				onToggle={toggleLimited}
			/>
		</div>
	{/snippet}
</Story>

<!-- Rows without a muted line. -->
<Story
	name="Words Only"
	args={{ options: options.map(({ value, label }) => ({ value, label })), values: ['visit'] }}
/>
