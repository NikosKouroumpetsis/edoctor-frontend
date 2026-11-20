<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { CheckRows } from '$shared/ui/molecules/check-rows';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import { DOCTOR_SPECIALIZATION_LIMIT } from '$modules/doctor-dashboard/config';
	import { useDoctorSpecializations } from '../hooks';
	import type { DoctorSpecializationsProps } from '../types';

	let { locale, specialtyHref, onClose }: DoctorSpecializationsProps = $props();

	const options = $derived({ locale });
	const leadId = useId(undefined, 'doctor-specializations-lead');
	const choice = useDoctorSpecializations({ locale: () => locale, onDone: () => onClose() });

	// 🔴 D-W52-59: a specialty without a list has nothing to choose — the page gives its place back to screen 80, once.
	let left = false;
	$effect(() => {
		if (choice.state !== 'none' || left) return;
		left = true;
		untrack(() => onClose());
	});

	const frame = $derived({
		title: m.doctor_my_specializations_title({}, options),
		backHref: specialtyHref,
		// «‹» is a link to screen 80: a plain press follows it.
		onBack: () => {},
		backLabel: m.doctor_my_profile_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'menu' as const,
		// 🔴 U-217: from 950 the menu stands beside the page — no «‹» there.
		besideList: true,
		onCancel: onClose,
		backTestId: 'doctor-specializations-back'
	});
</script>

<!-- 🔴 Wave 5.2 · screen 80, the choice (U-209.3, U-225, D-W52-59; `64-switch/sw.js` `spPickPage`): a PAGE, never a window
     (U-102) — below 950 alone with «‹» to screen 80, from 950 in the middle of the right column of 77, no «‹» (U-217).
     The list of the specialty as rows with ticks, one under the other (U-112: never tiles); a title of the Government
     Gazette says under its name that the team checks it. Under the list «N από 3». At three the rows that are not
     chosen go out and — 🔴 D-W52-59α: the real list holds up to seventeen rows, so a line under it is out of sight —
     «Διαλέξατε 3. Για να διαλέξετε άλλη, βγάλτε μία.» stands in the bar, over «Άκυρο · Αποθήκευση», always in sight
     and announced (`aria-live`). «Άκυρο · Αποθήκευση»: nothing is saved before the server says so. 🔴 U-65.6: every
     name is the server's, a text node. -->
{#if choice.state === 'ready'}
	<StepScreen
		{...frame}
		subtitle={m.doctor_my_specializations_lead({ limit: DOCTOR_SPECIALIZATION_LIMIT }, options)}
		subtitleId={leadId}
		cancelLabel={m.doctor_photos_cancel({}, options)}
		saveLabel={m.doctor_photos_save({}, options)}
		saveDisabled={!choice.changed}
		saveLoading={choice.saving}
		onSave={() => choice.save()}
		barNote={choice.limitNote}
		barNoteTestId="doctor-specializations-limit"
		testId="doctor-specializations"
		cancelTestId="doctor-specializations-cancel"
		saveTestId="doctor-specializations-save"
	>
		<CheckRows
			label={frame.title}
			options={choice.rows}
			values={choice.chosen}
			onToggle={(code) => choice.toggle(code)}
			testId="doctor-specializations-rows"
		/>
		<p
			aria-live="polite"
			data-testid="doctor-specializations-hint"
			class="mt-1 text-body-sm text-muted-foreground"
		>
			{choice.hint}
		</p>
		{#if choice.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-specializations-failure"
			>
				{choice.failure}
			</p>
		{/if}
	</StepScreen>
{:else if choice.state === 'failed'}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={onClose}
		testId="doctor-specializations-closed"
		saveTestId="doctor-specializations-leave"
	>
		<InlineNotice
			variant="danger"
			message={m.doctor_dashboard_load_error({}, options)}
			actionLabel={m.doctor_dashboard_retry({}, options)}
			onAction={() => choice.retry()}
			testId="doctor-specializations-error"
			actionTestId="doctor-specializations-retry"
		/>
	</StepScreen>
{:else}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={onClose}
		bar={false}
		testId="doctor-specializations-wait"
	>
		<div aria-busy="true" aria-label={frame.title} class="grid gap-3">
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
		</div>
	</StepScreen>
{/if}
