<script lang="ts">
	import { untrack } from 'svelte';
	import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
	import { removePersonalQueries } from '$shared/query';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import UnreadHost from './index.svelte';
	import Reader from './unread-reader.harness.svelte';

	let {
		start,
		onRetry,
		onReady
	}: {
		start: SessionStatus;
		onRetry?: () => void;
		onReady?: (handle: {
			session: Session;
			client: QueryClient;
			answer: (next: SessionStatus) => void;
		}) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	const client = useQueryClient();
	const session = setSession(
		new Session({
			status: () => status,
			member: () => (status === 'member' ? { firstName: 'Μαρία' } : null),
			// What the site's host does at a sign-out (`auth/ui/host`): nobody, no personal read kept.
			signOut: async () => {
				status = 'guest';
				removePersonalQueries(client);
			},
			retry: () => onRetry?.()
		})
	);
	untrack(() => onReady?.({ session, client, answer: (next) => (status = next) }));
</script>

<!-- Tests only: the notifications' host under a session, as the root layout composes it. -->
<UnreadHost>
	<Reader />
</UnreadHost>
