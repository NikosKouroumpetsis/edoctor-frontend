<script lang="ts">
	import CheckIcon from '~icons/lucide/check';
	import { m } from '$paraglide/messages.js';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { SearchField } from '$shared/ui/molecules/search-field';
	import { Spinner } from '$shared/ui/primitives/spinner';
	import { DOCTOR_ONBOARDING_SPECIALTY_SEARCH_MAX_LENGTH } from '$modules/doctor-onboarding/config';
	import { filterDoctorProfessionOptions } from '$modules/doctor-onboarding/lib/professions';
	import { readSpecialtyQuery } from '$modules/doctor-onboarding/lib/validation';
	import { readDoctorProfessionalValues } from '$modules/doctor-onboarding/lib/values';
	import SubFrame from '../components/sub-frame.svelte';
	import { useDoctorProfessions } from '../hooks/use-professions.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'specialty-list');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const professions = useDoctorProfessions(
		() => props.locale,
		() => controller.signedIn
	);
	let query = $state('');
	const chosen = $derived(
		readDoctorProfessionalValues(draft.edits, controller.progress).professionalId
	);
	const shown = $derived(filterDoctorProfessionOptions(professions.options, query));

	/** A row chosen: the specialty is the draft's, and the screen gives the step back (U-102: «πατάς ⇒ γυρίζει πίσω»). */
	function choose(professionalId: string) {
		draft.update('professional', { professionalId });
		controller.goBack();
	}
</script>

<!-- 35 · «Επιλέξτε ειδικότητα» (record §6.2.4): the search (accents and case aside: «καρδ» ⇒ the three cardiologies), then
     every specialty one under the other, the chosen one with its ✓. A choice goes back to the step, filled. Every name
     is the server's data, shown as text (U-65.6); no colour under the pointer (U-100). -->
<SubFrame
	context={props}
	title={m.doctor_onboarding_specialty_pick_title({}, options)}
	backHref={controller.hrefOf('specialty')}
	onBack={controller.goBack}
	testId="doctor-onboarding-specialty-list"
>
	<div role="search" class="mb-2">
		<SearchField
			value={query}
			shape="pill"
			placeholder={m.doctor_onboarding_specialty_search_placeholder({}, options)}
			aria-label={m.doctor_onboarding_specialty_search_label({}, options)}
			maxlength={DOCTOR_ONBOARDING_SPECIALTY_SEARCH_MAX_LENGTH}
			autocomplete="off"
			spellcheck={false}
			inputClass="min-h-control-lg"
			onChangeText={(next) => (query = readSpecialtyQuery(next))}
			onClear={() => (query = '')}
			testId="doctor-onboarding-specialty-search"
		/>
	</div>
	{#if professions.failed}
		<InlineNotice
			variant="danger"
			message={m.doctor_onboarding_frame_load_error({}, options)}
			actionLabel={m.doctor_onboarding_frame_retry({}, options)}
			onAction={professions.retry}
			testId="doctor-onboarding-specialty-error"
		/>
	{:else if professions.loading}
		<div class="flex justify-center py-section"><Spinner tone="muted" /></div>
	{:else if shown.length === 0}
		<p
			class="py-4 text-body-sm text-muted-foreground"
			role="status"
			data-testid="doctor-onboarding-specialty-none"
		>
			{m.doctor_onboarding_specialty_no_results({}, options)}
		</p>
	{:else}
		<ul
			aria-label={m.doctor_onboarding_specialty_list_label({}, options)}
			class="flex flex-col"
			data-testid="doctor-onboarding-specialty-rows"
		>
			{#each shown as option (option.professionalId)}
				<li class="border-b border-border">
					<button
						type="button"
						aria-pressed={option.professionalId === chosen}
						data-testid={`doctor-onboarding-specialty-${option.professionalId}`}
						class="flex min-h-touch w-full flex-row items-center justify-between gap-3 py-2 text-left text-body-md text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:font-semibold"
						onclick={() => choose(option.professionalId)}
					>
						<span class="min-w-0">{option.label}</span>
						{#if option.professionalId === chosen}
							<CheckIcon aria-hidden="true" class="icon-md shrink-0" />
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</SubFrame>
