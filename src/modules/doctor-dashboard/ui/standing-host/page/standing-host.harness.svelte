<script lang="ts">
	import { untrack } from 'svelte';
	import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
	import { removePersonalQueries } from '$shared/query';
	import type { DoctorStanding } from '$shared/state/doctor-standing';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import StandingHost from './index.svelte';
	import Reader from './standing-reader.harness.svelte';

	let {
		start,
		onReady
	}: {
		start: SessionStatus;
		onReady?: (handle: {
			session: Session;
			client: QueryClient;
			answer: (next: SessionStatus) => void;
			standing: () => DoctorStanding | undefined;
			expired: () => number;
		}) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	let expired = 0;
	let found = $state<DoctorStanding | undefined>(undefined);
	const client = useQueryClient();
	const session = setSession(
		new Session({
			status: () => status,
			member: () => (status === 'member' ? { firstName: 'Ελένη' } : null),
			// What the site's host does at a sign-out (`auth/ui/host`): nobody, no personal read kept.
			signOut: async () => {
				status = 'guest';
				removePersonalQueries(client);
			},
			expire: () => {
				expired += 1;
			}
		})
	);
	untrack(() =>
		onReady?.({
			session,
			client,
			answer: (next) => (status = next),
			standing: () => found,
			expired: () => expired
		})
	);
</script>

<!-- Tests only: the doctor standing's host under a session, as the root layout composes it. -->
<StandingHost>
	<Reader onRead={(standing) => (found = standing)} />
</StandingHost>
