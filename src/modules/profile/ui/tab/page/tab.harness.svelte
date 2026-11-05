<script lang="ts">
	import { setSession, type Session } from '$shared/state/session';
	import ProfileTab from './index.svelte';
	import type { ProfileTabProps } from '../types';

	let { session, ...props }: ProfileTabProps & { session: Session } = $props();

	// svelte-ignore state_referenced_locally
	setSession(session);
</script>

<ProfileTab {...props} />
