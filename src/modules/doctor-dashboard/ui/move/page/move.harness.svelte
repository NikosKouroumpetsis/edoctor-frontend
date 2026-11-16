<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, type ToastState } from '$shared/ui/molecules/toast';
	import {
		setDoctorAppointmentMemory,
		type DoctorAppointmentMemory
	} from '$modules/doctor-dashboard/ui/memory';
	import DoctorMove from './index.svelte';
	import type { DoctorMoveLinks } from '../types';

	let {
		toasts,
		client,
		appointmentId,
		links,
		memory,
		session = null,
		locale = 'el'
	}: {
		toasts: ToastState;
		client: QueryClient;
		appointmentId: string;
		links: DoctorMoveLinks;
		memory: DoctorAppointmentMemory;
		session?: Session | null;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		setToasts(toasts);
		setDoctorAppointmentMemory(memory);
		if (session) setSession(session);
	});
</script>

<!-- Tests only: screen 70 «Αλλαγή ώρας» under the site frame's toast, the screen's memory and the page tree's query client. -->
<QueryClientProvider {client}>
	<DoctorMove {locale} {appointmentId} {links} />
</QueryClientProvider>
