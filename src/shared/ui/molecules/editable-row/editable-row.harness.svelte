<script lang="ts">
	import { EditableRow } from './index';

	let {
		open = false,
		dimmed = false,
		value,
		help,
		onOpenChange,
		onReady
	}: {
		open?: boolean;
		dimmed?: boolean;
		value?: string;
		help?: string;
		onOpenChange?: (open: boolean) => void;
		/** The caller's hand on the row: what a choice does (it closes the row itself). */
		onReady?: (handle: { close: () => void }) => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	let isOpen = $state(open);
	// svelte-ignore state_referenced_locally
	onReady?.({ close: () => (isOpen = false) });
</script>

<!-- Tests only: one row with a field and a button as its content, and a second row that fades while the first is open. -->
<EditableRow
	title="Τίτλος"
	{value}
	{help}
	actionLabel="Αλλαγή"
	closeLabel="Κλείσιμο"
	bind:open={isOpen}
	{dimmed}
	{onOpenChange}
	testId="row"
>
	<input aria-label="Πεδίο" class="min-h-touch w-full" />
	<button type="button" class="min-h-touch w-full">Αποθήκευση</button>
</EditableRow>
<EditableRow
	title="Άλλη γραμμή"
	value="Τιμή"
	actionLabel="Αλλαγή"
	closeLabel="Κλείσιμο"
	dimmed={isOpen}
	testId="other"
>
	<p>Άλλο περιεχόμενο</p>
</EditableRow>
