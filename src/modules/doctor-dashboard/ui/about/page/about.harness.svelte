<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import type { DoctorDescriptionReader } from '$modules/doctor-dashboard/api/profile';
	import { sampleDescriptionReader } from '$modules/doctor-dashboard/api/profile/profile.sample';
	import DoctorAbout from './index.svelte';

	let {
		client,
		session,
		locale = 'el',
		readDescription = sampleDescriptionReader
	}: {
		client: QueryClient;
		session?: Session;
		locale?: 'el' | 'en';
		readDescription?: DoctorDescriptionReader;
	} = $props();

	untrack(() => {
		if (session) setSession(session);
	});
</script>

<!-- Tests only: «Όνομα και περιγραφή» under the page tree's query client and the layout's session; the description's
     reader is the sample's (the screen hands in the public page's own). -->
<QueryClientProvider {client}>
	<DoctorAbout {locale} links={{ profile: '/doctor/profile' }} {readDescription} />
</QueryClientProvider>
