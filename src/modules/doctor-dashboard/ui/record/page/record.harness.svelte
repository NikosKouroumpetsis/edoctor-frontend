<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import {
		setDoctorPatientMemory,
		type DoctorPatientMemory
	} from '$modules/doctor-dashboard/ui/memory';
	import DoctorRecord from './index.svelte';
	import type { DoctorRecordLinks } from '../types';

	let {
		client,
		recordId,
		links,
		memory = null,
		session = null,
		locale = 'el'
	}: {
		client: QueryClient;
		recordId: string;
		links: DoctorRecordLinks;
		memory?: DoctorPatientMemory | null;
		session?: Session | null;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		if (memory) setDoctorPatientMemory(memory);
		if (session) setSession(session);
	});
</script>

<!-- Tests only: «Στοιχεία ασθενή» under the page tree's query client. -->
<QueryClientProvider {client}>
	<DoctorRecord {locale} {recordId} {links} />
</QueryClientProvider>
