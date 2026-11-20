<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import type { DoctorArticlesLinks } from '../types';
	import DoctorArticles from './index.svelte';

	let {
		client,
		links,
		session,
		locale = 'el'
	}: {
		client: QueryClient;
		links: DoctorArticlesLinks;
		session?: Session;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		if (session) setSession(session);
	});
</script>

<!-- Tests only: «Τα άρθρα μου» under the page tree's query client and the layout's session. -->
<QueryClientProvider {client}>
	<DoctorArticles {locale} {links} />
</QueryClientProvider>
