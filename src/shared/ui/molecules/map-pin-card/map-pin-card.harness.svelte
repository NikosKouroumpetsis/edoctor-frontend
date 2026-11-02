<script lang="ts">
	import { MapPinCard } from './index';

	let {
		imageUrl = null,
		withBadge = false,
		onClose = () => {},
		onLine
	}: {
		imageUrl?: string | null;
		withBadge?: boolean;
		onClose?: () => void;
		onLine?: () => void;
	} = $props();
</script>

<MapPinCard
	href="/doctors/a-pappas"
	linkLabel="Προφίλ Α. Παππάς"
	{imageUrl}
	closeLabel="Κλείσιμο"
	{onClose}
	testId="pin-card"
>
	{#snippet badge()}
		{#if withBadge}
			<span data-testid="badge">Επιλογή</span>
		{/if}
	{/snippet}
	<span class="text-body-sm font-semibold text-foreground">Α. Παππάς</span>
	<span class="text-label-lg text-muted-foreground">Καρδιολόγος · Αμπελόκηποι</span>
	{#if onLine}
		<button type="button" class="min-h-touch min-w-touch" onclick={() => onLine()}
			>Ενέργεια γραμμής</button
		>
	{/if}
</MapPinCard>
