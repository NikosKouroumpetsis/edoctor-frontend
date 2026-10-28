<script lang="ts">
	import { untrack } from 'svelte';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { FullscreenModalTemplate, type FullscreenModalContentGap } from './index';

	let {
		initialOpen = true,
		contentGap,
		hideContentFromA11y,
		withOverlay = false,
		onClose = () => {}
	}: {
		withOverlay?: boolean;
		initialOpen?: boolean;
		contentGap?: FullscreenModalContentGap;
		hideContentFromA11y?: boolean;
		onClose?: () => void;
	} = $props();

	let open = $state(untrack(() => initialOpen));
</script>

<button type="button" class="size-touch" onclick={() => (open = true)}>Αναζήτηση</button>
<FullscreenModalTemplate
	bind:open
	title="Φίλτρα"
	closeLabel="Κλείσιμο φίλτρων"
	closeTestId="filters-close"
	{contentGap}
	{hideContentFromA11y}
	{onClose}
	data-testid="filters"
>
	<button type="button" class="size-touch">Επιλογή</button>
	{#snippet overlay()}
		{#if withOverlay}
			<div data-testid="overlay" class="absolute inset-0 bg-background p-4">Πάνελ αναζήτησης</div>
		{/if}
	{/snippet}
	{#snippet footer()}
		<ActionBar
			preset="filters"
			primaryLabel="Εμφάνιση 12"
			secondaryLabel="Εκκαθάριση"
			onPrimaryClick={() => {}}
			onSecondaryClick={() => {}}
		/>
	{/snippet}
</FullscreenModalTemplate>
