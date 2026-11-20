<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { CheckRows } from '$shared/ui/molecules/check-rows';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { SearchField } from '$shared/ui/molecules/search-field';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import {
		DOCTOR_LANGUAGE_SEARCH_MAX_LENGTH,
		DOCTOR_SPEAK_LANGUAGE_LIMIT
	} from '$modules/doctor-dashboard/config';
	import { useDoctorSpokenLanguages } from '../hooks';
	import type { DoctorSpokenLanguagesProps } from '../types';

	let { locale, languagesHref, onClose }: DoctorSpokenLanguagesProps = $props();

	const options = $derived({ locale });
	const leadId = useId(undefined, 'doctor-spoken-languages-lead');
	const yoursId = useId(undefined, 'doctor-spoken-languages-yours');
	const allId = useId(undefined, 'doctor-spoken-languages-all');
	const choice = useDoctorSpokenLanguages({ locale: () => locale, onDone: () => onClose() });
	const groupClass = 'mt-4 mb-2 text-body-md font-semibold text-muted-foreground';

	const frame = $derived({
		title: m.doctor_languages_spoken_title({}, options),
		backHref: languagesHref,
		// «‹» is a link to screen 82: a plain press follows it.
		onBack: () => {},
		backLabel: m.doctor_my_profile_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'menu' as const,
		// 🔴 U-217: from 950 the menu stands beside the page — no «‹» there.
		besideList: true,
		onCancel: onClose,
		backTestId: 'doctor-spoken-languages-back'
	});
</script>

<!-- 🔴 Wave 5.2 · screen 82, the choice of the languages (U-211, U-112, D-W52-69; `64-switch/sw.js` `slPickPage`): a PAGE,
     never a window (U-102) — below 950 alone with «‹» to screen 82, from 950 in the middle of the right column of 77,
     no «‹» (U-217); the same lists at every width. The search (inside a word, whatever the accents), then — no words —
     «Οι γλώσσες σας» (as the page opened; they keep their place while they are pressed) and «Όλες οι γλώσσες»; with
     words, 🔴 D-W52-69α (`82-langs/shots/m-find.png`), ONE list without a heading of every language they find, the chosen
     ones ticked among them, or «Καμία γλώσσα με «…».». Rows with ticks, one under the other (U-112: never tiles), Greek
     first and then by name. Under them «N από 10». At ten the rows that are not chosen go out and — 🔴 D-W52-59α: the
     catalogue holds 171 rows — «Διαλέξατε 10. Για να διαλέξετε άλλη, βγάλτε μία.» stands in the bar, over «Άκυρο ·
     Αποθήκευση», always in sight and announced (`aria-live`). Nothing is saved before the server says so. 🔴 U-65.6:
     every name is the server's and what is typed in the search is text, never HTML. -->
{#if choice.state === 'ready'}
	<StepScreen
		{...frame}
		subtitle={m.doctor_languages_pick_lead({ limit: DOCTOR_SPEAK_LANGUAGE_LIMIT }, options)}
		subtitleId={leadId}
		cancelLabel={m.doctor_photos_cancel({}, options)}
		saveLabel={m.doctor_photos_save({}, options)}
		saveDisabled={!choice.changed}
		saveLoading={choice.saving}
		onSave={() => choice.save()}
		barNote={choice.limitNote}
		barNoteTestId="doctor-spoken-languages-limit"
		testId="doctor-spoken-languages"
		cancelTestId="doctor-spoken-languages-cancel"
		saveTestId="doctor-spoken-languages-save"
	>
		<SearchField
			shape="pill"
			value={choice.query}
			onChangeText={(typed) => choice.search(typed)}
			onClear={() => choice.search('')}
			placeholder={m.doctor_languages_search({}, options)}
			aria-label={m.doctor_languages_search({}, options)}
			aria-describedby={leadId}
			maxlength={DOCTOR_LANGUAGE_SEARCH_MAX_LENGTH}
			autocomplete="off"
			autocapitalize="none"
			spellcheck={false}
			testId="doctor-spoken-languages-search"
			clearTestId="doctor-spoken-languages-search-clear"
		/>
		{#if choice.pick.kind === 'search'}
			{#if choice.pick.found.length > 0}
				<div class="mt-4">
					<CheckRows
						label={frame.title}
						options={choice.pick.found}
						values={choice.chosen}
						onToggle={(code) => choice.toggle(code)}
						testId="doctor-spoken-languages-found"
					/>
				</div>
			{/if}
		{:else}
			{#if choice.pick.yours.length > 0}
				<h3 id={yoursId} class={groupClass}>{m.doctor_languages_yours({}, options)}</h3>
				<CheckRows
					labelledby={yoursId}
					options={choice.pick.yours}
					values={choice.chosen}
					onToggle={(code) => choice.toggle(code)}
					testId="doctor-spoken-languages-yours"
				/>
			{/if}
			{#if choice.pick.all.length > 0}
				<h3 id={allId} class={groupClass}>{m.doctor_languages_all({}, options)}</h3>
				<CheckRows
					labelledby={allId}
					options={choice.pick.all}
					values={choice.chosen}
					onToggle={(code) => choice.toggle(code)}
					testId="doctor-spoken-languages-all"
				/>
			{/if}
		{/if}
		<div aria-live="polite" data-testid="doctor-spoken-languages-none">
			{#if choice.pick.kind === 'search' && choice.pick.none}
				<p class="mt-4 text-body-md text-muted-foreground">{choice.pick.none}</p>
			{/if}
		</div>
		<p
			aria-live="polite"
			data-testid="doctor-spoken-languages-hint"
			class="mt-2 text-body-sm text-muted-foreground"
		>
			{choice.hint}
		</p>
		{#if choice.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-spoken-languages-failure"
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
		testId="doctor-spoken-languages-closed"
		saveTestId="doctor-spoken-languages-leave"
	>
		<InlineNotice
			variant="danger"
			message={m.doctor_dashboard_load_error({}, options)}
			actionLabel={m.doctor_dashboard_retry({}, options)}
			onAction={() => choice.retry()}
			testId="doctor-spoken-languages-error"
			actionTestId="doctor-spoken-languages-retry"
		/>
	</StepScreen>
{:else}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={onClose}
		bar={false}
		testId="doctor-spoken-languages-wait"
	>
		<div aria-busy="true" aria-label={frame.title} class="grid gap-3">
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
		</div>
	</StepScreen>
{/if}
