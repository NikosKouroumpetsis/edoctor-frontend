<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import { sampleDescriptionReader } from '$modules/doctor-dashboard/api/profile/profile.sample';
	import type { DoctorProfileAddress } from '$modules/doctor-dashboard/lib/paths';
	import DoctorProfile from './index.svelte';

	let {
		client,
		session,
		toasts = new ToastState(),
		locale = 'el',
		address
	}: {
		client: QueryClient;
		session?: Session;
		toasts?: ToastState;
		locale?: 'el' | 'en';
		address?: DoctorProfileAddress;
	} = $props();

	untrack(() => {
		if (session) setSession(session);
		setToasts(toasts);
	});
</script>

<!-- Tests only: «Το προφίλ μου» under the page tree's query client, the layout's session and its toast; the description's
     reader is the sample's (the screen hands in the public page's own). -->
<QueryClientProvider {client}>
	<DoctorProfile {locale} {address} readDescription={sampleDescriptionReader} />
</QueryClientProvider>
