<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import DoctorPhotoCrop from './index.svelte';

	let {
		client,
		imageId,
		onClose,
		session,
		toasts = new ToastState(),
		locale = 'el'
	}: {
		client: QueryClient;
		imageId: string;
		onClose: () => void;
		session?: Session;
		toasts?: ToastState;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		if (session) setSession(session);
		setToasts(toasts);
	});
</script>

<!-- Tests only: «Προσαρμογή» under the page tree's query client, the layout's session and its toast. -->
<QueryClientProvider {client}>
	<DoctorPhotoCrop {locale} {imageId} photosHref="/doctor/profile/photos" {onClose} />
</QueryClientProvider>
