<script lang="ts">
	import { untrack } from 'svelte';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import type { NotificationsScreenData } from '../types';
	import NotificationsScreen from './index.svelte';

	let {
		start = 'member',
		data,
		onReady
	}: {
		start?: SessionStatus;
		data: NotificationsScreenData;
		onReady?: (handle: { session: Session; answer: (next: SessionStatus) => void }) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	const session = setSession(
		new Session({
			status: () => status,
			member: () => (status === 'member' ? { firstName: 'Ελένη', hasPatientProfile: true } : null),
			signOut: async () => {
				status = 'guest';
			}
		})
	);
	untrack(() => onReady?.({ session, answer: (next) => (status = next) }));
</script>

<!-- Tests only: the `/notifications` screen under a session, as the site's root composes it. -->
<NotificationsScreen {data} />
