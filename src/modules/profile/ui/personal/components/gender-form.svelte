<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import {
		personalGenderOptions,
		personalWriteFailureMessage
	} from '$modules/profile/lib/personal';
	import type { PersonalGender } from '$modules/profile/types';
	import { OptionList } from '$modules/profile/ui/language';
	import type { Personal } from '../hooks/use-personal.svelte';
	import SaveButton from './save-button.svelte';

	let { locale, personal }: { locale: SupportedLocale; personal: Personal } = $props();

	const options = $derived({ locale });
	const stored = untrack(() => personal.person?.gender ?? null);

	let chosen = $state<PersonalGender | null>(stored);
	let error = $state<string | undefined>(undefined);
	let failure = $state<string | null>(null);
	let pending = $state(false);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (pending) return;
		failure = null;
		if (!chosen) {
			error = m.profile_personal_gender_error({}, options);
			return;
		}
		// The same one again: nothing to send (a write that changes nothing is a `422`), the row closes.
		if (chosen === stored) {
			personal.setOpen('gender', false);
			return;
		}
		pending = true;
		try {
			const refusal = await personal.saveGender(chosen);
			if (refusal) failure = personalWriteFailureMessage(refusal, options);
			else await personal.done('gender', m.profile_personal_messages_saved({}, options));
		} finally {
			pending = false;
		}
	}
</script>

<!-- «Φύλο» open (record §5.3; U-112): the contract's four, one under the other — a press marks one, «Αποθήκευση» keeps
     it (`PUT /user/me`). It is changed, never removed. -->
<form novalidate class="flex flex-col gap-4" onsubmit={save}>
	<div>
		<OptionList
			label={m.profile_personal_gender_title({}, options)}
			value={chosen ?? ''}
			options={personalGenderOptions(options)}
			onChoose={(value) => {
				chosen = value as PersonalGender;
				error = undefined;
			}}
			testId="personal-gender-option"
		/>
		{#if error}
			<FieldMessage {error} data-testid="personal-gender-error" />
		{/if}
	</div>
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
