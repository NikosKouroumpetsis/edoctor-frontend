<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import AuthHost from './index.svelte';
	import Probe from './probe.harness.svelte';

	let {
		onSignedIn,
		onSignInAbandoned
	}: { onSignedIn?: () => void; onSignInAbandoned?: () => void } = $props();

	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 0 } }
	});
</script>

<QueryClientProvider {client}>
	<AuthHost {onSignInAbandoned}>
		<Probe {onSignedIn} />
	</AuthHost>
</QueryClientProvider>
