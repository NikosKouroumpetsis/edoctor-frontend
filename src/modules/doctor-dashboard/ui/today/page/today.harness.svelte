<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setDoctorStanding, type DoctorStanding } from '$shared/state/doctor-standing';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, type ToastState } from '$shared/ui/molecules/toast';
	import type {
		DoctorAppointmentStep,
		DoctorAppointmentsTab
	} from '$modules/doctor-dashboard/lib/paths';
	import DoctorToday from './index.svelte';

	let {
		standing,
		toasts,
		client,
		session = null,
		locale = 'el',
		appointmentsHref = '/doctor/appointments',
		newAppointmentHref = '/doctor/appointments/new?from=today',
		appointmentHref = (id: string, tab: string) =>
			`/doctor/appointments/${id}${tab === 'upcoming' ? '' : `?tab=${tab}`}`,
		appointmentStepHref = (id: string, step: string, tab: string) =>
			`/doctor/appointments/${id}/${step}${tab === 'upcoming' ? '' : `?tab=${tab}`}`
	}: {
		standing: DoctorStanding;
		toasts: ToastState;
		client: QueryClient;
		session?: Session | null;
		locale?: 'el' | 'en';
		appointmentsHref?: string;
		newAppointmentHref?: string;
		appointmentHref?: (id: string, tab: DoctorAppointmentsTab) => string;
		appointmentStepHref?: (
			id: string,
			step: DoctorAppointmentStep,
			tab: DoctorAppointmentsTab
		) => string;
	} = $props();

	untrack(() => {
		setDoctorStanding(standing);
		setToasts(toasts);
		if (session) setSession(session);
	});
</script>

<!-- Tests only: «Σήμερα» under the layout's doctor standing, the site frame's toast and the page tree's query client. -->
<QueryClientProvider {client}>
	<DoctorToday
		{locale}
		{appointmentsHref}
		{newAppointmentHref}
		{appointmentHref}
		{appointmentStepHref}
	/>
</QueryClientProvider>
