<script lang="ts">
	import { untrack } from 'svelte';
	import { setSession, type Session } from '$shared/state/session';
	import OnboardingDraftHost from './index.svelte';
	import Page from './draft-host-page.harness.svelte';
	import type { OnboardingDraft } from '../hooks/onboarding-draft.svelte';

	let {
		session,
		page = 'basic',
		onDraft
	}: {
		session?: Session;
		/** The page of the site on show: two steps of the sign-up, or another page (the Help Centre). */
		page?: 'basic' | 'office' | 'help';
		onDraft?: (draft: OnboardingDraft) => void;
	} = $props();

	untrack(() => {
		if (session) setSession(session);
	});
</script>

<!-- 🔴 U-112.2: the root layout's host and, under it, one page at a time: a new page is a new component (`#key`), as a
     route change makes one, while the host stays. -->
<OnboardingDraftHost>
	{#key page}
		<Page {page} {onDraft} />
	{/key}
</OnboardingDraftHost>
