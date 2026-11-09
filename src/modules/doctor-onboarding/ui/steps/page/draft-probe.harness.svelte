<script lang="ts">
	import { untrack } from 'svelte';
	import {
		getOnboardingDraft,
		type OnboardingDraft
	} from '$modules/doctor-onboarding/ui/draft-host';

	let { onDraft }: { onDraft?: (draft: OnboardingDraft) => void } = $props();

	const draft = getOnboardingDraft();
	untrack(() => onDraft?.(draft));
</script>
