<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import type { DoctorCredentialKind } from '$modules/doctor-dashboard/api/credentials';
	import DoctorCredential from './index.svelte';

	let {
		client,
		session,
		toasts = new ToastState(),
		locale = 'el',
		kind = 'WORK',
		id = null,
		onClose = () => {}
	}: {
		client: QueryClient;
		session?: Session;
		toasts?: ToastState;
		locale?: 'el' | 'en';
		kind?: DoctorCredentialKind;
		id?: string | null;
		onClose?: () => void;
	} = $props();

	untrack(() => {
		if (session) setSession(session);
		setToasts(toasts);
	});
</script>

<!-- Tests only: the page of one row of the biography under the page tree's query client, the layout's session and its
     toast. -->
<QueryClientProvider {client}>
	<DoctorCredential {locale} {kind} {id} cvHref="/doctor/profile/cv" {onClose} />
</QueryClientProvider>
