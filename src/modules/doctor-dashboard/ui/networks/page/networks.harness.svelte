<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import DoctorNetworks from './index.svelte';

	let {
		client,
		session,
		toasts = new ToastState(),
		locale = 'el',
		onClose = () => {}
	}: {
		client: QueryClient;
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

<!-- Tests only: the page of the four links under the page tree's query client, the layout's session and its toast. -->
<QueryClientProvider {client}>
	<DoctorNetworks {locale} languagesHref="/doctor/profile/languages" {onClose} />
</QueryClientProvider>
