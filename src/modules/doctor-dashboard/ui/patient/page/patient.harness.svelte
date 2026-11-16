<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import type { DoctorPatientAddressKey } from '$modules/doctor-dashboard/lib/paths';
	import {
		setDoctorPatientMemory,
		type DoctorPatientMemory
	} from '$modules/doctor-dashboard/ui/memory';
	import DoctorPatient from './index.svelte';
	import type { DoctorPatientLinks } from '../types';

	let {
		client,
		patientKey,
		links,
		memory = null,
		locale = 'el'
	}: {
		client: QueryClient;
		patientKey: DoctorPatientAddressKey;
		links: DoctorPatientLinks;
		/** The screen's memory of what «Στοιχεία ασθενή» or the join just wrote (D-W51-76). */
		memory?: DoctorPatientMemory | null;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		if (memory) setDoctorPatientMemory(memory);
	});
</script>

<!-- Tests only: a patient's card under the page tree's query client. -->
<QueryClientProvider {client}>
	<DoctorPatient {locale} {patientKey} {links} />
</QueryClientProvider>
