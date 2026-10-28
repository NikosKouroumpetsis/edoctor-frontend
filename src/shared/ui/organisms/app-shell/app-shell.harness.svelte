<script lang="ts">
	import { AppHeader } from '$shared/ui/organisms/app-header';
	import { AppShell } from './index';

	let { skipLinkLabel }: { skipLinkLabel?: string } = $props();
</script>

<AppShell {skipLinkLabel}>
	{#snippet header()}
		<AppHeader>
			{#snippet brand()}
				<a href="#home" class="inline-flex min-h-touch min-w-touch items-center">Αρχική</a>
			{/snippet}
		</AppHeader>
	{/snippet}
	<p>Περιεχόμενο σελίδας</p>
	{#snippet footer()}
		<footer>Υποσέλιδο</footer>
	{/snippet}
	{#snippet bottomNav()}
		<nav aria-label="Κάτω μπάρα">Μπάρα</nav>
	{/snippet}
</AppShell>
