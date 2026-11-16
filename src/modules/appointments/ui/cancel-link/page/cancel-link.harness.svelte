<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import AppointmentCancelLink from './index.svelte';

	let {
		client,
		token,
		locale = 'el'
	}: { client: QueryClient; token: string | null; locale?: 'el' | 'en' } = $props();
</script>

<!-- Tests only: the cancel link's page under the page tree's query client (no session: a guest's page). -->
<QueryClientProvider {client}>
	<AppointmentCancelLink {locale} {token} />
</QueryClientProvider>
