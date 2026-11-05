<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import SearchDoctorCard from './index.svelte';

	let { status, card }: { status: SessionStatus; card: ComponentProps<typeof SearchDoctorCard> } =
		$props();

	setSession(
		new Session({
			status: () => status,
			member: () => null,
			signOut: async () => undefined
		})
	);
</script>

<!-- Tests only: the card under a session. -->
<SearchDoctorCard {...card} />
