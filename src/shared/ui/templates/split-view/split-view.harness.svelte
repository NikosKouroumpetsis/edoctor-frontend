<script lang="ts">
	import {
		SplitView,
		SplitViewFoldButton,
		type SplitViewFrom,
		type SplitViewWidths
	} from './index';

	let {
		open,
		solo,
		widths,
		from,
		centred,
		listLabel,
		paneLabel,
		fold = false,
		folded = $bindable(false),
		onFolded,
		onPane
	}: {
		open?: boolean;
		solo?: boolean;
		widths?: SplitViewWidths;
		from?: SplitViewFrom;
		centred?: boolean;
		listLabel?: string;
		paneLabel?: string;
		/** The menu has a rail to fold to, and a fold button in each. */
		fold?: boolean;
		folded?: boolean;
		onFolded?: (folded: boolean) => void;
		onPane?: (pane: HTMLDivElement | null) => void;
	} = $props();

	let paneRef = $state<HTMLDivElement | null>(null);
	$effect(() => onPane?.(paneRef));
	$effect(() => onFolded?.(folded));
</script>

{#snippet strip()}
	<SplitViewFoldButton label="Άνοιγμα του μενού" />
	<a href="#first" aria-label="Πρώτη ενότητα" class="grid size-touch place-items-center">1</a>
{/snippet}

<SplitView
	{open}
	{solo}
	{widths}
	{from}
	{centred}
	{listLabel}
	{paneLabel}
	rail={fold ? strip : undefined}
	bind:folded
	bind:paneRef
	data-testid="split"
>
	{#snippet list()}
		<h1>Λίστα</h1>
		<SplitViewFoldButton label="Σύμπτυξη του μενού" />
		<p>Γραμμή πρώτη</p>
	{/snippet}
	<h2>Λεπτομέρεια</h2>
</SplitView>
