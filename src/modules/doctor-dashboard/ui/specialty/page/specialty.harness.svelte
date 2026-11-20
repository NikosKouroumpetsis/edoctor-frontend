<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import DoctorSpecialty from './index.svelte';

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

<!-- Tests only: «Ειδικότητα και εξειδικεύσεις» under the page tree's query client and the layout's session. -->
<QueryClientProvider {client}>
	<DoctorSpecialty
		{locale}
		links={{
			profile: '/doctor/profile',
			specializations: '/doctor/profile/specialty/specializations'
		}}
	/>
</QueryClientProvider>
