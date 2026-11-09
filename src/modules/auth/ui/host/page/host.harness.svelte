<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import AuthHost from './index.svelte';
	import Probe from './probe.harness.svelte';

	let {
		onSignedIn,
		onSignInAbandoned,
		client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 0 } }
		})
	}: { onSignedIn?: () => void; onSignInAbandoned?: () => void; client?: QueryClient } = $props();
</script>

<QueryClientProvider {client}>
	<AuthHost {onSignInAbandoned}>
		<Probe {onSignedIn} />
	</AuthHost>
</QueryClientProvider>
