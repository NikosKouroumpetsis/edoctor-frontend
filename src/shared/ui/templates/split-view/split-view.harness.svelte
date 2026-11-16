<script lang="ts">
	import { SplitView, type SplitViewFrom, type SplitViewWidths } from './index';

	let {
		open,
		solo,
		widths,
		from,
		centred,
		listLabel,
		paneLabel,
		onPane
	}: {
		open?: boolean;
		solo?: boolean;
		widths?: SplitViewWidths;
		from?: SplitViewFrom;
		centred?: boolean;
		listLabel?: string;
		paneLabel?: string;
		onPane?: (pane: HTMLDivElement | null) => void;
	} = $props();

	let paneRef = $state<HTMLDivElement | null>(null);
	$effect(() => onPane?.(paneRef));
</script>

<SplitView
	{open}
	{solo}
	{widths}
	{from}
	{centred}
	{listLabel}
	{paneLabel}
	bind:paneRef
	data-testid="split"
>
	{#snippet list()}
		<h1>Λίστα</h1>
		<p>Γραμμή πρώτη</p>
	{/snippet}
	<h2>Λεπτομέρεια</h2>
</SplitView>
