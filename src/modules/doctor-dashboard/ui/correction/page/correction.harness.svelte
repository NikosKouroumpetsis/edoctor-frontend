<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, type ToastState } from '$shared/ui/molecules/toast';
	import {
		setDoctorAppointmentMemory,
		type DoctorAppointmentMemory
	} from '$modules/doctor-dashboard/ui/memory';
	import DoctorCorrection from './index.svelte';
	import type { DoctorCorrectionLinks } from '../types';

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
		links: DoctorCorrectionLinks;
		session?: Session | null;
		/** The screen's memory the 68's green card reads (D-W51-62). */
		memory?: DoctorAppointmentMemory | null;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		setToasts(toasts);
		if (session) setSession(session);
		if (memory) setDoctorAppointmentMemory(memory);
	});
</script>

<!-- Tests only: screen 71 under the site frame's toast, the screen's memory and the page tree's query client. -->
<QueryClientProvider {client}>
	<DoctorCorrection {locale} {appointmentId} {links} />
</QueryClientProvider>
