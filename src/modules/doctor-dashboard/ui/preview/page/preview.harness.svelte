<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import type { DoctorProfilePreviewAnswer } from '$modules/doctor-dashboard/api/profile';
	import DoctorProfilePreview from './index.svelte';

	let {
		client,
		session,
		locale = 'el'
	}: { client: QueryClient; session?: Session; locale?: 'el' | 'en' } = $props();

	untrack(() => {
		if (session) setSession(session);
	});

	/** A stand-in for the public profile's reader: the doctor's name, or nothing for `doctor: null`. */
	const read = (answer: DoctorProfilePreviewAnswer) =>
		answer.doctor ? { name: answer.doctor.fullName ?? '' } : null;
</script>

<!-- Tests only: «Δείτε πώς σας βλέπουν» under the page tree's query client, stand-ins for the public profile's page. -->
<QueryClientProvider {client}>
	<DoctorProfilePreview {locale} {read}>
		{#snippet page({ profile, readAt })}
			<article data-testid="public-page" data-read-at={readAt}>{profile.name}</article>
		{/snippet}
		{#snippet missing()}
			<p data-testid="public-missing">404</p>
		{/snippet}
	</DoctorProfilePreview>
</QueryClientProvider>
