<script lang="ts">
	import { untrack } from 'svelte';
	import { getSession, type Session } from '$shared/state/session';

	let { onSession }: { onSession: (session: Session) => void } = $props();

	// The session of the tree it sits in, handed to the test once (precedent: the sign-up's `draft-probe.harness`).
	const session = getSession();
	untrack(() => onSession(session));
</script>
