<script lang="ts">
	import type { AppointmentsListPageProps } from '../types';
	import AppointmentsList from './index.svelte';

	let props: Omit<AppointmentsListPageProps, 'pane'> = $props();
</script>

<!-- Tests only: the list's page with a right column of its own (the screen's `pane`). -->
<AppointmentsList {...props}>
	{#snippet pane({ opening }: { opening: boolean })}
		<p data-testid="pane-content" data-opening={opening || undefined}>Το ραντεβού</p>
	{/snippet}
</AppointmentsList>
