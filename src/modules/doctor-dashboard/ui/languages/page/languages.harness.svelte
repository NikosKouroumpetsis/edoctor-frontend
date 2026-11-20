<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import DoctorLanguages from './index.svelte';

	let {
		client,
		session,
		locale = 'el'
	}: {
		client: QueryClient;
		session?: Session;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		if (session) setSession(session);
	});
</script>

<!-- Tests only: «Γλώσσες και κοινωνικά δίκτυα» under the page tree's query client and the layout's session. -->
<QueryClientProvider {client}>
	<DoctorLanguages
		{locale}
		links={{
			profile: '/doctor/profile',
			spoken: '/doctor/profile/languages/spoken',
			networks: '/doctor/profile/languages/networks'
		}}
	/>
</QueryClientProvider>
