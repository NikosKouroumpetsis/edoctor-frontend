<script lang="ts">
	import { setOnboardingDraft, useOnboardingDraft } from '../hooks/onboarding-draft.svelte';
	import type { OnboardingDraftHostProps } from '../types';

	let { children }: OnboardingDraftHostProps = $props();

	// 🔴 U-112.2: the sign-up's draft lives above every page of the site, one per page tree (the root layout's).
	setOnboardingDraft(useOnboardingDraft());
</script>

<!-- 🔴 U-112.2 (P-W3 §3.1): what a doctor wrote on the sign-up's screens, kept while they go back and forth, from link to
     link and to any other page of the site and back; the server's progress refills a new page (a reload, another device).
     It draws nothing. -->
{@render children()}
