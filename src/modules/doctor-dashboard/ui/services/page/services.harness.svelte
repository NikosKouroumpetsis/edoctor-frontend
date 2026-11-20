<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import {
		doctorProfileNewServicePath,
		doctorProfileServicePath
	} from '$modules/doctor-dashboard/lib/paths';
	import DoctorServices from './index.svelte';

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

<!-- Tests only: «Υπηρεσίες και τιμές» under the page tree's query client and the layout's session. -->
<QueryClientProvider {client}>
	<DoctorServices
		{locale}
		links={{
			profile: '/doctor/profile',
			service: (id) => doctorProfileServicePath(id),
			catalogue: doctorProfileNewServicePath
		}}
	/>
</QueryClientProvider>
