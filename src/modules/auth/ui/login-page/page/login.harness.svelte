<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import type { AuthLoginParams } from '$modules/auth/types';
	import AuthHost from '$modules/auth/ui/host';
	import LoginPage from './index.svelte';

	let {
		params,
		onSignInAbandoned,
		client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 0 } }
		})
	}: { params: AuthLoginParams; onSignInAbandoned?: () => void; client?: QueryClient } = $props();
</script>

<QueryClientProvider {client}>
	<AuthHost {onSignInAbandoned}>
		<LoginPage {params} />
	</AuthHost>
</QueryClientProvider>
