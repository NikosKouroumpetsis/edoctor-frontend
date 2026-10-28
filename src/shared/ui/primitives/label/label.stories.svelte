<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Label } from '$shared/ui/primitives/label';

	const { Story } = defineMeta({
		title: 'Primitives/Label',
		component: Label,
		tags: ['autodocs'],
		args: { label: 'Διεύθυνση email', required: false, disabled: false },
		argTypes: {
			label: { control: 'text' },
			required: { control: 'boolean' },
			disabled: { control: 'boolean' }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Label {...args} />
	{/snippet}
</Story>

<Story name="States">
	{#snippet template()}
		<div class="flex flex-col gap-3">
			<Label label="Κανονική ετικέτα" />
			<Label label="Υποχρεωτικό πεδίο" required />
			<Label label="Ανενεργό πεδίο" disabled />
		</div>
	{/snippet}
</Story>
