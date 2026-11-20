<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import { DOCTOR_LINK_FIELDS } from '$modules/doctor-dashboard/api/links';
	import { DOCTOR_LINK_MAX_LENGTH } from '$modules/doctor-dashboard/config';
	import { doctorLinkExamples, doctorLinkLabel } from '$modules/doctor-dashboard/lib/links';
	import { useDoctorNetworks } from '../hooks';
	import type { DoctorNetworksProps } from '../types';

	let { locale, languagesHref, onClose }: DoctorNetworksProps = $props();

	const options = $derived({ locale });
	const networks = useDoctorNetworks({ locale: () => locale, onDone: () => onClose() });
	const form = $derived(networks.form);

	const frame = $derived({
		title: m.doctor_links_title({}, options),
		backHref: languagesHref,
		// «‹» is a link to screen 82: a plain press follows it.
		onBack: () => {},
		backLabel: m.doctor_my_profile_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'menu' as const,
		// 🔴 U-217: from 950 the menu stands beside the page — no «‹» there.
		besideList: true,
		onCancel: onClose,
		backTestId: 'doctor-networks-back'
	});
</script>

<!-- 🔴 Wave 5.2 · screen 82, the four links (U-211, D-W52-67 / 70; `64-switch/sw.js` `soPage`): a PAGE, never a window
     (U-102) — below 950 alone with «‹» to screen 82, from 950 in the middle of the right column of 77, no «‹» (U-217).
     «Κοινωνικά δίκτυα», «Φαίνονται ως σύνδεσμοι στη σελίδα σας. Όλα είναι προαιρετικά.», the four fields one under the
     other (website, Facebook, Instagram, LinkedIn — U-211.2: no other), and under them how to fill them in. A refused
     link is said under ITS field, once «Αποθήκευση» was pressed: by the page's own rule before anything is sent, and by
     the server's answer after. «Άκυρο · Αποθήκευση»: nothing is saved before the server says so. 🔴 U-65.6: the
     server's bound on every field; what is typed is a field's value, never HTML and never an address the page opens. -->
{#if networks.state === 'ready'}
	<StepScreen
		{...frame}
		subtitle={m.doctor_links_lead({}, options)}
		cancelLabel={m.doctor_photos_cancel({}, options)}
		saveLabel={m.doctor_photos_save({}, options)}
		saveLoading={networks.saving}
		onSave={() => networks.submit()}
		testId="doctor-networks"
		cancelTestId="doctor-networks-cancel"
		saveTestId="doctor-networks-save"
	>
		<form
			data-testid="doctor-networks-form"
			class="flex flex-col gap-3.5"
			novalidate
			onsubmit={(event) => {
				event.preventDefault();
				networks.submit();
			}}
		>
			{#each DOCTOR_LINK_FIELDS as field (field)}
				<TextField
					field={form.field(field)}
					label={doctorLinkLabel(field, locale)}
					placeholder={doctorLinkExamples[field]}
					size="lg"
					inputmode="url"
					autocomplete="off"
					autocapitalize="off"
					spellcheck={false}
					maxlength={DOCTOR_LINK_MAX_LENGTH}
					onChangeText={() => networks.changed()}
					data-testid={`doctor-networks-${field}`}
				/>
			{/each}
		</form>
		<p data-testid="doctor-networks-hint" class="mt-2 text-body-sm text-muted-foreground">
			{m.doctor_links_hint({}, options)}
		</p>
		{#if networks.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-networks-failure"
			>
				{networks.failure}
			</p>
		{/if}
	</StepScreen>
{:else if networks.state === 'failed'}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={onClose}
		testId="doctor-networks-closed"
		saveTestId="doctor-networks-leave"
	>
		<InlineNotice
			variant="danger"
			message={m.doctor_dashboard_load_error({}, options)}
			actionLabel={m.doctor_dashboard_retry({}, options)}
			onAction={() => networks.retry()}
			testId="doctor-networks-error"
			actionTestId="doctor-networks-retry"
		/>
	</StepScreen>
{:else}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={onClose}
		bar={false}
		testId="doctor-networks-wait"
	>
		<div aria-busy="true" aria-label={frame.title} class="grid gap-3">
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
		</div>
	</StepScreen>
{/if}
