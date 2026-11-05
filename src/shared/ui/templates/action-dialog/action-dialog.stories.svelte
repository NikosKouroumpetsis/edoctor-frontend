<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';
	import { Button } from '$shared/ui/primitives/button';

	// U-84 Π1: a small window from 744, the application's sheet as tall as its content below it.
	const { Story } = defineMeta({
		title: 'Templates/ActionDialog',
		component: ActionDialog,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let rows = $state(false);
	let buttons = $state(false);
</script>

<Story name="Rows">
	{#snippet template()}
		<Button tone="outline" label="Άνοιγμα" onclick={() => (rows = true)} />
		<ActionDialog bind:open={rows} title="Ρυθμίσεις μηνυμάτων" closeLabel="Κλείσιμο">
			<p class="text-body-lg text-foreground">Οι γραμμές του παραθύρου.</p>
		</ActionDialog>
	{/snippet}
</Story>

<Story name="Buttons">
	{#snippet template()}
		<Button tone="outline" label="Άνοιγμα" onclick={() => (buttons = true)} />
		<ActionDialog bind:open={buttons} title="Να απορριφθεί το μήνυμα;" closeLabel="Κλείσιμο">
			<p class="text-body-lg text-foreground">Το κείμενο που γράψατε δεν θα αποθηκευτεί.</p>
			{#snippet footer()}
				<Button tone="outline" label="Συνέχεια" class="flex-1" onclick={() => (buttons = false)} />
				<Button tone="contrast" label="Απόρριψη" class="flex-1" onclick={() => (buttons = false)} />
			{/snippet}
		</ActionDialog>
	{/snippet}
</Story>
