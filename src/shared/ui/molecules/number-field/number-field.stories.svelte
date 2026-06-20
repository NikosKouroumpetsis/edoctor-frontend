<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { NumberField } from '$shared/ui/molecules/number-field';

	const { Story } = defineMeta({
		title: 'Molecules/Number field',
		component: NumberField,
		tags: ['autodocs'],
		args: { label: 'Quantity', placeholder: 'e.g. 3', size: 'default', disabled: false },
		argTypes: {
			size: { control: 'select', options: ['sm', 'default', 'lg', 'xl'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	let value = $state('');
	let bounded = $state('2');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-80"><NumberField {...args} /></div>
	{/snippet}
</Story>

<Story name="Default">
	{#snippet template()}
		<div class="w-80"><NumberField label="Quantity" bind:value /></div>
	{/snippet}
</Story>

<Story name="Min/max + step">
	{#snippet template()}
		<div class="w-80">
			<NumberField label="Guests" bind:value={bounded} min={1} max={10} step={1} />
			<p class="mt-2 text-body-sm text-muted-foreground">Allowed: 1–10, step 1.</p>
		</div>
	{/snippet}
</Story>
