<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { AFM_LENGTH, AMKA_LENGTH, createForm, Validators } from '$shared/lib/form';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import {
		keepPersonalIdInput,
		personalIdLabel,
		personalIdMessage,
		personalWriteFailureMessage
	} from '$modules/profile/lib/personal';
	import type { PersonalIdKind } from '$modules/profile/types';
	import type { Personal } from '../hooks/use-personal.svelte';
	import { focusFirstInvalid } from '../lib/focus';
	import SaveButton from './save-button.svelte';

	let {
		locale,
		kind,
		filled,
		personal
	}: {
		locale: SupportedLocale;
		kind: PersonalIdKind;
		/** One is on file (the row showed its mask): «Νέο …» over the field, and «Αφαίρεση». */
		filled: boolean;
		personal: Personal;
	} = $props();

	const options = $derived({ locale });

	let root = $state<HTMLFormElement | null>(null);
	let failure = $state<string | null>(null);
	let pending = $state(false);

	// 🔴 U-168: the field opens EMPTY — the page never has the number, only the server's mask of it.
	const form = createForm({
		initialValues: { value: '' },
		validators: untrack(() => ({
			value:
				kind === 'amka'
					? [
							Validators.required,
							Validators.pattern(new RegExp(`^[0-9]{${AMKA_LENGTH}}$`, 'u')),
							Validators.amkaDate
						]
					: [
							Validators.required,
							Validators.pattern(new RegExp(`^[0-9]{${AFM_LENGTH}}$`, 'u')),
							Validators.afmCheckDigit
						]
		})),
		messages: untrack(() => {
			const length = personalIdMessage(kind, 'length', { locale });
			const invalid = personalIdMessage(kind, 'invalid', { locale });
			return {
				value: { required: length, pattern: length, amkaDate: invalid, afmCheckDigit: invalid }
			};
		}),
		onSubmit: (values) => send(values.value, () => m.profile_personal_messages_saved({}, options))
	});

	async function send(value: string | null, message: () => string) {
		pending = true;
		try {
			const refusal = await personal.saveIdentifier(kind, value);
			if (!refusal) await personal.done(kind, message());
			else if (refusal === 'invalid' && value !== null) {
				// Its length was right here, so the server refused the number itself (the ΑΜΚΑ's date, the ΑΦΜ's check digit).
				form.errors.value = personalIdMessage(kind, 'invalid', options);
				await focusFirstInvalid(root);
			} else failure = personalWriteFailureMessage(refusal, options);
		} finally {
			pending = false;
		}
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (pending) return;
		failure = null;
		await form.handleSubmit();
		if (!form.isValid) await focusFirstInvalid(root);
	}

	/** «Αφαίρεση»: the number is taken off the account (`null`), whatever is typed in the field. */
	function remove() {
		if (pending) return;
		failure = null;
		void send(null, () => m.profile_personal_messages_removed({}, options));
	}

	// The field shows only what it keeps (its digits, 11 / 9 at most): a letter typed or pasted leaves nothing behind.
	function keepDigits(event: Event & { currentTarget: HTMLInputElement }) {
		const kept = keepPersonalIdInput(kind, event.currentTarget.value);
		if (kept === event.currentTarget.value) return;
		event.currentTarget.value = kept;
		form.setValue('value', kept);
	}
</script>

<!-- «ΑΜΚΑ» / «ΑΦΜ» open (record §5.3): ONE field of digits — 🔴 U-168 it opens EMPTY, «Νέο ΑΜΚΑ · 11 ψηφία» over one on
     file — the relative's own checks before the write (11 / 9 digits, the ΑΜΚΑ's date, the ΑΦΜ's check digit),
     «Αποθήκευση», and «Αφαίρεση» only when one is on file (`PUT /patient/me`, `null`). -->
<form bind:this={root} novalidate class="flex flex-col gap-4" onsubmit={save}>
	<TextField
		field={form.field('value')}
		label={personalIdLabel(kind, filled, options)}
		size="lg"
		inputmode="numeric"
		autocomplete="off"
		spellcheck={false}
		oninput={keepDigits}
		data-testid={`personal-${kind}-input`}
	/>
	{#if failure}
		<InlineNotice variant="danger" role="alert" message={failure} testId="personal-failure" />
	{/if}
	<div class="flex flex-row flex-wrap items-center gap-x-5 gap-y-2">
		<SaveButton
			label={m.profile_personal_save({}, options)}
			loading={pending}
			testId="personal-save"
		/>
		{#if filled}
			<TextButton
				label={m.profile_personal_remove({}, options)}
				tone="danger"
				underline
				textClass="text-body-sm underline-offset-3"
				disabled={pending}
				data-testid="personal-remove"
				onclick={remove}
			/>
		{/if}
	</div>
</form>
