<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import {
		setDoctorPatientMemory,
		type DoctorPatientMemory
	} from '$modules/doctor-dashboard/ui/memory';
	import DoctorMerge from './index.svelte';
	import type { DoctorMergeLinks } from '../types';

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
		links: DoctorMergeLinks;
		memory?: DoctorPatientMemory | null;
		session?: Session | null;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		if (memory) setDoctorPatientMemory(memory);
		if (session) setSession(session);
	});
</script>

<!-- Tests only: the join of screen 73 under the page tree's query client. -->
<QueryClientProvider {client}>
	<DoctorMerge {locale} {recordId} {links} />
</QueryClientProvider>
