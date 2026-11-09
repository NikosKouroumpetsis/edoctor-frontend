<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import type { AuthLoginParams } from '$modules/auth/types';
	import type { Session } from '$shared/state/session';
	import AuthHost from '$modules/auth/ui/host';
	import LoginPage from './index.svelte';
	import SessionProbe from './session-probe.harness.svelte';

	let {
		params,
		onSignInAbandoned,
		onSession,
		client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 0 } }
		})
	}: {
		params: AuthLoginParams;
		onSignInAbandoned?: () => void;
		onSession?: (session: Session) => void;
		client?: QueryClient;
	} = $props();
</script>

<QueryClientProvider {client}>
	<AuthHost {onSignInAbandoned}>
		{#if onSession}<SessionProbe {onSession} />{/if}
		<LoginPage {params} />
	</AuthHost>
</QueryClientProvider>
