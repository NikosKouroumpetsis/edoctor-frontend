<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import type { DoctorReviewsChoice } from '$modules/doctor-dashboard/lib/paths';
	import type { DoctorReviewsLinks } from '../types';
	import DoctorReviews from './index.svelte';

	let {
		client,
		links,
		filter = 'all',
		reviewId = null,
		session,
		toasts = new ToastState(),
		locale = 'el'
	}: {
		client: QueryClient;
		links: DoctorReviewsLinks;
		filter?: DoctorReviewsChoice;
		reviewId?: string | null;
		session?: Session;
		toasts?: ToastState;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		if (session) setSession(session);
		setToasts(toasts);
	});
</script>

<!-- Tests only: «Κριτικές» under the page tree's query client, the layout's session and its toast. -->
<QueryClientProvider {client}>
	<DoctorReviews {locale} {filter} {reviewId} {links} />
</QueryClientProvider>
