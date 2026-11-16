<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import type { DoctorPatientsAddress } from '$modules/doctor-dashboard/lib/paths';
	import DoctorPatients from './index.svelte';
	import type { DoctorPatientsLinks } from '../types';

	let {
		client,
		address,
		links,
		locale = 'el'
	}: {
		client: QueryClient;
		address: DoctorPatientsAddress;
		links: DoctorPatientsLinks;
		locale?: 'el' | 'en';
	} = $props();
</script>

<!-- Tests only: «Οι ασθενείς μου» under the page tree's query client, a stand-in card as its pane. -->
<QueryClientProvider {client}>
	<DoctorPatients {locale} {address} {links}>
		{#snippet pane()}
			<p data-testid="pane">
				{address.view === 'card' ? `${address.key.kind}:${address.key.id}` : ''}
			</p>
		{/snippet}
	</DoctorPatients>
</QueryClientProvider>
