<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import type { DoctorServiceSubject } from '../types';
	import DoctorService from './index.svelte';

	let {
		client,
		subject,
		session,
		toasts = new ToastState(),
		locale = 'el',
		onClose = () => {}
	}: {
		client: QueryClient;
		subject: DoctorServiceSubject;
		session?: Session;
		toasts?: ToastState;
		locale?: 'el' | 'en';
		onClose?: () => void;
	} = $props();

	untrack(() => {
		if (session) setSession(session);
		setToasts(toasts);
	});
</script>

<!-- Tests only: the page of one service under the page tree's query client, the layout's session and its toast. -->
<QueryClientProvider {client}>
	<DoctorService {locale} {subject} servicesHref="/doctor/profile/services" {onClose} />
</QueryClientProvider>
