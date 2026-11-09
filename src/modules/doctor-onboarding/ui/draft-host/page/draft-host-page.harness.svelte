<script lang="ts">
	import { untrack } from 'svelte';
	import { getOnboardingDraft, type OnboardingDraft } from '../hooks/onboarding-draft.svelte';

	let {
		page,
		onDraft
	}: { page: 'basic' | 'office' | 'help'; onDraft?: (draft: OnboardingDraft) => void } = $props();

	// What the server's progress holds for this made-up account (the screens' `fallback`).
	const progress = { firstName: 'Νίκος', lastName: 'Παπαδόπουλος', phone: '', gettingThere: '' };
	const draft = getOnboardingDraft();
	untrack(() => onDraft?.(draft));
	const valueOf = (event: Event) => (event.currentTarget as HTMLInputElement).value;
</script>

{#if page === 'basic'}
	<label>
		Όνομα
		<input
			class="min-h-touch w-full"
			value={draft.read('basicInfo', 'firstName', progress.firstName)}
			oninput={(event) => draft.update('basicInfo', { firstName: valueOf(event) })}
		/>
	</label>
	<label>
		Επώνυμο
		<input
			class="min-h-touch w-full"
			value={draft.read('basicInfo', 'lastName', progress.lastName)}
			oninput={(event) => draft.update('basicInfo', { lastName: valueOf(event) })}
		/>
	</label>
{:else if page === 'office'}
	<label>
		Τηλέφωνο ιατρείου
		<input
			class="min-h-touch w-full"
			value={draft.read('office', 'phone', progress.phone)}
			oninput={(event) => draft.update('office', { phone: valueOf(event) })}
		/>
	</label>
	<label>
		Οδηγίες
		<textarea
			class="min-h-touch w-full"
			value={draft.read('office', 'gettingThere', progress.gettingThere)}
			oninput={(event) => draft.update('office', { gettingThere: valueOf(event) })}
		></textarea>
	</label>
{:else}
	<p>Κέντρο βοήθειας</p>
{/if}
