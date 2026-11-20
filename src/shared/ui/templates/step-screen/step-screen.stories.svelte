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
			placement: { control: 'inline-radio', options: ['page', 'pane', 'solo', 'centred', 'menu'] }
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

<Story name="A Line Always In Sight">
	{#snippet template(args)}
		<StepScreen
			{...args}
			title="Εξειδικεύσεις"
			cancelLabel="Άκυρο"
			saveLabel="Αποθήκευση"
			barNote="Διαλέξατε 3. Για να διαλέξετε άλλη, βγάλτε μία."
		>
			<div class="flex flex-col gap-3">
				{#each Array.from({ length: 17 }, (_, index) => index + 1) as row (row)}
					<p class="min-h-control-xl text-body-md text-muted-foreground">Γραμμή {row} από 17</p>
				{/each}
			</div>
		</StepScreen>
	{/snippet}
</Story>

<Story name="Beside A Menu Of Sections">
	{#snippet template(args)}
		<StepScreen
			{...args}
			title="Προσαρμογή"
			subtitle="Σύρετε για να διαλέξετε τι φαίνεται."
			cancelLabel="Άκυρο"
			saveLabel="Αποθήκευση"
			placement="menu"
			besideList
		>
			<p class="text-body-md text-muted-foreground">
				Ό,τι ανοίγει μια ενότητα δίπλα στο μενού της.
			</p>
		</StepScreen>
	{/snippet}
</Story>
