<script lang="ts">
	import { SplitView, type SplitViewWidths } from './index';

	let {
		open,
		solo,
		widths,
		listLabel,
		paneLabel,
		onPane
	}: {
		open?: boolean;
		solo?: boolean;
		widths?: SplitViewWidths;
		listLabel?: string;
		paneLabel?: string;
		onPane?: (pane: HTMLDivElement | null) => void;
	} = $props();

	let paneRef = $state<HTMLDivElement | null>(null);
	$effect(() => onPane?.(paneRef));
</script>

<SplitView {open} {solo} {widths} {listLabel} {paneLabel} bind:paneRef data-testid="split">
	{#snippet list()}
		<h1>Λίστα</h1>
		<p>Γραμμή πρώτη</p>
	{/snippet}
	<h2>Λεπτομέρεια</h2>
</SplitView>
