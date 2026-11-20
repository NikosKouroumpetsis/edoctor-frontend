<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import DoctorReviewReply from './index.svelte';

	let {
		client,
		ratingId,
		session,
		toasts = new ToastState(),
		locale = 'el'
	}: {
		client: QueryClient;
		ratingId: string;
		session?: Session;
		toasts?: ToastState;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		if (session) setSession(session);
		setToasts(toasts);
	});
</script>

<!-- Tests only: the reply to one review under the page tree's query client, the layout's session and its toast. -->
<QueryClientProvider {client}>
	<DoctorReviewReply {locale} {ratingId} reviewsHref={`/doctor/reviews?review=${ratingId}`} />
</QueryClientProvider>
