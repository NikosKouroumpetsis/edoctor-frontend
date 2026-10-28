<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { FieldMessage } from '$shared/ui/primitives/field-message';

	const { Story } = defineMeta({
		title: 'Primitives/FieldMessage',
		component: FieldMessage,
		tags: ['autodocs'],
		args: { error: 'Υποχρεωτικό πεδίο', icon: true }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<FieldMessage {...args} />
	{/snippet}
</Story>

<Story name="Error And Helper">
	{#snippet template()}
		<div class="flex flex-col gap-2">
			<FieldMessage error="Υποχρεωτικό πεδίο" />
			<FieldMessage error="Χωρίς εικονίδιο" icon={false} />
			<FieldMessage helperText="Θα σας στείλουμε κωδικό στο κινητό." />
		</div>
	{/snippet}
</Story>
