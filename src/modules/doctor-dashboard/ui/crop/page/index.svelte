<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { ImageCropper } from '$shared/ui/molecules/image-cropper';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import {
		DOCTOR_PHOTO_CROP_RULES,
		doctorPhotoIssueText
	} from '$modules/doctor-dashboard/lib/photos';
	import { useDoctorPhotoCrop } from '../hooks';
	import type { DoctorPhotoCropProps } from '../types';

	let { locale, imageId, photosHref, onClose }: DoctorPhotoCropProps = $props();

	const options = $derived({ locale });
	const leadId = useId(undefined, 'doctor-photo-crop-lead');
	const cropper = useDoctorPhotoCrop({
		imageId: () => imageId,
		locale: () => locale,
		onDone: () => onClose()
	});

	const frame = $derived({
		title: m.doctor_photos_crop({}, options),
		backHref: photosHref,
		// «‹» is a link to the photos: a plain press follows it.
		onBack: () => {},
		backLabel: m.doctor_my_profile_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'menu' as const,
		// 🔴 U-217: from 950 the menu stands beside the page — no «‹» there.
		besideList: true,
		onCancel: onClose,
		backTestId: 'doctor-photo-crop-back'
	});
</script>

<!-- 🔴 Wave 5.2 · screen 78 «Προσαρμογή» (U-206.2, D-W52-40; `64-switch/sw.js` `phCrop`): a PAGE, never a window (U-102) —
     below 950 alone with «‹» to the photos, from 950 in the middle of the right column of 77, no «‹» (U-217). The 4:3
     frame shows exactly what the patients will see; it is dragged (the arrows too) and «Μεγέθυνση» goes in (`+` / `−`
     too). «Άκυρο · Αποθήκευση»: the cut is made on this device and takes the photo's place. A photo that cannot be cut
     says why and leaves one way back. -->
{#if cropper.state === 'ready' && cropper.src && cropper.source}
	<StepScreen
		{...frame}
		subtitle={m.doctor_photos_crop_lead({}, options)}
		subtitleId={leadId}
		cancelLabel={m.doctor_photos_cancel({}, options)}
		saveLabel={m.doctor_photos_save({}, options)}
		saveLoading={cropper.saving}
		onSave={() => cropper.save()}
		testId="doctor-photo-crop"
		cancelTestId="doctor-photo-crop-cancel"
		saveTestId="doctor-photo-crop-save"
	>
		<ImageCropper
			src={cropper.src}
			source={cropper.source}
			rules={DOCTOR_PHOTO_CROP_RULES}
			bind:crop={() => cropper.crop, (next) => (cropper.crop = next)}
			label={m.doctor_photos_crop({}, options)}
			describedBy={leadId}
			zoomLabel={m.doctor_photos_zoom({}, options)}
			disabled={cropper.saving}
			testId="doctor-photo-cropper"
		/>
		{#if cropper.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-photo-crop-failure"
			>
				{cropper.failure}
			</p>
		{/if}
	</StepScreen>
{:else if cropper.state === 'loading'}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={onClose}
		bar={false}
		testId="doctor-photo-crop-wait"
	>
		<div aria-busy="true" aria-label={frame.title}>
			<Skeleton class="aspect-4/3 w-full rounded-md" />
		</div>
	</StepScreen>
{:else}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={onClose}
		testId="doctor-photo-crop-closed"
		saveTestId="doctor-photo-crop-leave"
	>
		{#if cropper.state === 'failed' || cropper.state === 'unreadable'}
			<InlineNotice
				variant="danger"
				message={cropper.state === 'failed'
					? m.doctor_dashboard_load_error({}, options)
					: m.doctor_photos_crop_unreadable({}, options)}
				actionLabel={m.doctor_dashboard_retry({}, options)}
				onAction={() => cropper.retry()}
				testId="doctor-photo-crop-error"
				actionTestId="doctor-photo-crop-retry"
			/>
		{:else}
			<NoticeCard
				tone="warm"
				role="alert"
				title={cropper.state === 'small'
					? (doctorPhotoIssueText('small', locale) ?? '')
					: m.doctor_photos_crop_missing({}, options)}
				testId="doctor-photo-crop-notice"
			/>
		{/if}
	</StepScreen>
{/if}
