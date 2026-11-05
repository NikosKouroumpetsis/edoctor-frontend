<script lang="ts">
	import ActionDialog from './action-dialog.svelte';

	let {
		open = $bindable(true),
		onDismiss,
		withFooter = false,
		wrapTitle = false
	}: {
		open?: boolean;
		onDismiss?: () => void;
		withFooter?: boolean;
		wrapTitle?: boolean;
	} = $props();
</script>

<ActionDialog
	bind:open
	title="Τίτλος"
	{wrapTitle}
	closeLabel="Κλείσιμο"
	{onDismiss}
	testId="dialog"
>
	<p>Το κείμενο</p>
	{#snippet footer()}
		{#if withFooter}<button type="button" class="min-h-touch min-w-touch">Εντάξει</button>{/if}
	{/snippet}
</ActionDialog>
