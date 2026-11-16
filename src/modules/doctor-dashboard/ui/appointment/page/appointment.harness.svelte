<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, type ToastState } from '$shared/ui/molecules/toast';
	import {
		setDoctorAppointmentMemory,
		type DoctorAppointmentMemory
	} from '$modules/doctor-dashboard/ui/memory';
	import DoctorAppointment from './index.svelte';
	import type { DoctorAppointmentLinks } from '../types';

	let {
		toasts,
		client,
		appointmentId,
		links,
		session = null,
		memory = null,
		locale = 'el'
	}: {
		toasts: ToastState;
		client: QueryClient;
		appointmentId: string;
		links: DoctorAppointmentLinks;
		session?: Session | null;
		/** The screen's memory of what screen 70 just saved (D-W51-51 / 52). */
		memory?: DoctorAppointmentMemory | null;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		setToasts(toasts);
		if (session) setSession(session);
		if (memory) setDoctorAppointmentMemory(memory);
	});
</script>

<!-- Tests only: «Το ραντεβού» under the site frame's toast and the page tree's query client. -->
<QueryClientProvider {client}>
	<DoctorAppointment {locale} {appointmentId} {links} />
</QueryClientProvider>
