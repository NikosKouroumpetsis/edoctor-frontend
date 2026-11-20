<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { doctorProfileCvItemPath } from '$modules/doctor-dashboard/lib/paths';
	import DoctorCv from './index.svelte';

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

<!-- Tests only: «Βιογραφικό» under the page tree's query client and the layout's session. -->
<QueryClientProvider {client}>
	<DoctorCv
		{locale}
		links={{ profile: '/doctor/profile', item: (kind, id) => doctorProfileCvItemPath(kind, id) }}
	/>
</QueryClientProvider>
