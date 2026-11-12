<script lang="ts">
	import { untrack } from 'svelte';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { useKeptThroughExpiry } from './use-kept.svelte';

	/** What a member's page read for its address: whose it is, and what it says. */
	type Read = { owner: string; words: string | null };

	let {
		start = 'member',
		bare = false,
		onReady
	}: {
		start?: SessionStatus;
		/** No `Session` above the page at all. */
		bare?: boolean;
		onReady?: (handle: {
			session: Session;
			current: () => Read | null;
			/** What the page's address names, what its own read answers, and whether that answer is «none». */
			set: (next: { key?: string | null; live?: Read | null; gone?: boolean }) => void;
			/** Who the session's read answers: a guest, a member, a member the server knows no patient for. */
			become: (status: SessionStatus, hasPatientProfile?: boolean) => void;
		}) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	let patient = $state(true);
	let key = $state<string | null>('new');
	let live = $state.raw<Read | null>(null);
	let gone = $state(false);

	// What the site's host does when a session ends (`auth/ui/host`): nobody from this moment, no personal read kept.
	const end = () => {
		status = 'guest';
		live = null;
	};
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: null, hasPatientProfile: patient } : null),
		signOut: async () => end(),
		expire: end
	});
	if (!untrack(() => bare)) setSession(session);

	const kept = useKeptThroughExpiry<Read>({
		key: () => key,
		live: () => live,
		gone: () => gone
	});

	untrack(() =>
		onReady?.({
			session,
			current: () => kept.current,
			set: (next) => {
				if ('key' in next) key = next.key ?? null;
				if ('live' in next) live = next.live ?? null;
				if ('gone' in next) gone = next.gone ?? false;
			},
			become: (next, hasPatientProfile = true) => {
				status = next;
				patient = hasPatientProfile;
			}
		})
	);
</script>

<!-- Tests only: what `useKeptThroughExpiry` answers a page, under a session the test ends and signs in again. -->
<pre data-testid="kept">{JSON.stringify(kept.current)}</pre>
