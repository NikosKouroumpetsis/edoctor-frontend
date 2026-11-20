<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import DoctorPhotos from './index.svelte';

	let {
		client,
		session,
		toasts = new ToastState(),
		locale = 'el'
	}: {
		client: QueryClient;
		session?: Session;
		toasts?: ToastState;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		if (session) setSession(session);
		setToasts(toasts);
	});
</script>

<!-- Tests only: «Φωτογραφίες» under the page tree's query client, the layout's session and its toast. -->
<QueryClientProvider {client}>
	<DoctorPhotos
		{locale}
		links={{
			profile: '/doctor/profile',
			crop: (imageId) => `/doctor/profile/photos/${imageId}/crop`
		}}
	/>
</QueryClientProvider>
