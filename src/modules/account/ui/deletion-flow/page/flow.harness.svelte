<script lang="ts">
	import { untrack } from 'svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { removePersonalQueries } from '$shared/query';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import DeletionDone from '../components/done.svelte';
	import { useAccountDeletion } from '../hooks/use-deletion.svelte';
	import type { DeletionFlowStep } from '../types';
	import DeletionFlow from './index.svelte';

	let {
		start = 'member',
		step = 'review',
		locale = 'el',
		onReady
	}: {
		start?: SessionStatus;
		step?: DeletionFlowStep;
		locale?: SupportedLocale;
		onReady?: (handle: {
			session: Session;
			/** The address the screen is on (it opens the code step when a code is out). */
			step: () => DeletionFlowStep;
			go: (next: DeletionFlowStep) => void;
			/** The server no longer knows the session: the next time the page asks who is there, nobody. */
			serverForgets: () => void;
			/** How many times the page asked who is there again. */
			reads: () => number;
			deletions: () => number;
			hasCode: () => boolean;
		}) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	let current = $state<DeletionFlowStep>(untrack(() => step));
	let forgotten = false;
	let reads = 0;
	let deletions = 0;
	const client = useQueryClient();
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Ελένη', hasPatientProfile: true } : null),
		signOut: async () => {
			status = 'guest';
		},
		retry: () => {
			reads += 1;
			if (forgotten) status = 'guest';
		},
		deleted: () => {
			deletions += 1;
			status = 'guest';
			removePersonalQueries(client);
		}
	});
	setSession(session);
	const flow = useAccountDeletion({
		active: () => true,
		locale: () => locale,
		onCodeSent: () => (current = 'code')
	});
	untrack(() =>
		onReady?.({
			session,
			step: () => current,
			go: (next) => (current = next),
			serverForgets: () => (forgotten = true),
			reads: () => reads,
			deletions: () => deletions,
			hasCode: () => flow.hasCode
		})
	);
</script>

<!-- Tests only: the flow as its screen composes it — one state for both steps, the end in their place once done. -->
<p data-testid="flow-status">{status}</p>
{#if flow.done}
	<DeletionDone {locale} destination={flow.destination} homeHref="/" />
{:else}
	<DeletionFlow {locale} step={current} {flow} policyHref="/legal/privacy-policy" />
{/if}
