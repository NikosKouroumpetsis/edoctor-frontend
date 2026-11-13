<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { EditableRow } from '$shared/ui/molecules/editable-row';
	import { Button } from '$shared/ui/primitives/button';

	// A row that is edited in its place (wave 4.5, D-W45-09): closed «title · value · link»; open the title, the closing
	// link, a line of help and the caller's content; the other rows fade meanwhile.
	const { Story } = defineMeta({
		title: 'Molecules/EditableRow',
		component: EditableRow,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let first = $state(false);
	let second = $state(false);
</script>

{#snippet content()}
	<p class="pb-4 text-body-lg text-foreground">Το περιεχόμενο της γραμμής.</p>
	<Button tone="contrast" label="Αποθήκευση" />
{/snippet}

<Story name="Closed">
	{#snippet template()}
		<EditableRow title="Τίτλος" value="Η τιμή σήμερα" actionLabel="Αλλαγή" closeLabel="Κλείσιμο">
			{@render content()}
		</EditableRow>
	{/snippet}
</Story>

<Story name="Open">
	{#snippet template()}
		<EditableRow
			title="Τίτλος"
			value="Η τιμή σήμερα"
			help="Μια γραμμή που εξηγεί τι αλλάζει."
			actionLabel="Αλλαγή"
			closeLabel="Κλείσιμο"
			open
		>
			{@render content()}
		</EditableRow>
	{/snippet}
</Story>

<Story name="Dimmed">
	{#snippet template()}
		<EditableRow
			title="Τίτλος"
			value="Η τιμή σήμερα"
			actionLabel="Αλλαγή"
			closeLabel="Κλείσιμο"
			dimmed
		>
			{@render content()}
		</EditableRow>
	{/snippet}
</Story>

<Story name="Without A Value">
	{#snippet template()}
		<EditableRow title="Τίτλος" actionLabel="Προσθήκη" closeLabel="Ακύρωση">
			{@render content()}
		</EditableRow>
	{/snippet}
</Story>

<!-- Two rows of one list: the one that opens fades the other, which takes no press until it closes. -->
<Story name="Two Rows">
	{#snippet template()}
		<EditableRow
			title="Πρώτη γραμμή"
			value="Η τιμή σήμερα"
			help="Μια γραμμή που εξηγεί τι αλλάζει."
			actionLabel="Αλλαγή"
			closeLabel="Κλείσιμο"
			bind:open={first}
			dimmed={second}
		>
			{@render content()}
		</EditableRow>
		<EditableRow
			title="Δεύτερη γραμμή"
			value="Άλλη τιμή"
			actionLabel="Αλλαγή"
			closeLabel="Κλείσιμο"
			bind:open={second}
			dimmed={first}
		>
			{@render content()}
		</EditableRow>
	{/snippet}
</Story>
