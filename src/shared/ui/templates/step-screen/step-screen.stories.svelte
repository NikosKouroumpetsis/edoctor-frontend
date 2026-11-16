<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StepScreen } from '$shared/ui/templates/step-screen';

	const noop = () => {};

	const { Story } = defineMeta({
		title: 'Templates/StepScreen',
		component: StepScreen,
		tags: ['autodocs'],
		args: {
			title: 'Απόρριψη αιτήματος',
			backHref: '#',
			onBack: noop,
			backLabel: 'Πίσω',
			backIcon: 'chevron-back',
			saveLabel: 'Απόρριψη αιτήματος',
			cancelLabel: 'Να μείνει',
			onCancel: noop,
			onSave: noop,
			placement: 'solo'
		},
		argTypes: {
			placement: { control: 'inline-radio', options: ['page', 'pane', 'solo', 'centred'] }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<StepScreen {...args}>
			<p class="text-body-md text-muted-foreground">Ο λόγος, το μήνυμα και τι θα γίνει.</p>
		</StepScreen>
	{/snippet}
</Story>

<Story name="Locked Until A Choice">
	{#snippet template(args)}
		<StepScreen {...args} saveDisabled>
			<p class="text-body-md text-muted-foreground">Επιλέξτε τον λόγο.</p>
		</StepScreen>
	{/snippet}
</Story>

<Story name="One Way Back">
	{#snippet template(args)}
		<StepScreen {...args} cancelLabel={null} saveLabel="Πίσω στο ραντεβού">
			<p class="text-body-md text-muted-foreground">Το αίτημα δεν μπορεί πια να απορριφθεί.</p>
		</StepScreen>
	{/snippet}
</Story>

<Story name="Nothing Behind It">
	{#snippet template(args)}
		<StepScreen {...args} backHref={null} cancelLabel={null} placement="page">
			<p class="text-body-md text-muted-foreground">
				Μια σελίδα που ανοίγει μόνη της, από έναν σύνδεσμο.
			</p>
		</StepScreen>
	{/snippet}
</Story>
