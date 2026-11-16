<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, type ToastState } from '$shared/ui/molecules/toast';
	import type { DoctorReasonStep } from '$modules/doctor-dashboard/lib/paths';
	import DoctorReason from './index.svelte';
	import type { DoctorReasonLinks } from '../types';

	let {
		toasts,
		client,
		appointmentId,
		step,
		links,
		session = null,
		locale = 'el'
	}: {
		toasts: ToastState;
		client: QueryClient;
		appointmentId: string;
		step: DoctorReasonStep;
		links: DoctorReasonLinks;
		session?: Session | null;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		setToasts(toasts);
		if (session) setSession(session);
	});
</script>

<!-- Tests only: screen 69 under the site frame's toast and the page tree's query client. -->
<QueryClientProvider {client}>
	<DoctorReason {locale} {appointmentId} {step} {links} />
</QueryClientProvider>
