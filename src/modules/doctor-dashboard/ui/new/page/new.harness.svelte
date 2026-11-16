<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, type ToastState } from '$shared/ui/molecules/toast';
	import type {
		DoctorNewAppointmentOrigin,
		DoctorNewAppointmentPatientKey
	} from '$modules/doctor-dashboard/lib/paths';
	import {
		setDoctorAppointmentMemory,
		type DoctorAppointmentMemory
	} from '$modules/doctor-dashboard/ui/memory';
	import DoctorNew from './index.svelte';
	import type { DoctorNewLinks } from '../types';

	let {
		toasts,
		client,
		links,
		memory,
		from = 'list',
		patient = null,
		session = null,
		locale = 'el'
	}: {
		toasts: ToastState;
		client: QueryClient;
		links: DoctorNewLinks;
		memory: DoctorAppointmentMemory;
		from?: DoctorNewAppointmentOrigin;
		patient?: DoctorNewAppointmentPatientKey | null;
		session?: Session | null;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		setToasts(toasts);
		setDoctorAppointmentMemory(memory);
		if (session) setSession(session);
	});
</script>

<!-- Tests only: screen 72 «Νέο ραντεβού» under the site frame's toast, the screen's memory and the page tree's query client. -->
<QueryClientProvider {client}>
	<DoctorNew {locale} {from} {patient} {links} />
</QueryClientProvider>
