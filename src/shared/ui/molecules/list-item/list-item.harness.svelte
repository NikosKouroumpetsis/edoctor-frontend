<script lang="ts">
	import { ListItem, type ListItemTitleTone } from './index';

	let {
		onclick,
		disabled,
		query,
		titleTone,
		subtitle,
		withSlots = false
	}: {
		onclick?: () => void;
		disabled?: boolean;
		query?: string;
		titleTone?: ListItemTitleTone;
		subtitle?: string;
		withSlots?: boolean;
	} = $props();
</script>

{#snippet leading()}<span data-testid="leading">ΜΠ</span>{/snippet}
{#snippet trailing()}<span data-testid="trailing">›</span>{/snippet}

<ListItem
	title="Δρ. Μαρία Παπαδοπούλου"
	{subtitle}
	{onclick}
	{disabled}
	{query}
	{titleTone}
	leading={withSlots ? leading : undefined}
	trailing={withSlots ? trailing : undefined}
	testId="doctor-row"
/>
