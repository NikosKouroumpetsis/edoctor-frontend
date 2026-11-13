<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { createForm, Validators } from '$shared/lib/form';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { PERSONAL_NAME_MAX_LENGTH } from '$modules/profile/config/personal';
	import { personalWriteFailureMessage, toNamePatch } from '$modules/profile/lib/personal';
	import type { Personal } from '../hooks/use-personal.svelte';
	import { focusFirstInvalid } from '../lib/focus';
	import SaveButton from './save-button.svelte';

	let { locale, personal }: { locale: SupportedLocale; personal: Personal } = $props();

	const options = $derived({ locale });
	// What is on file when the row opened: a name is no hidden value, so its two halves start filled.
	const stored = untrack(() => ({
		firstName: personal.person?.firstName ?? null,
		lastName: personal.person?.lastName ?? null
	}));

	let root = $state<HTMLFormElement | null>(null);
	let failure = $state<string | null>(null);
	let pending = $state(false);

	const form = createForm({
		initialValues: { firstName: stored.firstName ?? '', lastName: stored.lastName ?? '' },
		validators: {
			firstName: [Validators.required, Validators.maxLength(PERSONAL_NAME_MAX_LENGTH)],
			lastName: [Validators.required, Validators.maxLength(PERSONAL_NAME_MAX_LENGTH)]
		},
		messages: untrack(() => {
			const first = m.profile_personal_name_errors_first_name({}, { locale });
			const last = m.profile_personal_name_errors_last_name({}, { locale });
			return {
				firstName: { required: first, maxLength: first },
				lastName: { required: last, maxLength: last }
			};
		}),
		onSubmit: async (values) => {
			const patch = toNamePatch(values, stored);
			// Nothing differs from what is on file once trimmed: nothing to send, the row closes.
			if (!patch) {
				personal.setOpen('name', false);
				return;
			}
			pending = true;
			try {
				const refusal = await personal.saveName(patch);
				if (refusal) failure = personalWriteFailureMessage(refusal, options);
				else await personal.done('name', m.profile_personal_messages_saved({}, options));
			} finally {
				pending = false;
			}
		}
	});

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (pending) return;
		failure = null;
		await form.handleSubmit();
		if (!form.isValid) await focusFirstInvalid(root);
	}
</script>

<!-- «Ονοματεπώνυμο» open (record §5.3): «Όνομα», «Επώνυμο» — both asked for, each stopping at the server's 100 (U-65.6) —
     and «Αποθήκευση». Only a name that differs travels (`PATCH /patient/me/profile`); what was typed shows back as text. -->
<form bind:this={root} novalidate class="flex flex-col gap-4" onsubmit={save}>
	<div class="grid gap-3 tablet:grid-cols-2">
		<TextField
			field={form.field('firstName')}
			label={m.profile_personal_name_first_name({}, options)}
			size="lg"
			autocomplete="given-name"
			maxlength={PERSONAL_NAME_MAX_LENGTH}
			data-testid="personal-first-name-input"
		/>
		<TextField
			field={form.field('lastName')}
			label={m.profile_personal_name_last_name({}, options)}
			size="lg"
			autocomplete="family-name"
			maxlength={PERSONAL_NAME_MAX_LENGTH}
			data-testid="personal-last-name-input"
		/>
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
