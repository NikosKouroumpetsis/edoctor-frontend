<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { EditableRow } from '$shared/ui/molecules/editable-row';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import BirthDateForm from '../components/birth-date-form.svelte';
	import EmailForm from '../components/email-form.svelte';
	import GenderForm from '../components/gender-form.svelte';
	import IdentifierForm from '../components/identifier-form.svelte';
	import NameForm from '../components/name-form.svelte';
	import Note from '../components/note.svelte';
	import PhoneForm from '../components/phone-form.svelte';
	import Skeleton from '../components/skeleton.svelte';
	import { usePersonal } from '../hooks/use-personal.svelte';
	import type { PersonalPageProps } from '../types';

	let props: PersonalPageProps = $props();

	const options = $derived({ locale: props.locale });
	const personal = usePersonal(() => props);

	// A challenge on its code step hides the row's line of help (the approved prototype): the step is the open row's.
	let codeStep = $state(false);
	$effect(() => {
		if (personal.openRow !== 'email' && personal.openRow !== 'phone') codeStep = false;
	});
</script>

{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

<!-- Wave 4.5 · screen 58 «Προσωπικά στοιχεία» (record §5.3; the approved prototype `58-personal/pers.js`), a section of
     the shell (its title and its «←» are the shell's). Seven rows «title · value · Επεξεργασία» — or «Δεν έχει δοθεί ·
     Προσθήκη» — ONE open at a time, IN its place at every width (the mobile too: no sheet, no window), the others faded,
     «Ακύρωση» on the right; closing a row drops whatever was typed in it. 🔴 U-168: the email, the mobile, the ΑΜΚΑ and
     the ΑΦΜ are printed exactly as the SERVER hides them and their fields open EMPTY; nothing typed reaches an address,
     a storage, a cache or a log. An account the server names no patient for reads the rows that have a source. Under
     the rows, the two boxes. -->
<div data-testid="personal-details" data-view={personal.view}>
	{#if personal.view === 'loading'}
		<Skeleton label={m.profile_account_settings_sections_personal({}, options)} />
	{:else if personal.view === 'failed'}
		<EmptyState
			titleAs="h3"
			title={m.profile_personal_read_failed_title({}, options)}
			description={m.profile_personal_read_failed_body({}, options)}
			actionLabel={m.profile_personal_read_failed_retry({}, options)}
			onActionPress={() => personal.retry()}
			actionTone="contrast"
			icon={errorGlyph}
			class="pt-section"
			testId="personal-details-failed"
		/>
	{:else}
		{#each personal.rows as row (row.id)}
			{@const open = personal.openRow === row.id}
			<EditableRow
				title={row.title}
				value={row.value ?? undefined}
				help={open && codeStep ? undefined : (row.help ?? undefined)}
				actionLabel={row.filled
					? m.profile_personal_edit({}, options)
					: m.profile_personal_add({}, options)}
				closeLabel={m.profile_personal_cancel({}, options)}
				{open}
				dimmed={personal.openRow !== null && !open}
				onOpenChange={(next) => personal.setOpen(row.id, next)}
				testId={`personal-row-${row.id}`}
			>
				{#if row.id === 'name'}
					<NameForm locale={props.locale} {personal} />
				{:else if row.id === 'dob'}
					<BirthDateForm locale={props.locale} {personal} />
				{:else if row.id === 'gender'}
					<GenderForm locale={props.locale} {personal} />
				{:else if row.id === 'email'}
					<EmailForm
						locale={props.locale}
						port={props.ports.email}
						{personal}
						onStep={(step) => (codeStep = step === 'code')}
					/>
				{:else if row.id === 'phone'}
					<PhoneForm
						locale={props.locale}
						port={props.ports.phone}
						toMobilePhone={props.ports.toMobilePhone}
						{personal}
						onStep={(step) => (codeStep = step === 'code')}
					/>
				{:else}
					<IdentifierForm locale={props.locale} kind={row.id} filled={row.filled} {personal} />
				{/if}
			</EditableRow>
		{/each}
		<div class="mt-6 grid gap-3">
			<Note
				title={m.profile_personal_notes_masked_title({}, options)}
				text={m.profile_personal_notes_masked_body({}, options)}
				testId="personal-note-masked"
			/>
			<Note
				title={m.profile_personal_notes_visibility_title({}, options)}
				text={m.profile_personal_notes_visibility_body({}, options)}
				testId="personal-note-visibility"
			/>
		</div>
	{/if}
</div>
