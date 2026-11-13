<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { DateOfBirthField } from '$shared/ui/molecules/date-of-birth-field';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { personalWriteFailureMessage } from '$modules/profile/lib/personal';
	import type { Personal } from '../hooks/use-personal.svelte';
	import { focusFirstInvalid } from '../lib/focus';
	import SaveButton from './save-button.svelte';

	let { locale, personal }: { locale: SupportedLocale; personal: Personal } = $props();

	const options = $derived({ locale });
	const stored = untrack(() => personal.person?.birthDate ?? '');

	let root = $state<HTMLFormElement | null>(null);
	// The day as the field holds it (`YYYY-MM-DD`): empty while what is typed is no whole date yet, or one after today.
	let birthDate = $state(stored);
	let error = $state<string | undefined>(undefined);
	let failure = $state<string | null>(null);
	let pending = $state(false);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (pending) return;
		failure = null;
		// A date of birth is not removed (record §5.3): no whole date is the field's own refusal, and nothing is sent.
		if (!birthDate) {
			error = m.profile_personal_dob_error({}, options);
			await focusFirstInvalid(root);
			return;
		}
		error = undefined;
		if (birthDate === stored) {
			personal.setOpen('dob', false);
			return;
		}
		pending = true;
		try {
			const refusal = await personal.saveBirthDate(birthDate);
			if (!refusal) await personal.done('dob', m.profile_personal_messages_saved({}, options));
			else if (refusal === 'birth-date') {
				// The server's own 120 years (`422`): its words stand under the field.
				error = m.profile_personal_dob_error({}, options);
				await focusFirstInvalid(root);
			} else failure = personalWriteFailureMessage(refusal, options);
		} finally {
			pending = false;
		}
	}
</script>

<!-- «Ημερομηνία γέννησης» open (record §5.3): the kit's own date-of-birth field with its rules — a day up to today, the
     server's 120 years after it — as ONE field (the approved prototype), and «Αποθήκευση». It is changed, never removed. -->
<form bind:this={root} novalidate class="flex flex-col gap-4" onsubmit={save}>
	<DateOfBirthField
		variant="single"
		bind:value={birthDate}
		{error}
		label={m.profile_personal_dob_title({}, options)}
		size="lg"
	/>
	{#if failure}
		<InlineNotice variant="danger" role="alert" message={failure} testId="personal-failure" />
	{/if}
	<div>
		<SaveButton
			label={m.profile_personal_save({}, options)}
			loading={pending}
			testId="personal-save"
		/>
	</div>
</form>
