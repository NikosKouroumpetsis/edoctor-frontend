<script lang="ts">
	import { untrack } from 'svelte';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import UnreadHost from './index.svelte';
	import Reader from './unread-reader.harness.svelte';

	let {
		start,
		onRetry,
		onReady,
		onSession
	}: {
		start: SessionStatus;
		onRetry?: () => void;
		onReady?: (setStatus: (next: SessionStatus) => void) => void;
		onSession?: (session: Session) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	const session = setSession(
		new Session({
			status: () => status,
			member: () => (status === 'member' ? { firstName: 'Μαρία' } : null),
			signOut: async () => undefined,
			retry: () => onRetry?.()
		})
	);
	untrack(() => onReady?.((next) => (status = next)));
	untrack(() => onSession?.(session));
</script>

<UnreadHost>
	<Reader />
</UnreadHost>
